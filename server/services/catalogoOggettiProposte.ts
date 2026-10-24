// Proposte e legami: ogni gesto riguarda una fonte e, se ha più contenuti, soltanto il gruppo scelto.
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { casaOggetto, eCategoriaOggetto } from '../../shared/catalogo.js';
import { leggiCondizioniSalvate, descriviRequisitoSpillo } from '../../shared/condizioniSpillo.js';
import type { PropostaAbbinamentoDto, TipoPropostaOggetto, OggettiGuidaDto } from '../../shared/types.js';
import { rettificaPropostaOggetto as modificaSchema, type DatiLegameOggetto, type DatiPropostaOggetto, type RettificaPropostaOggetto as Modifica } from '../schemas/catalogoOggetti.js';
import { httpErrors } from '../utils/httpError.js';
import { costoOggetto, oggettiConChiavi, rigaOggetto } from './catalogoOggettiLetture.js';
import { fondiOggetti } from './catalogoOggettiFusione.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { datiGuida } from './datiGuida.js';
import { nomiCondizioni } from './condizioni/nomiCondizioni.js';
import { fonteRicompensaOggetto, fontiRicompenseOggetti, type FonteRicompensaOggetto } from './fontiRicompenseOggetti.js';
import { fratelliValidi, salvaSnapshotProposta, snapshotConVersioneSalvata, verificaSnapshotProposta } from './snapshotProposteOggetti.js';

type Riga = Record<string, unknown>;
interface Proposta {
  riga_tipo: TipoPropostaOggetto; riga_chiave: string; gruppo: string; catalogo_chiave: string | null;
  quantita: number | null; motivo: string; certezza: PropostaAbbinamentoDto['certezza']; stato: PropostaAbbinamentoDto['stato'];
  modifica_json: string | null; fonte_snapshot_json: string | null; nota: string | null; catalogo_nome: string | null; categoria: string | null;
}
type LegameCompleto = Omit<DatiLegameOggetto, 'quantita'> & { quantita: number | null };
const eProdottoRicetta = (r: { riga_tipo: string; riga_chiave: string }) => r.riga_tipo === 'ricompensa' && r.riga_chiave.startsWith('ricetta/');

function modificaDellaProposta(p: Proposta): Modifica | null {
  if (p.modifica_json === null) return null;
  let valore: unknown;
  try { valore = JSON.parse(p.modifica_json) as unknown; } catch { throw httpErrors.conflict('proposta-non-leggibile', 'La proposta non è leggibile: nessun dato è stato cambiato.'); }
  const esito = modificaSchema.safeParse(valore);
  if (!esito.success) throw httpErrors.conflict('proposta-non-valida', 'La proposta contiene dati non validi: nessun dato è stato cambiato.');
  return esito.data;
}
const SQL_PROPOSTE = `SELECT p.*,c.nome AS catalogo_nome,c.categoria FROM proposta_abbinamento p
  LEFT JOIN catalogo_oggetto c ON c.chiave = p.catalogo_chiave`;

function separa(chiave: string): [string, string] {
  const i = chiave.indexOf('/');
  if (i <= 0 || i === chiave.length - 1) throw httpErrors.badRequest('fonte-legame-non-valida', 'La fonte del legame non è completa.');
  return [chiave.slice(0, i), chiave.slice(i + 1)];
}
function regalo(chiave: string): [string, number] {
  const [confidente, ordine] = separa(chiave);
  if (!/^\d+$/.test(ordine) || !Number.isSafeInteger(Number(ordine))) throw httpErrors.badRequest('regalo-legame-non-valido', 'La riga del regalo non è valida.');
  return [confidente, Number(ordine)];
}
function ricettaEsistente(chiave: string): boolean {
  return datiGuida<OggettiGuidaDto>('oggetti-guida')?.fabbricazione.ricette.some((r) => r.attrezzo === chiave) ?? false;
}

function testoVoce(r: Riga): { nome: string; testo: string } {
  let dettagli: unknown; try { dettagli = JSON.parse(String(r.dettagli_json)) as unknown; } catch { dettagli = null; }
  const contenuto = dettagli && typeof dettagli === 'object' ? (dettagli as Riga).contenuto : null;
  return { nome: String(r.nome), testo: typeof contenuto === 'string' ? contenuto : String(r.descrizione ?? '') };
}

