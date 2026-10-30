// ============================================================
// richiesteService — Richieste dei Mementos con stato per partita e dati di Jose (Fase 7.2)
// ============================================================
//
// Dalla voce 5 del piano (2026-09-12) le richieste sono ordinate per **dedalo** (l'area dei
// Memento in cui si svolgono, `dungeon_area`) e poi per ordine della guida, e l'elenco porta i
// dedali con i loro conteggi: è il filtro della pagina, nell'ordine di percorrenza.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { datiGuidaCorretti, type Congelato } from './datiGuida.js';
import { registraEvento } from './storicoService.js';
import { conCestino } from './cestinoService.js';
import type { CitazioniRichiestaDto, JoseDto, RicompensaOggettoDto, RichiestaDto, RichiesteDto, RiepilogoRichiesteDto, StatoCalcolatoRichiestaDto, StatoRichiesta } from '../../shared/types.js';
import { GIORNI_NEL_MESE, MESI_GIOCO, condizioneConTesto, dataLeggibile, dataValida, descriviRequisitoSpillo, leggiCondizioniSalvate, normalizzaCondizioniSpillo, ordineGioco, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { statoDisponibilitaPartita, type StatoDisponibilita } from './disponibilitaService.js';
import { esitoAperturaDelDedalo, valutaInsieme } from './condizioni/valutatore.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { slug } from '../../shared/slug.js';
import { catalogoOggettiDisponibile, ricompensePerFonte } from './catalogoOggettiLetture.js';
import { dettaglioNegozio } from './negoziService.js';
import { profiliOmbre } from './ombreService.js';
import { riconciliaBeneficiRichiesta } from './propostePartitaService.js';
import { riallineaYenRichiesta, statoYenRichiesta, yenPropostiInSospeso } from './yenAutomaticiService.js';
import { NOME_ELEMENTO, NOME_ESITO_AFFINITA, eChiaveElemento, eCodiceAffinita } from '../../shared/elementi.js';
import { GIORNI_AVVISO_SCADENZA_RICHIESTE } from '../../shared/richieste.js';

interface RigaRichiesta { chiave: string; ordine: number; nome: string; committente: string; disponibile_dal: string; scadenza: string; area: string; area_chiave: string | null; area_nome: string | null; area_ordine: number | null; piano: string; bersaglio_json: string; ricompense_json: string; confidente_chiave: string | null; confidente_rango: number | null; note: string; fonte: string; confidente_nome: string | null; area_dedalo_chiave: string | null; area_dedalo_nome: string | null;
  condizioni_json: string | null; scadenza_data: string | null; proroga_data: string | null; proroga_condizioni_json: string | null; ombra_chiave: string | null; ombra_nome: string | null; yen: number | null; esperienza: number | null;
  /** L13 (ondata 7, migrazione 310): le condizioni proprie per completarla e l'area in cui il bersaglio si sposta durante la proroga (col suo Dedalo). */
  completamento_condizioni_json: string | null; proroga_area_dedalo_chiave: string | null; proroga_area_nome: string | null; proroga_dedalo_chiave: string | null; proroga_dedalo_nome: string | null }

const SQL = `SELECT r.*, c.nome AS confidente_nome, a.nome AS area_nome, a.ordine AS area_ordine, ad.nome AS area_dedalo_nome, o.nome AS ombra_nome,
  pa.nome AS proroga_area_nome, pd.chiave AS proroga_dedalo_chiave, pd.nome AS proroga_dedalo_nome
  FROM richiesta r LEFT JOIN confidente c ON c.chiave = r.confidente_chiave LEFT JOIN dungeon_area a ON a.chiave = r.area_chiave LEFT JOIN area_dedalo ad ON ad.chiave = r.area_dedalo_chiave LEFT JOIN ombra o ON o.chiave = r.ombra_chiave
  LEFT JOIN area_dedalo pa ON pa.chiave = r.proroga_area_dedalo_chiave LEFT JOIN dungeon_area pd ON pd.chiave = pa.dedalo_chiave`;

/** Quanti giorni di gioco prima della scadenza una Richiesta è «in scadenza» (pagina, Home): una costante sola, condivisa col client. */
const GIORNI_AVVISO_SCADENZA = GIORNI_AVVISO_SCADENZA_RICHIESTE;

type ProfiloOmbra = ReturnType<typeof profiliOmbre> extends Map<string, infer V> ? V : never;

/**
 * L13 (decisione 5 della riga dell'ondata 3): il bersaglio come lo si mostra. Con un'Ombra del compendio livello e affinità vengono dalla sua
 * scheda (`profiliOmbre`, la stessa lettura del compendio delle Ombre: un dato in un solo punto), scritti col vocabolario unico degli elementi
 * («Fuoco», «Maledizione (Annulla)») come i campi propri; dove la scheda non sa (livello assente, nessuna affinità nota) valgono i campi propri,
 * che restano salvati e che il modulo modifica (`daOmbra.propri`).
 */
function bersaglioRisolto(r: RigaRichiesta, profilo: ProfiloOmbra | undefined): Pick<RichiestaDto, 'bersaglio' | 'ombra'> {
  const proprio = JSON.parse(r.bersaglio_json) as RichiestaDto['bersaglio'];
  if (!r.ombra_chiave || !r.ombra_nome) return { bersaglio: proprio, ombra: null };
  const debolezze = (profilo?.debolezze ?? []).map((k) => (eChiaveElemento(k) ? NOME_ELEMENTO[k] : k));
  const resistenze = (profilo?.resistenze ?? []).map((x) => `${eChiaveElemento(x.elemento) ? NOME_ELEMENTO[x.elemento] : x.elemento} (${eCodiceAffinita(x.codice) ? NOME_ESITO_AFFINITA[x.codice] : x.codice})`);
  const livello = profilo?.livello ?? null;
  const daOmbra = { livello: livello !== null, affinita: debolezze.length + resistenze.length > 0, propri: { livello: proprio.livello, debolezze: proprio.debolezze, resistenze: proprio.resistenze } };
  return {
    ombra: { chiave: r.ombra_chiave, nome: r.ombra_nome, livello, debolezze, resistenze },
    bersaglio: { ...proprio, livello: daOmbra.livello ? livello : proprio.livello, debolezze: daOmbra.affinita ? debolezze : proprio.debolezze, resistenze: daOmbra.affinita ? resistenze : proprio.resistenze, daOmbra },
  };
}

/**
 * Le condizioni di sblocco da valutare: quelle salvate e, se la colonna `confidente_rango` ha ancora il rango (Richiesta non convertita dalla
 * 235, come «Lo zio ingordo»), anche quel rango come condizione sul Confidente collegato: è un dato vero della Richiesta, non si ignora.
 */
function condizioniDaValutare(r: RigaRichiesta): RequisitoSpillo[] {
  const salvate = leggiCondizioniSalvate(r.condizioni_json);
  if (r.confidente_chiave && r.confidente_rango && !salvate.some((c) => c.tipo === 'confidente' && c.confidente === r.confidente_chiave)) {
    return [...salvate, { tipo: 'confidente', confidente: r.confidente_chiave, rango: r.confidente_rango }];
  }
  return salvate;
}

/** I testi della guida che la conversione non ha letto con certezza (sblocco, scadenza senza data): da verificare nel gioco. */
function testiDaVerificare(r: RigaRichiesta): string[] {
  const out: string[] = [];
  if (r.disponibile_dal.trim()) out.push(`Sblocco ancora scritto solo dalla guida, da verificare nel gioco: «${r.disponibile_dal.trim()}»`);
  if (r.scadenza.trim() && !r.scadenza_data) out.push(`Scadenza ancora scritta solo dalla guida, da verificare nel gioco: «${r.scadenza.trim()}»`);
  return out;
}

/** Il numero del giorno nel calendario di gioco (1 aprile = 0), per contare i giorni alla scadenza. */
function giornoDellAnno(d: string): number {
  const [m, g] = d.split('-').map(Number);
  let n = 0;
  for (const mese of MESI_GIOCO) { if (Number(mese.numero) === m) break; n += GIORNI_NEL_MESE[mese.numero] ?? 0; }
  return n + g - 1;
}

/** Vale la proroga della scadenza nella partita? Solo se c'è e le sue condizioni sono tutte vere. */
function prorogaValida(r: RigaRichiesta, st: StatoDisponibilita, nomi: ReturnType<typeof nomiCondizioniMemo>): boolean {
  if (!r.proroga_data) return false;
  return valutaInsieme(leggiCondizioniSalvate(r.proroga_condizioni_json).map((c) => condizioneConTesto(c, nomi)), st).stato === 'disponibile';
}

/**
 * L13 (ondata 7, O7-1): dove sta il bersaglio oggi e se la Richiesta si può COMPLETARE. Il bersaglio sta nel Dedalo della Richiesta; passata la
 * scadenza, se la proroga vale e dice un'area (`proroga_area_dedalo_chiave`), si è spostato lì (la guida: «lo ritroverete nel Dedalo di Da'at
 * durante il terzo semestre»). Si completa solo col Dedalo di oggi aperto nella partita (la sua condizione d'apertura, migrazione 305, con lo
 * stesso valutatore) e senza condizioni proprie di completamento false (`completamento_condizioni_json`). Un Dedalo senza condizione d'apertura
 * e una condizione grigia non bloccano: il dato che manca non impedisce di registrare quel che è successo nel gioco. Accettare non lo chiede.
 */
function completamento(r: RigaRichiesta, st: StatoDisponibilita, nomi: ReturnType<typeof nomiCondizioniMemo>, prorogaVale: boolean):
  { completabile: boolean; motivi: string[]; dedaloChiuso: boolean; doveOggi: StatoCalcolatoRichiestaDto['doveOggi'] } {
  const oltreLaScadenza = !!st.dataGioco && !!r.scadenza_data && ordineGioco(st.dataGioco) > ordineGioco(r.scadenza_data);
  const spostato = prorogaVale && oltreLaScadenza && !!r.proroga_area_dedalo_chiave && !!r.proroga_dedalo_chiave;
  const doveOggi = spostato
    ? { dedalo: r.proroga_dedalo_chiave, dedaloNome: r.proroga_dedalo_nome, areaDedalo: r.proroga_area_dedalo_chiave, areaDedaloNome: r.proroga_area_nome, spostato: true }
    : { dedalo: r.area_chiave, dedaloNome: r.area_nome, areaDedalo: r.area_dedalo_chiave, areaDedaloNome: r.area_dedalo_nome, spostato: false };
  const motivi: string[] = [];
  let dedaloChiuso = false;
  if (doveOggi.dedalo) {
    const a = esitoAperturaDelDedalo(doveOggi.dedalo, st, nomi);
    if (a.stato === 'rosso') {
      dedaloChiuso = true;
      const dove = `${doveOggi.dedaloNome ?? doveOggi.dedalo}${spostato && doveOggi.areaDedaloNome ? `, ${doveOggi.areaDedaloNome}` : ''}`;
      motivi.push(`Il bersaglio è nel ${dove}: si apre ${a.condizione}`);
    }
  }
  const proprie = leggiCondizioniSalvate(r.completamento_condizioni_json).map((x) => condizioneConTesto(x, nomi));
  if (proprie.length) {
    const v = valutaInsieme(proprie, st);
    for (const q of v.requisiti) if (q.stato === 'rosso' && q.bloccante !== false) motivi.push(`Per completarla: ${q.dettaglio}`);
  }
  return { completabile: motivi.length === 0, motivi, dedaloChiuso, doveOggi };
}

/**
 * L13 (ondata 3): lo stato della Richiesta nella partita, calcolato (il client lo mostra, non lo valuta). Completata e accettata vengono
 * dallo stato segnato; poi la scadenza: passata la data (e la proroga, se c'è e le sue condizioni sono vere), è scaduta, salvo che sia già
 * completata; altrimenti le condizioni di sblocco: un rosso la blocca con quel che manca. Senza rossi, una Richiesta con lo sblocco o la
 * scadenza ancora solo nel testo della guida (non convertiti dalla 235) è «da verificare» con quel testo fra i motivi: si può accettare, con
 * l'avviso, ma non si dice «disponibile» su un dato che nessuno ha valutato. Il resto è disponibile (un grigio si dice fra i motivi).
 */
function statoCalcolato(r: RigaRichiesta, segnato: StatoRichiesta | null, st: StatoDisponibilita, nomi: ReturnType<typeof nomiCondizioniMemo>): StatoCalcolatoRichiestaDto {
  const oggi = st.dataGioco;
  const proroga = r.proroga_data ? leggiCondizioniSalvate(r.proroga_condizioni_json) : [];
  const prorogaVale = prorogaValida(r, st, nomi);
  const scadenzaEffettiva = r.scadenza_data ? (prorogaVale ? r.proroga_data : r.scadenza_data) : null;
  const passata = !!oggi && !!scadenzaEffettiva && ordineGioco(oggi) > ordineGioco(scadenzaEffettiva);
  const giorni = oggi && scadenzaEffettiva && !passata ? giornoDellAnno(scadenzaEffettiva) - giornoDellAnno(oggi) : null;
  const c = completamento(r, st, nomi, prorogaVale);
  const base = { scadenzaEffettiva, giorniAllaScadenza: giorni, accettabile: false, completabile: c.completabile, motiviCompletamento: c.motivi, doveOggi: c.doveOggi };
  if (segnato === 'completata') return { ...base, completabile: true, motiviCompletamento: [], stato: 'completata', motivi: [] };
  if (passata) return { ...base, stato: 'scaduta', motivi: [`Scaduta il ${dataLeggibile(scadenzaEffettiva!)}${r.proroga_data && !prorogaVale ? ` (la proroga al ${dataLeggibile(r.proroga_data)} vale solo con: ${proroga.map((c) => descriviRequisitoSpillo(c, nomi)).join(', ')})` : ''}`] };
  const daVerificare = testiDaVerificare(r);
  if (segnato === 'accettata') return { ...base, stato: 'accettata', motivi: daVerificare };
  const condizioni = condizioniDaValutare(r).map((c) => condizioneConTesto(c, nomi));
  const v = valutaInsieme(condizioni, st);
  if (v.stato === 'bloccato') return { ...base, stato: 'bloccata', motivi: v.requisiti.filter((q) => q.stato === 'rosso' && q.bloccante !== false).map((q) => q.dettaglio) };
  const grigi = v.requisiti.filter((q) => q.stato === 'grigio' && q.bloccante !== false).map((q) => `Da verificare nel gioco: ${q.dettaglio}`);
  if (daVerificare.length) return { ...base, stato: 'da-verificare', accettabile: true, motivi: [...daVerificare, ...grigi] };
  return { ...base, stato: 'disponibile', accettabile: true, motivi: grigi };
}

/** Decisione 18: che cosa fanno gli yen della ricompensa nella partita (proposta «Applica» di prima, entrati da soli, già nel saldo da prima,
 *  non entrati), ricavato dal registro e dal momento del completamento. */
function yenDellaRicompensa(partitaId: number, chiave: string): Pick<StatoCalcolatoRichiestaDto, 'yenDaProposta' | 'yenRicompensa'> {
  if (yenPropostiInSospeso(partitaId, 'richiesta', chiave)) return { yenDaProposta: true };
  const y = statoYenRichiesta(partitaId, chiave);
  return y ? { yenRicompensa: y } : {};
}

/** Una Richiesta come DTO: bersaglio (risolto dall'Ombra del compendio, se c'è) e ricompense dai JSON, Confidente collegato (con il nome,
 *  o la chiave se manca), dedalo e stato nella partita (null se non è segnata); con lo stato della partita, anche lo stato calcolato. */
function dto(r: RigaRichiesta, stati: Map<string, StatoRichiesta>, premi = ricompensePerFonte('richiesta', [r.chiave]), st: StatoDisponibilita | null = null,
  profili: ReturnType<typeof profiliOmbre> = profiliOmbre(r.ombra_chiave ? [r.ombra_chiave] : [])): RichiestaDto {
  const nomi = nomiCondizioniMemo();
  const { bersaglio, ombra } = bersaglioRisolto(r, r.ombra_chiave ? profili.get(r.ombra_chiave) : undefined);
  return {
    condizioni: leggiCondizioniSalvate(r.condizioni_json).map((c) => condizioneConTesto(c, nomi)),
    scadenzaData: r.scadenza_data,
    proroga: r.proroga_data ? { data: r.proroga_data, condizioni: leggiCondizioniSalvate(r.proroga_condizioni_json).map((c) => condizioneConTesto(c, nomi)),
      // un'area eliminata (nel cestino) non si dice: la chiave resta salvata e torna valida col ripristino, senza spostare il bersaglio intanto
      areaDedalo: r.proroga_area_nome !== null ? r.proroga_area_dedalo_chiave : null, areaDedaloNome: r.proroga_area_nome, dedaloNome: r.proroga_dedalo_nome } : null,
    completamentoCondizioni: leggiCondizioniSalvate(r.completamento_condizioni_json).map((c) => condizioneConTesto(c, nomi)),
    ombra,
    yen: r.yen, esperienza: r.esperienza,
    ...(st ? { statoPartita: {
      ...statoCalcolato(r, stati.get(r.chiave) ?? null, st, nomi),
      // decisione 18: gli yen di una Richiesta con una proposta «Applica» di prima passano ancora da lei (la pagina non dice che entrano da soli);
      // altrimenti che cosa fanno davvero nella partita (entrati da soli, o già nel saldo da prima), perché la frase della pagina sia sempre vera
      ...(st.partitaId !== undefined && r.yen != null && r.yen > 0 ? yenDellaRicompensa(st.partitaId, r.chiave) : {}),
    } } : {}),
    chiave: r.chiave, nome: r.nome, committente: r.committente, disponibileDal: r.disponibile_dal, scadenza: r.scadenza, area: r.area, areaChiave: r.area_chiave, piano: r.piano,
    bersaglio, ricompense: JSON.parse(r.ricompense_json) as string[],
    oggettiRicompensa: premi.get(r.chiave) ?? [],
    confidente: r.confidente_chiave ? { chiave: r.confidente_chiave, nome: r.confidente_nome ?? r.confidente_chiave, rango: r.confidente_rango } : null,
    areaNome: r.area_nome, areaOrdine: r.area_ordine, areaDedalo: r.area_dedalo_chiave, areaDedaloNome: r.area_dedalo_nome,
    note: r.note, fonte: r.fonte, stato: stati.get(r.chiave) ?? null,
  };
}

/** Lo stato di ogni Richiesta segnata nella partita; mappa vuota senza partita (con partita ne verifica l'esistenza). */
function statiPartita(partitaId: number | undefined): Map<string, StatoRichiesta> {
  if (partitaId === undefined) return new Map();
  verificaPartita(partitaId);
  return new Map((prepared('SELECT richiesta_chiave, stato FROM richiesta_partita WHERE partita_id = ?').all(partitaId) as Array<{ richiesta_chiave: string; stato: StatoRichiesta }>).map((r) => [r.richiesta_chiave, r.stato]));
}

/** Tutte le Richieste, con lo stato nella partita se indicata, i dati di Jose e l'elenco dei dedali nell'ordine di
 *  percorrenza con quante Richieste hanno e quante sono completate (le Richieste senza dedalo non ne formano uno). */
export function richieste(partitaId?: number): Congelato<RichiesteDto> {
  const stati = statiPartita(partitaId);
  // prima per dedalo (le richieste senza dedalo in coda), poi per area del dedalo (le da collocare in coda) e per ordine della guida
  const righe = prepared(`${SQL} ORDER BY (a.ordine IS NULL), a.ordine, (ad.ordine IS NULL), ad.ordine, r.ordine`).all() as RigaRichiesta[];
  const premi: Map<string, RicompensaOggettoDto[]> = ricompensePerFonte('richiesta', righe.map((r) => r.chiave));
  const st = partitaId === undefined ? null : statoDisponibilitaPartita(partitaId);
  const profili = profiliOmbre(righe.flatMap((r) => (r.ombra_chiave ? [r.ombra_chiave] : [])));
  const lista = righe.map((r) => dto(r, stati, premi, st, profili));
  const dedali: RichiesteDto['dedali'] = [];
  for (const r of lista) {
    if (!r.areaChiave || !r.areaNome || r.areaOrdine === null) continue;
    let d = dedali.find((x) => x.chiave === r.areaChiave);
    if (!d) { d = { chiave: r.areaChiave, nome: r.areaNome, ordine: r.areaOrdine, totale: 0, completate: 0 }; dedali.push(d); }
    d.totale += 1;
    if (r.stato === 'completata') d.completate += 1;
  }
  const fonteJose = datiGuidaCorretti<JoseDto>('jose');
  const jose = fonteJose && catalogoOggettiDisponibile() ? { ...fonteJose, scambi: [],
    listino: prepared("SELECT 1 FROM negozio WHERE chiave = 'jose' AND nascosto = 0").get() ? dettaglioNegozio('jose', partitaId) : null } : fonteJose;
  return { richieste: lista, jose, dedali, completate: lista.filter((r) => r.stato === 'completata').length, totale: lista.length, collocazioni: collocazioni() };
}

/**
 * L13: il riepilogo leggero per la Home: quante Richieste sono accettate (e non completate né scadute) e quante di quelle ancora da fare
 * (accettate, disponibili, da verificare) scadono entro `GIORNI_AVVISO_SCADENZA` giorni. Lo stesso stato calcolato della pagina, senza
 * bersagli, ricompense, Ombre, dedali né Jose.
 */
export function riepilogoRichieste(partitaId: number): RiepilogoRichiesteDto {
  const stati = statiPartita(partitaId);
  const st = statoDisponibilitaPartita(partitaId);
  const nomi = nomiCondizioniMemo();
  let accettate = 0, inScadenza = 0;
  for (const r of prepared(SQL).all() as RigaRichiesta[]) {
    const s = statoCalcolato(r, stati.get(r.chiave) ?? null, st, nomi);
    if (s.stato === 'accettata') accettate += 1;
    if ((s.stato === 'accettata' || s.stato === 'disponibile' || s.stato === 'da-verificare') && s.giorniAllaScadenza !== null && s.giorniAllaScadenza <= GIORNI_AVVISO_SCADENZA) inScadenza += 1;
  }
  return { accettate, inScadenza, giorniAvviso: GIORNI_AVVISO_SCADENZA };
}

/** Tutti i dedali dei Memento, nell'ordine di percorrenza, con le loro aree (099): dove il modulo può mettere una Richiesta. */
function collocazioni(): RichiesteDto['collocazioni'] {
  const dedali = (prepared("SELECT a.chiave, a.nome FROM dungeon_area a JOIN dungeon d ON d.chiave = a.dungeon_chiave WHERE d.tipo = 'mementos' ORDER BY a.ordine").all() as Array<{ chiave: string; nome: string }>)
    .map((d) => ({ ...d, aree: [] as Array<{ chiave: string; nome: string }> }));
  for (const a of prepared('SELECT chiave, nome, dedalo_chiave FROM area_dedalo ORDER BY ordine, chiave').all() as Array<{ chiave: string; nome: string; dedalo_chiave: string }>) {
    dedali.find((d) => d.chiave === a.dedalo_chiave)?.aree.push({ chiave: a.chiave, nome: a.nome });
  }
  return dedali;
}

/** Stato di una Richiesta nella partita ('accettata', 'completata' o null per azzerare); evento al completamento. */
export function impostaStatoRichiesta(partitaId: number, chiave: string, stato: StatoRichiesta | null): RichiestaDto {
  verificaPartita(partitaId);
  const r = prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta | undefined;
  if (!r) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${chiave}' non esiste.`);
  const adesso = nowIso();
  getDb().transaction(() => {
    const rigaPrima = prepared('SELECT stato, updated_at FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').get(partitaId, chiave) as { stato: StatoRichiesta; updated_at: string } | undefined;
    const prima = rigaPrima?.stato ?? null;
    // L13: «Accetta» solo da disponibile (bloccata o scaduta: 409 col motivo). Le condizioni di SBLOCCO non fermano il completamento (la spunta
    // di una voce o chi gioca la segna fatta: un dato di sblocco sbagliato non deve impedire di registrare quel che è successo nel gioco)
    if (stato === 'accettata' && prima !== 'accettata') {
      const s = statoCalcolato(r, prima, statoDisponibilitaPartita(partitaId), nomiCondizioniMemo());
      if (!s.accettabile) throw httpErrors.conflict('richiesta-non-disponibile', `La Richiesta «${r.nome}» non si può accettare: ${s.stato === 'scaduta' ? 'è scaduta' : s.stato === 'completata' ? 'è già completata' : 'è bloccata'}${s.motivi.length ? ` (${s.motivi.join('; ')})` : ''}.`);
    }
    // L13 (ondata 7, O7-1): completarla chiede il bersaglio raggiungibile: il suo Dedalo aperto nella partita (409 `dedalo-non-aperto`) e le
    // condizioni proprie di completamento non false (409 `richiesta-non-completabile`), col motivo. Toglierla da completata resta sempre possibile
    if (stato === 'completata' && prima !== 'completata') {
      const st = statoDisponibilitaPartita(partitaId);
      const nomi = nomiCondizioniMemo();
      const c = completamento(r, st, nomi, prorogaValida(r, st, nomi));
      if (!c.completabile) throw httpErrors.conflict(c.dedaloChiuso ? 'dedalo-non-aperto' : 'richiesta-non-completabile', `La Richiesta «${r.nome}» non si può ancora completare: ${c.motivi.join('; ')}.`);
    }
    if (stato === null) prepared('DELETE FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').run(partitaId, chiave);
    // L13 (decisione 18): `updated_at` è il momento in cui la Richiesta ha preso il suo stato (per gli yen, il momento del completamento,
    // `yenAutomaticiService.statoYenRichiesta`): segnare di nuovo lo stesso stato non lo sposta
    else prepared('INSERT INTO richiesta_partita (partita_id, richiesta_chiave, stato, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, richiesta_chiave) DO UPDATE SET stato = excluded.stato, updated_at = CASE WHEN richiesta_partita.stato = excluded.stato THEN richiesta_partita.updated_at ELSE excluded.updated_at END').run(partitaId, chiave, stato, adesso);
    if (stato === 'completata' && prima !== 'completata') {
      const b = JSON.parse(r.bersaglio_json) as { nome: string };
      // il posto: il Dedalo e la sua area (310: il `piano` in testo resta solo dove non è il nome dell'area)
      const dove = r.area_nome ?? r.area;
      const piano = r.area_dedalo_nome || r.piano;
      registraEvento(partitaId, 'richiesta-completata', `Richiesta completata: ${r.nome}`, `${dove}${piano ? ` (${piano})` : ''} · bersaglio ${b.nome}${r.confidente_nome ? ` · Confidente ${r.confidente_nome}` : ''}.`, { richiesta: chiave });
    }
    // L13 (decisione 3): le ricompense della Richiesta le applica solo lei, completata. Gli yen (decisione 18): entrano da soli nel saldo
    // completandola e si tolgono (al più fino a zero) riaprendola (`riallineaYenRichiesta`); una proposta «Applica» nata prima resta al suo
    // registro (aperta: decidibile; applicata: la sua inversa). Gli oggetti: il registro degli oggetti ottenuti li legge dallo stato completato
    // (`oggettiOttenutiPartita`), una volta sola e senza copie da tenere allineate
    // riaprendola, il momento del completamento dice se la sua ricompensa era già nel saldo da prima degli yen automatici
    if ((prima === 'completata') !== (stato === 'completata')) { riallineaYenRichiesta(partitaId, chiave, 'stato', prima === 'completata' ? rigaPrima?.updated_at ?? null : null); riconciliaBeneficiRichiesta(partitaId, chiave); }
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  })();
  // con lo stato calcolato dopo il cambio (la pagina sostituisce la carta con questa)
  return dto(r, new Map(stato === null ? [] : [[chiave, stato]]), undefined, statoDisponibilitaPartita(partitaId));
}

/**
 * Colloca una Richiesta in un'area di un dedalo dei Memento (099: le Richieste sono elementi delle aree, scelta dell'utente del
 * 2026-10-11), o la toglie dall'area (null: resta nel suo dedalo, da collocare). Collocandola, il dedalo della Richiesta diventa
 * quello dell'area (`area_chiave`); se cambia dedalo, il suo nome va in `area` (che altrimenti tiene la prosa della guida) e la
 * Richiesta va in fondo all'elenco. Dato di gioco, per tutte le partite.
 */
export function collocaRichiesta(chiave: string, areaDedalo: string | null): RichiestaDto {
  const r = prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta | undefined;
  if (!r) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${chiave}' non esiste.`);
  if (areaDedalo === null) {
    prepared('UPDATE richiesta SET area_dedalo_chiave = NULL WHERE chiave = ?').run(chiave);
  } else {
    const a = prepared('SELECT ad.dedalo_chiave, d.nome AS dedalo_nome FROM area_dedalo ad JOIN dungeon_area d ON d.chiave = ad.dedalo_chiave WHERE ad.chiave = ?').get(areaDedalo) as { dedalo_chiave: string; dedalo_nome: string } | undefined;
    if (!a) throw httpErrors.notFound('area-dedalo-non-trovata', `L'area del dedalo '${areaDedalo}' non esiste.`);
    const ordine = a.dedalo_chiave === r.area_chiave ? r.ordine : (prepared('SELECT COALESCE(MAX(ordine), -1) AS n FROM richiesta').get() as { n: number }).n + 1;
    prepared('UPDATE richiesta SET area_dedalo_chiave = ?, area_chiave = ?, area = ?, ordine = ? WHERE chiave = ?').run(areaDedalo, a.dedalo_chiave, a.dedalo_chiave === r.area_chiave ? r.area : a.dedalo_nome, ordine, chiave);
  }
  return dto(prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta, new Map());
}

// ---- Le Richieste modificabili, aggiungibili ed eliminabili (scelta dell'utente, 2026-10-11) ----
//
// «come faccio a modificare i dettagli relativi alle richieste? non ho un pulsante modifica.» Scelte: «Modifica, aggiungi,
// elimina», «In entrambi i posti» (pagina delle Richieste e colonna del dedalo), «Si elimina e si avvisa». Le Richieste sono
// dati di gioco (`gioco.db`): valgono per tutte le partite e vanno nel pacchetto. La chiave non cambia mai, nemmeno col nome:
// stati delle partite, condizioni e pin la citano per chiave.

/** I campi di una Richiesta che il modulo scrive. `dedalo` e `areaDedalo`: dove sta (null = in nessun dedalo / da collocare). */
export interface DatiRichiesta {
  nome?: string; committente?: string; disponibileDal?: string; scadenza?: string;
  dedalo?: string | null; areaDedalo?: string | null; piano?: string;
  bersaglio?: RichiestaDto['bersaglio'];
  ricompense?: string[]; confidente?: string | null; confidenteRango?: number | null; note?: string;
  /** L13 (ondata 3): sblocco, scadenza con proroga, Ombra del compendio, yen e PE, oggetti del catalogo con le copie. */
  condizioni?: unknown[]; scadenzaData?: string | null; proroga?: { data: string; condizioni: unknown[]; areaDedalo?: string | null } | null;
  ombra?: string | null; yen?: number | null; esperienza?: number | null; oggetti?: Array<{ chiave: string; quantita: number }>;
  /** L13 (ondata 7, O7-1): le condizioni proprie per completarla (oltre al Dedalo aperto). */
  completamentoCondizioni?: unknown[];
}

/** Le condizioni scritte dal modulo, valide e con i riferimenti esistenti (il vocabolario unico: stessa verifica degli altri editor). */
function condizioniValide(x: unknown[] | undefined): string | null | undefined {
  if (x === undefined) return undefined;
  const c = normalizzaCondizioniSpillo(x);
  if (c.length !== x.length) throw httpErrors.badRequest('condizioni-non-valide', 'Una condizione di sblocco non è riconoscibile.');
  return c.length ? JSON.stringify(c) : null;
}
/** I campi L13 della Richiesta, validati: chi non li manda li lascia com'erano. */
function campiStrutturati(dati: DatiRichiesta): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const c = condizioniValide(dati.condizioni);
  if (c !== undefined) out.condizioni_json = c;
  if (dati.scadenzaData !== undefined) {
    if (dati.scadenzaData !== null && !dataValida(dati.scadenzaData)) throw httpErrors.badRequest('scadenza-non-valida', 'La scadenza non è una data di gioco.');
    out.scadenza_data = dati.scadenzaData;
  }
  if (dati.proroga !== undefined) {
    if (dati.proroga !== null && (!dataValida(dati.proroga.data) || !(dati.scadenzaData ?? null))) throw httpErrors.badRequest('proroga-non-valida', 'La proroga è una data di gioco e vale solo con una scadenza.');
    out.proroga_data = dati.proroga?.data ?? null;
    out.proroga_condizioni_json = dati.proroga ? condizioniValide(dati.proroga.condizioni) ?? null : null;
    // L13 (ondata 7): l'area in cui il bersaglio si sposta durante la proroga (un'area dei dedali che c'è); senza proroga non c'è
    const area = dati.proroga?.areaDedalo ?? null;
    if (area !== null && !prepared('SELECT 1 FROM area_dedalo WHERE chiave = ?').get(area)) throw httpErrors.notFound('area-dedalo-non-trovata', `L'area del dedalo '${area}' non esiste.`);
    out.proroga_area_dedalo_chiave = area;
  }
  const completa = condizioniValide(dati.completamentoCondizioni);
  if (completa !== undefined) out.completamento_condizioni_json = completa;
  if (dati.ombra !== undefined) {
    if (dati.ombra !== null && !prepared('SELECT 1 FROM ombra WHERE chiave = ?').get(dati.ombra)) throw httpErrors.notFound('ombra-non-trovata', `L'Ombra '${dati.ombra}' non è nel compendio.`);
    out.ombra_chiave = dati.ombra;
  }
  if (dati.yen !== undefined) out.yen = dati.yen;
  if (dati.esperienza !== undefined) out.esperienza = dati.esperienza;
  return out;
}
/**
 * Gli oggetti della ricompensa (`ricompensa_oggetto`, fonte «richiesta»): l'elenco del modulo dice quali oggetti, con quante copie e in che
 * ordine. Si aggiorna per oggetto (`catalogo_chiave`), non si cancella e reinserisce: la `nota` di una riga che resta (per esempio «armatura,
 * +Annulla Paura», scritta dall'abbinamento al catalogo e mostrata da `OggettiCollegati`) non si perde; solo le righe tolte se ne vanno e solo
 * le nuove nascono senza nota. Una riga che non cambia non si riscrive.
 */
