// Legami fra una fonte e un oggetto del catalogo: ogni gesto è dell'utente e si applica subito, senza proposte da confermare.
// L4-06: il ramo delle proposte di abbinamento (elenco, conferma, scelta di un'alternativa) non aveva più un'interfaccia; le 73 righe di
// `proposta_abbinamento` restano come storia e la fusione ne tiene coerenti i riferimenti (`catalogoOggettiFusione.ts`), ma un legame non ne scrive più.
import { getDb, nowIso, prepared } from '../db/dbService.js';
import type { OggettiGuidaDto } from '../../shared/types.js';
import { IDENTITA_DI_UN_OFFERTA_COLLEGATA } from '../../shared/catalogo.js';
import type { DatiLegameOggetto } from '../schemas/catalogoOggetti.js';
import { httpErrors } from '../utils/httpError.js';
import { identitaDellOggettoPerLOfferta, rigaOggetto } from './catalogoOggettiLetture.js';
import { fondiOggetti } from './catalogoOggettiFusione.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { datiGuida } from './datiGuida.js';
import { fonteRicompensaOggetto } from './fontiRicompenseOggetti.js';

type Riga = Record<string, unknown>;
type LegameCompleto = Omit<DatiLegameOggetto, 'quantita'> & { quantita: number | null };
const eProdottoRicetta = (r: { riga_tipo: string; riga_chiave: string }) => r.riga_tipo === 'ricompensa' && r.riga_chiave.startsWith('ricetta/');

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

/** L'offerta vende l'oggetto (o non lo vende più): un'offerta con risultati separati si corregge dal listino. */
function applicaArticolo(d: LegameCompleto): void {
  const attuale = prepared('SELECT * FROM articolo WHERE chiave = ?').get(d.riga_chiave) as Riga | undefined;
  if (!attuale) throw httpErrors.notFound('articolo-non-trovato', 'La riga del listino non esiste.');
  if (!d.togli && prepared("SELECT 1 FROM ricompensa_oggetto WHERE fonte_tipo = 'articolo' AND fonte_chiave = ?").get(d.riga_chiave)) {
    throw httpErrors.conflict('offerta-con-risultati', 'Questa offerta ha risultati separati: correggili dal listino prima di collegare un oggetto singolo.');
  }
  if (d.togli && attuale.catalogo_chiave !== d.catalogo_chiave) throw httpErrors.conflict('legame-cambiato', 'Il legame è cambiato: non scollego un altro oggetto.');
  prepared("UPDATE articolo SET catalogo_chiave = ?,seed_json = COALESCE(seed_json,?),origine = 'utente',updated_at = ? WHERE chiave = ?")
    .run(d.togli ? null : d.catalogo_chiave, JSON.stringify(attuale), nowIso(), d.riga_chiave);
  // L4-07: collegata, l'offerta prende nome, categoria e «per chi» dall'oggetto e non ne ha di suoi; scollegata, tiene quelli che mostrava
  // (dall'oggetto), che da lì sono suoi
  const identita = d.togli ? identitaDellOggettoPerLOfferta(d.catalogo_chiave) : IDENTITA_DI_UN_OFFERTA_COLLEGATA;
  if (identita) prepared('UPDATE articolo SET nome = @nome, categoria = @categoria, per = @per WHERE chiave = @chiave').run({ ...identita, chiave: d.riga_chiave });
}

function applicaLegame(d: LegameCompleto): void {
  if (d.quantita === null ? !eProdottoRicetta(d) : !Number.isSafeInteger(d.quantita) || d.quantita < 1) throw httpErrors.conflict('quantita-proposta-non-valida','Indica una quantità positiva; solo la resa di una ricetta può restare non indicata.');
  if (d.riga_tipo === 'articolo') { applicaArticolo(d); return; }
  if (d.riga_tipo === 'regalo') {
    const [confidente, ordine] = regalo(d.riga_chiave);
    const attuale = prepared('SELECT catalogo_chiave FROM confidente_regalo WHERE confidente_chiave = ? AND ordine = ?').get(confidente, ordine) as { catalogo_chiave: string | null } | undefined;
    if (!attuale) throw httpErrors.notFound('regalo-non-trovato', 'La riga del regalo non esiste.');
    if (d.togli && attuale.catalogo_chiave !== d.catalogo_chiave) throw httpErrors.conflict('legame-cambiato', 'Il legame è cambiato: non scollego un altro oggetto.');
    prepared('UPDATE confidente_regalo SET catalogo_chiave = ? WHERE confidente_chiave = ? AND ordine = ?').run(d.togli ? null : d.catalogo_chiave, confidente, ordine);
    return;
  }
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
  const n = ordinePrecedente ?? (ordine ? (prepared(`SELECT COALESCE(MAX(ordine),-1)+1 AS n FROM ${tabella} WHERE ${dove}`).get(...valori) as { n: number }).n : 0);
  // la quantità scritta è quella indicata (non si somma alla precedente); la nota omessa conserva quella del legame
  const notaAggiornata = ordine && d.nota !== undefined ? ',nota = excluded.nota' : '';
  prepared(`INSERT INTO ${tabella}(${colonne.join(',')}) VALUES (${colonne.map(() => '?').join(',')})
    ON CONFLICT(${[...chiavi, 'catalogo_chiave'].join(',')}) DO UPDATE SET quantita = excluded.quantita${notaAggiornata}`)
    .run(...valori, d.catalogo_chiave, d.quantita, ...(ordine ? [n, d.nota ?? null] : []));
}

/** Collega, modifica o toglie il legame di una fonte con un oggetto; per `catalogo` fonde due identità (si annulla dal cestino). */
export function impostaLegameOggetto(input: DatiLegameOggetto): { salvato: true } {
  getDb().transaction(() => {
    const conservaContenuto = ['voce', 'ricompensa', 'ricetta'].includes(input.riga_tipo) && input.precedente_catalogo_chiave === input.catalogo_chiave;
    // La quantità/nota di un contenuto già collegato resta modificabile anche se l'identità è nascosta;
    // applicaLegame verificherà l'esistenza del legame precedente prima di qualsiasi scrittura.
    rigaOggetto(input.catalogo_chiave, input.togli || conservaContenuto);
    const dati: LegameCompleto = { ...input, quantita: input.quantita !== undefined ? input.quantita : eProdottoRicetta(input) ? null : 1 };
    if (dati.riga_tipo === 'catalogo') {
      if (dati.togli) throw httpErrors.badRequest('fusione-non-si-scollega', 'Per annullare una fusione usa il cestino.');
      fondiOggetti(dati.riga_chiave, dati.catalogo_chiave);
    } else applicaLegame(dati);
  })();
  invalidaCacheDiGioco();
  return { salvato: true };
}