function testoFonte(tipo: TipoPropostaOggetto, chiave: string, nomi: ReturnType<typeof nomiCondizioni>, premi: ReadonlyMap<string, FonteRicompensaOggetto>): { nome: string; testo: string } {
  if (tipo === 'regalo') {
    const [confidente, ordine] = regalo(chiave);
    const r = prepared('SELECT g.nome,g.costo,g.dove,c.nome AS confidente FROM confidente_regalo g JOIN confidente c ON c.chiave = g.confidente_chiave WHERE g.confidente_chiave = ? AND g.ordine = ?').get(confidente, ordine) as { nome: string; costo: string | null; dove: string | null; confidente: string } | undefined;
    return r ? { nome: `${r.confidente} · ${r.nome}`, testo: [r.nome, r.costo, r.dove].filter(Boolean).join(' · ') } : { nome: 'Regalo eliminato', testo: 'La riga originale non è più disponibile.' };
  }
  if (tipo === 'ricetta') return { nome: chiave, testo: 'Materiale di fabbricazione' };
  if (tipo === 'ricompensa') {
    const [fonte, k] = separa(chiave);
    return premi.get(`${fonte}\0${k}`) ?? { nome: 'Fonte eliminata', testo: 'La fonte originale non è più disponibile.' };
  }
  const tabella = tipo === 'articolo' ? 'articolo' : tipo === 'voce' ? 'punto_interesse' : 'catalogo_oggetto';
  const r = prepared(tipo === 'articolo' ? 'SELECT a.*,c.nome AS catalogo_nome FROM articolo a LEFT JOIN catalogo_oggetto c ON c.chiave = a.catalogo_chiave WHERE a.chiave = ?'
    : `SELECT * FROM ${tabella} WHERE chiave = ?`).get(chiave) as Riga | undefined;
  if (!r) return { nome: tipo === 'articolo' ? 'Nuova offerta proposta' : 'Fonte eliminata', testo: tipo === 'articolo' ? 'Questa offerta non è ancora presente nel listino.' : 'La fonte originale non è più disponibile.' };
  const nome = typeof r.catalogo_nome === 'string' ? r.catalogo_nome : String(r.nome || 'Offerta senza oggetto collegato');
  if (tipo === 'articolo') {
    const costo = costoOggetto(typeof r.costo_json === 'string' ? r.costo_json : null);
    const prezzo = r.costo_json != null ? costo?.tipo === 'fiori' ? `${costo.importo.toLocaleString('it-IT')} fiori`
      : costo?.tipo === 'oggetti' ? costo.oggetti.map((o) => `${o.quantita} × ${o.nome ?? 'Oggetto non disponibile'}`).join(', ') : 'Costo di scambio non leggibile'
      : typeof r.prezzo === 'number' ? `${r.prezzo.toLocaleString('it-IT')} ¥` : 'Prezzo non indicato';
    return { nome, testo: [nome, prezzo, ...leggiCondizioniSalvate(typeof r.condizioni_json === 'string' ? r.condizioni_json : null).map((c) => descriviRequisitoSpillo(c, nomi))].join(' · ') };
  }
  if (tipo === 'voce') return testoVoce(r);
  return { nome, testo: String(r.effetto ?? '') };
}