function scriviOggetti(chiave: string, oggetti: DatiRichiesta['oggetti']): void {
  if (oggetti === undefined) return;
  for (const o of oggetti) if (!prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(o.chiave)) throw httpErrors.notFound('oggetto-non-trovato', `L'oggetto '${o.chiave}' non è nel catalogo.`);
  if (new Set(oggetti.map((o) => o.chiave)).size !== oggetti.length) throw httpErrors.badRequest('oggetti-ripetuti', 'Lo stesso oggetto compare due volte: indica le copie.');
  const prima = new Map((prepared("SELECT catalogo_chiave, quantita, ordine FROM ricompensa_oggetto WHERE fonte_tipo = 'richiesta' AND fonte_chiave = ?").all(chiave) as Array<{ catalogo_chiave: string; quantita: number | null; ordine: number }>)
    .map((x) => [x.catalogo_chiave, x]));
  const restano = new Set(oggetti.map((o) => o.chiave));
  for (const k of prima.keys()) if (!restano.has(k)) prepared("DELETE FROM ricompensa_oggetto WHERE fonte_tipo = 'richiesta' AND fonte_chiave = ? AND catalogo_chiave = ?").run(chiave, k);
  for (const [i, o] of oggetti.entries()) {
    const c = prima.get(o.chiave);
    if (!c) prepared("INSERT INTO ricompensa_oggetto (fonte_tipo, fonte_chiave, catalogo_chiave, quantita, ordine) VALUES ('richiesta', ?, ?, ?, ?)").run(chiave, o.chiave, o.quantita, i);
    else if (c.quantita !== o.quantita || c.ordine !== i) prepared("UPDATE ricompensa_oggetto SET quantita = ?, ordine = ? WHERE fonte_tipo = 'richiesta' AND fonte_chiave = ? AND catalogo_chiave = ?").run(o.quantita, i, chiave, o.chiave);
  }
}
function aggiornaCampiStrutturati(chiave: string, dati: DatiRichiesta): void {
  const campi = campiStrutturati(dati);
  const nomi = Object.keys(campi);
  const yenPrima = (prepared('SELECT yen FROM richiesta WHERE chiave = ?').get(chiave) as { yen: number | null } | undefined)?.yen ?? null;
  if (nomi.length) prepared(`UPDATE richiesta SET ${nomi.map((n) => `${n} = ?`).join(', ')} WHERE chiave = ?`).run(...nomi.map((n) => campi[n]), chiave);
  scriviOggetti(chiave, dati.oggetti);
  // L13 (decisione 3): gli yen corretti di una Richiesta già completata in qualche partita: la sua proposta di prima, se c'è, si riallinea (la
  // differenza, mai un doppio). Decisione 18: gli yen già entrati da soli restano quelli del completamento (fotografati al gesto, come la quota
  // della pesca): il nuovo importo vale dal prossimo completamento, nessun saldo cambia in silenzio per una correzione dei dati
  if (dati.yen !== undefined && (dati.yen ?? null) !== yenPrima) {
    for (const p of prepared("SELECT partita_id FROM richiesta_partita WHERE richiesta_chiave = ? AND stato = 'completata'").pluck().all(chiave) as number[]) riconciliaBeneficiRichiesta(p, chiave);
  }
}

/** La riga di una Richiesta (404 se non c'è). */
function rigaRichiesta(chiave: string): RigaRichiesta {
  const r = prepared(`${SQL} WHERE r.chiave = ?`).get(chiave) as RigaRichiesta | undefined;
  if (!r) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${chiave}' non esiste.`);
  return r;
}

/**
 * Dove sta la Richiesta: dedalo (una `dungeon_area` dei Memento), sua area (`area_dedalo`) e il nome del dedalo (colonna `area`).
 * Un'area porta con sé il suo dedalo (e deve essere di quello dato, se c'è); cambiando dedalo senza dire l'area, la Richiesta
 * resta da collocare nel dedalo nuovo.
 */
function collocazione(dati: DatiRichiesta, prima: { dedalo: string | null; area: string | null }): { dedalo: string | null; area: string | null; nomeDedalo: string } {
  let dedalo = dati.dedalo === undefined ? prima.dedalo : dati.dedalo;
  let area = dati.areaDedalo === undefined ? (dedalo === prima.dedalo ? prima.area : null) : dati.areaDedalo;
  if (area !== null) {
    const a = prepared('SELECT dedalo_chiave, nome FROM area_dedalo WHERE chiave = ?').get(area) as { dedalo_chiave: string; nome: string } | undefined;
    if (!a) throw httpErrors.notFound('area-dedalo-non-trovata', `L'area del dedalo '${area}' non esiste.`);
    if (dati.dedalo !== undefined && dati.dedalo !== null && dati.dedalo !== a.dedalo_chiave) throw httpErrors.badRequest('area-di-altro-dedalo', `«${a.nome}» è un'area di un altro dedalo.`);
    dedalo = a.dedalo_chiave;
  }
  if (dedalo === null) { area = null; return { dedalo, area, nomeDedalo: '' }; }
  const d = prepared("SELECT a.nome FROM dungeon_area a JOIN dungeon g ON g.chiave = a.dungeon_chiave WHERE a.chiave = ? AND g.tipo = 'mementos'").get(dedalo) as { nome: string } | undefined;
  if (!d) {
    if (prepared('SELECT 1 FROM dungeon_area WHERE chiave = ?').get(dedalo)) throw httpErrors.badRequest('non-un-dedalo', `'${dedalo}' non è un dedalo dei Memento.`);
    throw httpErrors.notFound('area-non-trovata', `Il dedalo '${dedalo}' non esiste.`);
  }
  return { dedalo, area, nomeDedalo: d.nome };
}