export function elencaProposteOggetti(filtro: { riga_tipo?: TipoPropostaOggetto; riga_chiave?: string; stato?: Proposta['stato']; voci?: readonly string[] } = {}): PropostaAbbinamentoDto[] {
  const condizioni = ['p.stato = ?']; const valori: string[] = [filtro.stato ?? 'da-approvare'];
  if (filtro.riga_tipo) { condizioni.push('p.riga_tipo = ?'); valori.push(filtro.riga_tipo); }
  if (filtro.riga_chiave) { condizioni.push('p.riga_chiave = ?'); valori.push(filtro.riga_chiave); }
  if (filtro.voci) { condizioni.push("p.riga_tipo = 'voce' AND p.riga_chiave IN (SELECT value FROM json_each(?))"); valori.push(JSON.stringify(filtro.voci)); }
  const righe = prepared(`${SQL_PROPOSTE} WHERE ${condizioni.join(' AND ')} ORDER BY p.riga_tipo,p.riga_chiave,p.gruppo,c.nome`).all(...valori) as Proposta[];
  const modifiche = new Map(righe.map((p) => [p, modificaDellaProposta(p)]));
  const riferimenti = oggettiConChiavi([...modifiche.values()].flatMap((m) => [
    ...(m?.costo?.tipo === 'oggetti' ? m.costo.oggetti.map((o) => o.chiave) : []), ...(m?.ricevuti?.map((o) => o.chiave) ?? []),
  ]));
  const nomi = nomiCondizioni();
  const premi = fontiRicompenseOggetti(righe.filter((p) => p.riga_tipo === 'ricompensa').map((p) => separa(p.riga_chiave)[0]));
  const fonti = new Map<string, ReturnType<typeof testoFonte>>();
  const voci = [...new Set(righe.filter((p) => p.riga_tipo === 'voce').map((p) => p.riga_chiave))];
  if (voci.length) {
    for (const r of prepared('SELECT * FROM punto_interesse WHERE chiave IN (SELECT value FROM json_each(?))').all(JSON.stringify(voci)) as Array<Riga & { chiave: string }>) {
      fonti.set(`voce\0${r.chiave}`, testoVoce(r));
    }
  }
  return righe.map((p) => {
    if (p.catalogo_chiave !== null && (!eCategoriaOggetto(p.categoria) || p.catalogo_nome === null)) throw httpErrors.conflict('categoria-proposta-non-valida', 'La proposta cita un’identità non disponibile o una categoria non riconosciuta.');
    const k = `${p.riga_tipo}\0${p.riga_chiave}`;
    if (!fonti.has(k)) fonti.set(k, testoFonte(p.riga_tipo, p.riga_chiave, nomi, premi));
    const fonte = fonti.get(k)!; const m = modifiche.get(p);
    return { rigaTipo: p.riga_tipo, rigaChiave: p.riga_chiave, gruppo: p.gruppo, rigaNome: fonte.nome, testoAttuale: fonte.testo,
      catalogo: p.catalogo_chiave === null ? null : { chiave: p.catalogo_chiave, nome: p.catalogo_nome!, casa: casaOggetto(p.catalogo_chiave) }, categoria: eCategoriaOggetto(p.categoria) ? p.categoria : null,
      quantita: p.quantita, motivo: p.motivo, certezza: p.certezza, stato: p.stato, nota: p.nota,
      modifica: m ? { azione: m.azione, ...(m.prezzo !== undefined ? { prezzo: m.prezzo } : {}), ...(m.condizioni ? { condizioni: m.condizioni, condizioniTesto: m.condizioni.map((c) => descriviRequisitoSpillo(c, nomi)) } : {}), ...(m.ruolo ? { ruolo: m.ruolo } : {}),
        ...(m.nome_offerta ? { nomeOfferta: m.nome_offerta } : {}), ...(m.nota_offerta ? { notaOfferta: m.nota_offerta } : {}),
        ...(m.costo ? { costo: costoOggetto(JSON.stringify(m.costo), riferimenti)! } : {}),
        ...(m.ricevuti ? { ricevuti: m.ricevuti.map((o) => ({ ...o, nome: riferimenti.get(o.chiave)?.nome ?? 'Oggetto non più disponibile', casa: casaOggetto(o.chiave) })) } : {}) } : null };
  });
}

function leggiProposta(d: DatiPropostaOggetto): Proposta {
  const base = `${SQL_PROPOSTE} WHERE p.riga_tipo = ? AND p.riga_chiave = ? AND p.catalogo_chiave IS ?`;
  let righe = prepared(`${base} AND p.gruppo = ?`).all(d.riga_tipo, d.riga_chiave, d.catalogo_chiave, d.gruppo) as Proposta[];
  // Compatibilità con il corpo a tre chiavi del piano: solo se individua una proposta senza ambiguità.
  if (!righe.length && !d.gruppo) righe = prepared(base).all(d.riga_tipo, d.riga_chiave, d.catalogo_chiave) as Proposta[];
  if (!righe.length) throw httpErrors.notFound('proposta-non-trovata', 'La proposta non esiste più.');
  if (righe.length > 1) throw httpErrors.conflict('gruppo-proposta-richiesto', 'La voce ha più contenuti: scegli il gruppo della proposta.');
  if (righe[0].quantita === null ? !(eProdottoRicetta(righe[0]) || ['ricetta', 'voce'].includes(righe[0].riga_tipo)) : !Number.isSafeInteger(righe[0].quantita) || righe[0].quantita < 1) throw httpErrors.conflict('quantita-proposta-non-valida', 'La quantità della proposta non è valida.');
  return righe[0];
}
function marca(p: Pick<Proposta, 'riga_tipo' | 'riga_chiave' | 'gruppo' | 'catalogo_chiave'>, stato: Proposta['stato']): void {
  prepared('UPDATE proposta_abbinamento SET stato = ?,updated_at = ? WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave IS ?')
    .run(stato, nowIso(), p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave);
  if (stato === 'confermata') prepared(`UPDATE proposta_abbinamento SET stato = 'scartata',updated_at = ?
    WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave IS NOT ? AND stato = 'da-approvare'`)
    .run(nowIso(), p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave);
}

function applicaArticolo(d: LegameCompleto, m: Modifica | null): void {
  const attuale = prepared('SELECT * FROM articolo WHERE chiave = ?').get(d.riga_chiave) as Riga | undefined;
  if (m?.azione === 'crea') {
    if (attuale) throw httpErrors.conflict('articolo-proposta-occupato', 'La chiave è stata usata dopo la proposta: non sovrascrivo la riga.');
    if (!m.negozio || !prepared('SELECT 1 FROM negozio WHERE chiave = ? AND nascosto = 0').get(m.negozio)) throw httpErrors.notFound('negozio-proposta-non-trovato', 'Il negozio della proposta non è più disponibile.');
    const o = rigaOggetto(d.catalogo_chiave);
    const composto = m.ricevuti !== undefined;
    if (composto && (m.costo?.tipo !== 'oggetti' || !m.costo.oggetti.some((c) => c.chiave === o.chiave))) {
      throw httpErrors.conflict('baratto-proposta-incompatibile', 'La proposta composta cita una capsula diversa: rileggi le alternative.');
    }
    for (const chiave of new Set([...(m.ricevuti?.map((r) => r.chiave) ?? []), ...(m.costo?.tipo === 'oggetti' ? m.costo.oggetti.map((c) => c.chiave) : [])])) rigaOggetto(chiave);
    if (composto && prepared("SELECT 1 FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(d.riga_chiave)) {
      throw httpErrors.conflict('risultati-proposta-occupati', 'Esistono già collegamenti a questa offerta: nessun risultato viene sovrascritto.');
    }
    const ordine = (prepared('SELECT COALESCE(MAX(ordine),-1)+1 AS n FROM articolo WHERE negozio_chiave = ?').get(m.negozio) as { n: number }).n;
    prepared(`INSERT INTO articolo(chiave,negozio_chiave,ordine,nome,categoria,prezzo,condizioni_json,catalogo_chiave,costo_json,nota,fonte,origine,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'utente',?)`).run(d.riga_chiave, m.negozio, ordine, composto ? m.nome_offerta : '', 'altro',
        m.prezzo ?? null, JSON.stringify(m.condizioni ?? []), composto ? null : o.chiave,
        m.costo ? JSON.stringify(m.costo) : null, m.nota_offerta ?? null, m.fonte ?? 'Proposta della guida confermata', nowIso());
    for (const [i, r] of (m.ricevuti ?? []).entries()) prepared(`INSERT INTO ricompensa_oggetto
      (fonte_tipo,fonte_chiave,catalogo_chiave,quantita,ordine,nota) VALUES ('articolo',?,?,?,?,?)`).run(d.riga_chiave, r.chiave, r.quantita, i, r.nota);
    return;
  }
  if (!attuale) throw httpErrors.notFound('articolo-non-trovato', 'La riga del listino non esiste.');
  if (!d.togli && m?.ruolo !== 'costo' && m?.azione !== 'nascondi'
    && prepared("SELECT 1 FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(d.riga_chiave)) {
    throw httpErrors.conflict('offerta-con-risultati', 'Questa offerta ha risultati separati: correggili dal listino prima di collegare un oggetto singolo.');
  }
  if (d.togli && attuale.catalogo_chiave !== d.catalogo_chiave) throw httpErrors.conflict('legame-cambiato', 'Il legame è cambiato: non scollego un altro oggetto.');
  const campi: Record<string, unknown> = {};
  if (m?.ruolo === 'costo') {
    if (attuale.costo_json != null) throw httpErrors.conflict('costo-cambiato-dopo-proposta', 'Il costo è stato impostato dopo la proposta: verifica il valore attuale.');
    campi.costo_json = JSON.stringify({ tipo: 'oggetti', oggetti: [{ chiave: d.catalogo_chiave, quantita: d.quantita }] });
  } else if (m?.azione === 'nascondi') campi.nascosto = 1;
  else campi.catalogo_chiave = d.togli ? null : d.catalogo_chiave;
  if (m?.prezzo !== undefined) campi.prezzo = m.prezzo;
  if (m?.condizioni !== undefined) campi.condizioni_json = JSON.stringify(m.condizioni);
  if (m?.prima) {
    const verificati = [...new Set([...Object.keys(campi), 'nome'])];
    if (verificati.some((c) => c in m.prima! && attuale[c] !== m.prima![c])) throw httpErrors.conflict('riga-cambiata-dopo-proposta',
      'La riga è stata corretta dopo la proposta. Nessun valore è stato sovrascritto: rileggi i dati attuali.');
  }
  const colonne = Object.keys(campi);
  prepared(`UPDATE articolo SET ${colonne.map((c) => `${c} = ?`).join(',')},seed_json = COALESCE(seed_json,?),origine = 'utente',updated_at = ? WHERE chiave = ?`)
    .run(...Object.values(campi), JSON.stringify(attuale), nowIso(), d.riga_chiave);
}

function applicaLegame(d: LegameCompleto, m: Modifica | null, additivo = false): void {
  if (d.quantita === null ? !eProdottoRicetta(d) : !Number.isSafeInteger(d.quantita) || d.quantita < 1) throw httpErrors.conflict('quantita-proposta-non-valida', 'Indica una quantità positiva; solo la resa di una ricetta può restare non indicata.');
  if (d.riga_tipo === 'articolo') { applicaArticolo(d, m); return; }
  if (d.riga_tipo === 'regalo') {
    const [confidente, ordine] = regalo(d.riga_chiave);
    const attuale = prepared('SELECT catalogo_chiave FROM confidente_regalo WHERE confidente_chiave = ? AND ordine = ?').get(confidente, ordine) as { catalogo_chiave: string | null } | undefined;
    if (!attuale) throw httpErrors.notFound('regalo-non-trovato', 'La riga del regalo non esiste.');
    if (d.togli && attuale.catalogo_chiave !== d.catalogo_chiave) throw httpErrors.conflict('legame-cambiato', 'Il legame è cambiato: non scollego un altro oggetto.');
    prepared('UPDATE confidente_regalo SET catalogo_chiave = ? WHERE confidente_chiave = ? AND ordine = ?').run(d.togli ? null : d.catalogo_chiave, confidente, ordine);
    return;
  }
  if (d.riga_tipo === 'catalogo') throw httpErrors.badRequest('fusione-gesto-separato', 'La fusione si esegue come gesto esplicito, non come rimozione di un legame.');
  let tabella: string; let chiavi: string[]; let valori: string[]; let ordine: boolean;
  if (d.riga_tipo === 'voce') {
    if (!prepared('SELECT 1 FROM punto_interesse WHERE chiave = ?').get(d.riga_chiave)) throw httpErrors.notFound('voce-non-trovata', 'La voce non esiste.');
    tabella = 'voce_oggetto'; chiavi = ['voce_chiave']; valori = [d.riga_chiave]; ordine = true;
  } else if (d.riga_tipo === 'ricetta') {
    if (!ricettaEsistente(d.riga_chiave)) throw httpErrors.notFound('ricetta-non-trovata', 'La ricetta non esiste.');
    tabella = 'ricetta_materiale'; chiavi = ['ricetta']; valori = [d.riga_chiave]; ordine = false;
  } else {
    const [tipo, chiave] = separa(d.riga_chiave);
    if (!fonteRicompensaOggetto(tipo, chiave)) throw httpErrors.notFound('fonte-ricompensa-non-trovata', 'La fonte della ricompensa non esiste.');
    if (tipo === 'articolo' && !d.togli && (prepared('SELECT catalogo_chiave FROM articolo WHERE chiave = ?').get(chiave) as Riga)?.catalogo_chiave != null) {
      throw httpErrors.conflict('offerta-gia-collegata', 'Questa offerta vende già un oggetto singolo. Scollegalo prima di aggiungere risultati separati.');
    }
    tabella = 'ricompensa_oggetto'; chiavi = ['fonte_tipo', 'fonte_chiave']; valori = [tipo, chiave]; ordine = true;
  }
  const dove = chiavi.map((c) => `${c} = ?`).join(' AND ');
  if (d.togli) { prepared(`DELETE FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).run(...valori, d.catalogo_chiave); return; }
  let ordinePrecedente: number | undefined;
  if (d.precedente_catalogo_chiave) {
    const precedente = prepared(`SELECT * FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).get(...valori, d.precedente_catalogo_chiave) as { nota?: string | null; ordine?: number } | undefined;
    if (!precedente) {
      throw httpErrors.conflict('contenuto-cambiato', 'Il collegamento che stavi modificando non esiste più: ricarica la voce.');
    }
    if (ordine) {
      ordinePrecedente = precedente.ordine;
      if (d.nota === undefined) d = { ...d, nota: precedente.nota ?? null };
    }
    if (d.precedente_catalogo_chiave !== d.catalogo_chiave) {
      if (prepared(`SELECT 1 FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).get(...valori, d.catalogo_chiave)) {
        throw httpErrors.conflict('contenuto-destinazione-presente', 'L’oggetto scelto è già collegato a questa fonte. Modifica la sua riga senza sovrascriverla sostituendo un altro contenuto.');
      }
      prepared(`DELETE FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).run(...valori, d.precedente_catalogo_chiave);
    }
  }
  const colonne = [...chiavi, 'catalogo_chiave', 'quantita', ...(ordine ? ['ordine', 'nota'] : [])];
  // La resa di una ricetta è il totale dichiarato, non un altro contenuto da sommare al precedente.
  const somma = additivo && !eProdottoRicetta(d);
  if (somma && d.quantita !== null) {
    const precedente = prepared(`SELECT quantita FROM ${tabella} WHERE ${dove} AND catalogo_chiave = ?`).get(...valori, d.catalogo_chiave) as { quantita: number } | undefined;
    if (precedente && (!Number.isSafeInteger(precedente.quantita) || !Number.isSafeInteger(precedente.quantita + d.quantita))) {
      throw httpErrors.conflict('quantita-legame-fuori-intervallo', 'La quantità complessiva supera l’intervallo consentito: nessun contenuto è stato cambiato.');
    }
  }
  const n = ordinePrecedente ?? (ordine ? (prepared(`SELECT COALESCE(MAX(ordine),-1)+1 AS n FROM ${tabella} WHERE ${dove}`).get(...valori) as { n: number }).n : 0);
  const notaAggiornata = !ordine ? '' : additivo
    ? ',nota = CASE WHEN excluded.nota IS NULL THEN nota WHEN nota IS NULL OR nota = excluded.nota THEN excluded.nota ELSE nota || char(10) || excluded.nota END'
    : d.nota !== undefined ? ',nota = excluded.nota' : '';
  prepared(`INSERT INTO ${tabella}(${colonne.join(',')}) VALUES (${colonne.map(() => '?').join(',')})
    ON CONFLICT(${[...chiavi, 'catalogo_chiave'].join(',')}) DO UPDATE SET quantita = ${somma ? `${tabella}.quantita + excluded.quantita` : 'excluded.quantita'}${notaAggiornata}`)
    .run(...valori, d.catalogo_chiave, d.quantita, ...(ordine ? [n, d.nota ?? null] : []));
}

export function confermaPropostaOggetto(dati: DatiPropostaOggetto): { confermata: true } {
  getDb().transaction(() => {
    const p = leggiProposta(dati);
    if (p.stato === 'confermata') return;
    if (p.stato === 'scartata') throw httpErrors.conflict('proposta-scartata', 'Questa proposta è già stata scartata. Collega la fonte a mano se vuoi modificarla.');
    if (p.catalogo_chiave === null) throw httpErrors.conflict('proposta-senza-oggetto', 'Scegli un oggetto prima di confermare la proposta.');
    verificaSnapshotProposta(getDb(), p);
    const fratelli = fratelliValidi(getDb(), p);
    rigaOggetto(p.catalogo_chiave);
    const dopo = () => marca(p, 'confermata');
    if (p.riga_tipo === 'catalogo') fondiOggetti(p.riga_chiave, p.catalogo_chiave, dopo);
    else {
      applicaLegame({ ...dati, catalogo_chiave: p.catalogo_chiave, gruppo: p.gruppo, quantita: p.quantita, nota: p.nota, togli: false }, modificaDellaProposta(p), true);
      dopo();
      for (const f of fratelli) salvaSnapshotProposta(getDb(), f, snapshotConVersioneSalvata(getDb(), f));
    }
  })();
  invalidaCacheDiGioco();
  return { confermata: true };
}

export function impostaLegameOggetto(input: DatiLegameOggetto): { salvato: true } {
  getDb().transaction(() => {
    if (input.togli && input.proposta_catalogo_chiave !== undefined) throw httpErrors.badRequest('gesti-legame-distinti', 'Rimozione e scelta alternativa sono due gesti distinti.');
    const conservaContenuto = ['voce', 'ricompensa', 'ricetta'].includes(input.riga_tipo) && input.precedente_catalogo_chiave === input.catalogo_chiave;
    // La quantità/nota di un contenuto già collegato resta modificabile anche se l'identità è nascosta;
    // applicaLegame verificherà l'esistenza del legame precedente prima di qualsiasi scrittura.
    rigaOggetto(input.catalogo_chiave, input.togli || conservaContenuto);
    const originale = input.proposta_catalogo_chiave !== undefined ? leggiProposta({ ...input, catalogo_chiave: input.proposta_catalogo_chiave }) : null;
    const dati: LegameCompleto = { ...input, quantita: input.quantita !== undefined ? input.quantita : originale ? originale.quantita : eProdottoRicetta(input) ? null : 1,
      ...(input.nota === undefined && originale ? { nota: originale.nota } : {}) };
    if (originale && originale.stato !== 'da-approvare') throw httpErrors.conflict('proposta-gia-gestita', 'La proposta è già stata gestita: rileggi il gruppo.');
    if (originale) verificaSnapshotProposta(getDb(), originale);
    const fratelli = originale ? fratelliValidi(getDb(), originale) : [];
    const modifica = originale ? modificaDellaProposta(originale) : null;
    const p = dati.togli ? null : { riga_tipo: dati.riga_tipo, riga_chiave: dati.riga_chiave,
      gruppo: originale?.gruppo ?? dati.gruppo, catalogo_chiave: dati.catalogo_chiave, modifica_json: originale?.modifica_json ?? null };
    const dopo = () => {
      if (!p) return;
      prepared(`INSERT OR IGNORE INTO proposta_abbinamento(riga_tipo,riga_chiave,gruppo,catalogo_chiave,quantita,motivo,certezza,stato,modifica_json,nota,fonte_snapshot_json,updated_at)
        VALUES (?,?,?,?,?,?,'certa','da-approvare',?,?,?,?)`).run(p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave, dati.quantita, 'Oggetto scelto dall’utente', p.modifica_json, dati.nota ?? null,
          originale?.fonte_snapshot_json ?? null, nowIso());
      if (originale?.quantita === null && dati.quantita !== null) prepared(`UPDATE proposta_abbinamento SET quantita = ?,
        nota = COALESCE(nota || char(10),'') || 'Quantità indicata dall’utente alla conferma.'
        WHERE riga_tipo = ? AND riga_chiave = ? AND gruppo = ? AND catalogo_chiave = ?`)
        .run(dati.quantita, p.riga_tipo, p.riga_chiave, p.gruppo, p.catalogo_chiave);
      marca(p, 'confermata');
    };
    if (dati.riga_tipo === 'catalogo') {
      if (dati.togli) throw httpErrors.badRequest('fusione-non-si-scollega', 'Per annullare una fusione usa il cestino.');
      fondiOggetti(dati.riga_chiave, dati.catalogo_chiave, dopo);
    } else {
      applicaLegame(dati, modifica, !!originale); dopo();
      for (const f of fratelli) salvaSnapshotProposta(getDb(), f, snapshotConVersioneSalvata(getDb(), f));
    }
  })();
  invalidaCacheDiGioco();
  return { salvato: true };
}