/** Il Confidente collegato deve esistere. */
function verificaConfidente(chiave: string | null | undefined): void {
  if (chiave && !prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(chiave)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${chiave}' non esiste.`);
}

/**
 * Il nome di una Richiesta è unico (senza badare alle maiuscole): i requisiti dei Confidenti della guida le citano per nome, e due
 * Richieste con lo stesso nome renderebbero ambiguo quale è completata (rilievo del validatore, 2026-10-11). 409 se è già usato.
 */
function verificaNomeLibero(nome: string, tranne: string | null): void {
  // in JS, con la regola dei semafori: `lower()` di SQLite tocca solo l'ASCII e lascerebbe passare «è una figlia…» accanto a «È una figlia…»
  const cercato = nome.trim().toLowerCase();
  const altra = (prepared('SELECT chiave, nome FROM richiesta WHERE chiave IS NOT ?').all(tranne) as { chiave: string; nome: string }[])
    .find((r) => r.nome.toLowerCase() === cercato);
  if (altra) throw httpErrors.conflict('nome-gia-usato', `C'è già una Richiesta che si chiama «${nome.trim()}»: i requisiti dei Confidenti le citano per nome, scegline un altro.`);
}

/** L'ordine dopo l'ultima Richiesta: una nuova, o una che cambia dedalo, va in fondo. */
const ordineInFondo = (): number => (prepared('SELECT COALESCE(MAX(ordine), -1) AS n FROM richiesta').get() as { n: number }).n + 1;

/** Una Richiesta nuova (nome e bersaglio obbligatori), in fondo all'elenco della guida; la chiave nasce dal nome. */
export function creaRichiesta(dati: DatiRichiesta & { nome: string; bersaglio: RichiestaDto['bersaglio'] }): RichiestaDto {
  verificaNomeLibero(dati.nome, null);
  const dove = collocazione(dati, { dedalo: null, area: null });
  verificaConfidente(dati.confidente);
  const base = (slug(dati.nome) || 'richiesta').slice(0, 190).replace(/-+$/, '') || 'richiesta';
  let chiave = base;
  for (let i = 2; prepared('SELECT 1 FROM richiesta WHERE chiave = ?').get(chiave); i++) chiave = `${base}-${i}`;
  getDb().transaction(() => {
  prepared(`INSERT INTO richiesta (chiave, ordine, nome, committente, disponibile_dal, scadenza, area, area_chiave, area_dedalo_chiave, piano, bersaglio_json, ricompense_json, confidente_chiave, confidente_rango, note, fonte)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'utente')`).run(
    chiave, ordineInFondo(), dati.nome.trim(), dati.committente ?? '', dati.disponibileDal ?? '', dati.scadenza ?? '', dove.nomeDedalo, dove.dedalo, dove.area, dati.piano ?? '',
    JSON.stringify(dati.bersaglio), JSON.stringify(dati.ricompense ?? []), dati.confidente ?? null, dati.confidente ? dati.confidenteRango ?? null : null, dati.note ?? '');
  aggiornaCampiStrutturati(chiave, dati);
  })();
  return dto(rigaRichiesta(chiave), new Map());
}

/**
 * Corregge una Richiesta: si cambiano solo i campi inviati. Cambiando dedalo va in fondo all'elenco e `area` prende il nome del
 * dedalo nuovo (altrimenti tiene la prosa della guida, «Dedalo di Aiyatsbus (Area 7) / …»). Cambiando nome, i requisiti
 * dei Confidenti che la citavano per nome (i dati della guida lo fanno così) passano a citarla per chiave, e il loro testo dice il
 * nome nuovo: altrimenti smetterebbero in silenzio di riconoscerla.
 */
export function aggiornaRichiesta(chiave: string, dati: DatiRichiesta): RichiestaDto {
  const r = rigaRichiesta(chiave);
  const dove = collocazione(dati, { dedalo: r.area_chiave, area: r.area_dedalo_chiave });
  if (dati.confidente !== undefined) verificaConfidente(dati.confidente);
  const confidente = dati.confidente === undefined ? r.confidente_chiave : dati.confidente;
  const rango = confidente === null ? null : dati.confidenteRango === undefined ? r.confidente_rango : dati.confidenteRango;
  const nome = dati.nome?.trim() || r.nome;
  if (nome.toLowerCase() !== r.nome.toLowerCase()) verificaNomeLibero(nome, chiave);
  const ordine = dove.dedalo !== r.area_chiave ? ordineInFondo() : r.ordine;
  getDb().transaction(() => {
    prepared(`UPDATE richiesta SET nome = ?, committente = ?, disponibile_dal = ?, scadenza = ?, area = ?, area_chiave = ?, area_dedalo_chiave = ?, piano = ?, bersaglio_json = ?,
      ricompense_json = ?, confidente_chiave = ?, confidente_rango = ?, note = ?, ordine = ? WHERE chiave = ?`).run(
      nome, dati.committente ?? r.committente, dati.disponibileDal ?? r.disponibile_dal, dati.scadenza ?? r.scadenza, dove.dedalo === r.area_chiave ? r.area : dove.nomeDedalo, dove.dedalo, dove.area, dati.piano ?? r.piano,
      dati.bersaglio ? JSON.stringify(dati.bersaglio) : r.bersaglio_json, dati.ricompense ? JSON.stringify(dati.ricompense) : r.ricompense_json, confidente, rango, dati.note ?? r.note, ordine, chiave);
    aggiornaCampiStrutturati(chiave, dati);
    if (nome !== r.nome) {
      // le voci della giornata che la indicano mostrano il nome salvato in `riferimento_testo` (`giornataService`): il nome nuovo.
      // L6 (R6-04): condizioni e requisiti la citano per chiave, e il testo che mostrano si genera dal nome: rinominarla non li tocca
      prepared("UPDATE voce_giornata SET riferimento_testo = ? WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ? AND riferimento_testo IS NOT NULL").run(nome, chiave);
    }
  })();
  return dto(rigaRichiesta(chiave), new Map());
}

/** Vero se il nome o la chiave citati sono quelli della Richiesta (i nomi senza badare alle maiuscole, come i semafori). */
const citaLaRichiesta = (citata: unknown, chiave: string, nome: string): boolean => typeof citata === 'string' && (citata === chiave || citata.toLowerCase() === nome.toLowerCase());

/** I requisiti dei Confidenti che citano la Richiesta (per chiave o per nome). */
function requisitiCheCitano(chiave: string, nome: string): Array<{ confidente_chiave: string; rango: number; indice: number; testo: string; dati: Record<string, unknown> }> {
  return (prepared("SELECT confidente_chiave, rango, indice, dati_json, testo FROM confidente_requisito WHERE tipo = 'richiesta'").all() as Array<{ confidente_chiave: string; rango: number; indice: number; dati_json: string; testo: string }>)
    .map((q) => ({ ...q, dati: JSON.parse(q.dati_json) as Record<string, unknown> }))
    .filter((q) => citaLaRichiesta(q.dati.richiesta, chiave, nome));
}

/** Vero se un albero di condizioni (gruppi compresi) ne contiene una sulla Richiesta. */
function condizioneCita(nodo: unknown, chiave: string, nome: string): boolean {
  if (Array.isArray(nodo)) return nodo.some((x) => condizioneCita(x, chiave, nome));
  if (!nodo || typeof nodo !== 'object') return false;
  const o = nodo as Record<string, unknown>;
  if (o.tipo === 'richiesta' && citaLaRichiesta(o.richiesta, chiave, nome)) return true;
  // L13: «Sblocco ricevuto» su questa Richiesta (la condizione la cita per chiave)
  if (o.tipo === 'sblocco' && o.bersaglio === 'richiesta' && o.chiave === chiave) return true;
  return Object.values(o).some((v) => typeof v === 'object' && condizioneCita(v, chiave, nome));
}

/** Le tabelle del file di gioco che hanno condizioni, con che cosa sono e le colonne delle condizioni (L13: anche le altre Richieste, sblocco e proroga). */
const TABELLE_CON_CONDIZIONI: ReadonlyArray<{ tabella: string; cosa: string; colonne?: readonly string[] }> = [
  { tabella: 'spillo', cosa: 'Pin' }, { tabella: 'negozio', cosa: 'Negozio' }, { tabella: 'articolo', cosa: 'Articolo' }, { tabella: 'libro', cosa: 'Libro' },
  { tabella: 'film', cosa: 'Film' }, { tabella: 'attivita', cosa: 'Attività' }, { tabella: 'luogo', cosa: 'Luogo' },
  { tabella: 'richiesta', cosa: 'Richiesta', colonne: ['condizioni_json', 'proroga_condizioni_json', 'completamento_condizioni_json'] },
];

// Le azioni della giornata sono le righe di `voce_giornata` (migrazione 092): `giorno_percorso.azioni_json` era rimasta come copia
// storica della guida d'origine e nessuno la legge più, quindi non si contava (rilievo del validatore, 2026-10-11: contarla diceva
// «2 azioni» per una sola); la tabella è stata tolta (L11, migrazione 189) e la copia storica è in
// `dati_guida.archivio-giorno-percorso-azioni-l11`.

/** Chi cita la Richiesta, per l'avviso prima di eliminarla: partite con uno stato, pin, condizioni, requisiti, azioni della giornata. */
export function citazioniRichiesta(chiave: string): CitazioniRichiestaDto {
  const r = rigaRichiesta(chiave);
  const condizioni: string[] = [];
  for (const t of TABELLE_CON_CONDIZIONI) {
    for (const colonna of t.colonne ?? ['condizioni_json']) {
      // la Richiesta stessa non si cita da sola (le sue condizioni se ne vanno con lei)
      const escludi = t.tabella === 'richiesta' ? ' AND chiave <> ?' : '';
      for (const riga of prepared(`SELECT nome, ${colonna} AS condizioni_json FROM ${t.tabella} WHERE ${colonna} LIKE '%richiesta%'${escludi}`).all(...(escludi ? [chiave] : [])) as Array<{ nome: string; condizioni_json: string }>) {
        const testo = `${t.cosa}: ${riga.nome}${colonna === 'proroga_condizioni_json' ? ' (proroga)' : colonna === 'completamento_condizioni_json' ? ' (per completarla)' : ''}`;
        if (condizioneCita(JSON.parse(riga.condizioni_json), chiave, r.nome) && !condizioni.includes(testo)) condizioni.push(testo);
      }
    }
  }
  const requisiti = requisitiCheCitano(chiave, r.nome).map((q) => {
    const c = prepared('SELECT nome FROM confidente WHERE chiave = ?').get(q.confidente_chiave) as { nome: string } | undefined;
    return `${c?.nome ?? q.confidente_chiave}, rango ${q.rango}`;
  });
  const voci = (prepared("SELECT COUNT(*) AS n FROM voce_giornata WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").get(chiave) as { n: number }).n;
  // L13: le voci del Diario con un effetto che la cita: «Richiesta completata» (per chiave) e «Sblocco» della Richiesta (chiave «richiesta:…»)
  const effetti = (prepared(`SELECT v.data, v.azione, e.tipo FROM voce_effetto e JOIN voce_giornata v ON v.uid = e.voce_uid
    WHERE (e.tipo = 'richiesta' AND e.chiave = ?) OR (e.tipo = 'sblocco' AND e.chiave = ?) ORDER BY v.data, v.ordine`).all(chiave, `richiesta:${chiave}`) as Array<{ data: string; azione: string; tipo: string }>)
    .map((v) => `${dataLeggibile(v.data)} «${v.azione.length > 60 ? `${v.azione.slice(0, 59)}…` : v.azione}» (${v.tipo === 'sblocco' ? 'la sblocca' : 'la completa'})`);
  return {
    partite: (prepared('SELECT COUNT(DISTINCT partita_id) AS n FROM richiesta_partita WHERE richiesta_chiave = ?').get(chiave) as { n: number }).n,
    pin: (prepared("SELECT nome FROM spillo WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ? ORDER BY nome").all(chiave) as Array<{ nome: string }>).map((p) => p.nome),
    condizioni, requisiti,
    azioni: voci,
    effetti,
    sblocchi: (prepared("SELECT COUNT(DISTINCT partita_id) AS n FROM utente.sblocco_partita WHERE bersaglio_tipo = 'richiesta' AND bersaglio_chiave = ?").get(chiave) as { n: number }).n,
  };
}

/**
 * Elimina una Richiesta per tutte le partite (scelta dell'utente, 2026-10-11: «Si elimina e si avvisa»). L6 (R6-04): va nel cestino
 * (Impostazioni → Cestino), da dove torna com'era; se ne vanno i suoi stati nelle partite e i pin e le azioni della giornata che la
 * indicavano perdono il collegamento (tornano col ripristino). Le condizioni e i requisiti che la citano **restano per chiave**, senza
 * riscritture, e danno «Richiesta eliminata» (grigio) finché non torna.
 *
 * L13: se ne vanno con lei anche gli sblocchi ricevuti nelle partite (`utente.sblocco_partita`, scritti dalle voci con l'effetto «sblocco»):
 * sono uno stato della Richiesta nella partita come `richiesta_partita`, e il cestino li registra e li rimette col ripristino (gli effetti
 * delle voci che la citano restano, come le condizioni). Gli yen della Richiesta completata si riallineano come togliendo il completamento: quelli
 * entrati da soli tornano (al più fino a zero), la proposta aperta di prima si chiude, quella già applicata ha la sua inversa (dopo il ripristino si
 * riallineano di nuovo, `riallineaYenRichiesta` e `riconciliaBeneficiRichiesta`).
 */
export function eliminaRichiesta(chiave: string): void {
  const r = rigaRichiesta(chiave);
  conCestino({ tipo: 'richiesta', chiave, nome: r.nome, contesto: r.area }, () => {
    const partite = prepared("SELECT partita_id FROM richiesta_partita WHERE richiesta_chiave = ? UNION SELECT partita_id FROM utente.da_applicare WHERE causa_tipo = 'richiesta' AND causa_chiave = ? UNION SELECT partita_id FROM utente.yen_automatico WHERE causa_tipo = 'richiesta' AND causa_chiave = ? AND annullato_il IS NULL").pluck().all(chiave, chiave, chiave) as number[];
    prepared('DELETE FROM richiesta_partita WHERE richiesta_chiave = ?').run(chiave);
    prepared("DELETE FROM utente.sblocco_partita WHERE bersaglio_tipo = 'richiesta' AND bersaglio_chiave = ?").run(chiave);
    prepared("UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").run(chiave);
    prepared("UPDATE voce_giornata SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE riferimento_tipo = 'richiesta' AND riferimento_chiave = ?").run(chiave);
    prepared('DELETE FROM richiesta WHERE chiave = ?').run(chiave);
    for (const p of partite) { riallineaYenRichiesta(p, chiave, 'eliminazione'); riconciliaBeneficiRichiesta(p, chiave); }
  });
}
