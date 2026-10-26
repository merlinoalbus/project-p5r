// ============================================================
// prezziArticoli — il prezzo in yen di un'offerta nella fascia in cui si compra (Ondata 5, lotto E; decisioni 2, 5 e 18)
// ============================================================
//
// Il prezzo vive solo nell'offerta: `articolo.prezzo` e, quando una fascia costa diversamente, `articolo.prezzo_per_fascia_json`
// (decisione 5: «il prezzo serale di 500 yen è un dato dell'articolo», le sfide della Big Bang Burger). Chi scala gli yen da solo
// (decisione 18: l'effetto «articolo» della voce spuntata, il turno della sfida, l'anteprima dell'elenco del passato) e chi lo mostra legge
// da qui, con la fascia della voce del Diario o, senza voce, quella corrente della partita: tutti dicono lo stesso importo. Lo leggono anche
// la scelta dell'esito alla spunta e al contatore (`esitiAttivitaService`, con la fascia dello stato), la scelta fra articoli in alternativa
// (`alternativeAcquistiService`), il prezzo minimo della scheda dell'oggetto (`catalogoOggettiLetture`) e le frasi degli effetti fuori dal
// Diario (`azioniStrutturateService`, che mostrano il prezzo del listino con quello della fascia accanto).
// ============================================================

import { prepared } from '../db/dbService.js';
import { prezzoNellaFascia, type FasciaPrezzo } from '../../shared/catalogo.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';
import { normalizzaSconto, prezzoScontato, scontoAttivo, type ScontoNegozio } from '../../shared/scontiNegozi.js';

const eFascia = (v: unknown): v is FasciaPrezzo => v === 'giorno' || v === 'sera';

/** Vero se il file di gioco ha la colonna del prezzo per fascia (migrazione 260); uno schema di prima legge solo `prezzo`. */
function conPrezzoPerFascia(): boolean {
  return !!prepared("SELECT 1 FROM pragma_table_info('articolo', 'main') WHERE name = 'prezzo_per_fascia_json'").get();
}

/** La colonna del prezzo per fascia da mettere in una SELECT sull'articolo con l'alias dato (`NULL` su uno schema di prima della 260). */
export function sqlPrezzoPerFascia(alias: string): string {
  return conPrezzoPerFascia() ? `${alias}.prezzo_per_fascia_json` : 'NULL';
}

/** La fascia della voce del Diario (giorno o sera); null se la voce non c'è più. */
export function fasciaDellaVoce(voceUid: string): FasciaPrezzo | null {
  const f = (prepared('SELECT fascia FROM main.voce_giornata WHERE uid = ?').get(voceUid) as { fascia: string } | undefined)?.fascia;
  return eFascia(f) ? f : null;
}

/** La fascia corrente della partita (giorno o sera). */
export function fasciaDellaPartita(partitaId: number): FasciaPrezzo | null {
  const f = (prepared('SELECT fascia_gioco FROM utente.partita WHERE id = ?').get(partitaId) as { fascia_gioco: string } | undefined)?.fascia_gioco;
  return eFascia(f) ? f : null;
}

/** Vero se il file di gioco ha la colonna dello sconto del negozio (migrazione 254); uno schema di prima non sconta niente. */
function conSconto(): boolean {
  return !!prepared("SELECT 1 FROM pragma_table_info('negozio', 'main') WHERE name = 'sconto_json'").get();
}

/** Il rango del Confidente nella partita (null se la partita non lo ha ancora). */
function rangoNellaPartita(partitaId: number, confidente: string): number | null {
  const r = prepared('SELECT rango FROM utente.confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, confidente) as { rango: number | null } | undefined;
  return r?.rango ?? null;
}

/**
 * Lo sconto del negozio dell'offerta che vale adesso nella partita (chiusura dell'ondata 5: la Clinica di Takemi a metà prezzo dal rango
 * indicato, `negozio.sconto_json`); null senza partita, senza sconto o con il Confidente sotto il rango.
 */
export function scontoNellaPartita(negozio: string | null | undefined, partitaId: number | null | undefined): ScontoNegozio | null {
  if (!negozio || partitaId === null || partitaId === undefined || !conSconto()) return null;
  const sconto = normalizzaSconto((prepared('SELECT sconto_json FROM main.negozio WHERE chiave = ?').get(negozio) as { sconto_json: string | null } | undefined)?.sconto_json ?? null);
  return sconto && scontoAttivo(sconto, rangoNellaPartita(partitaId, sconto.confidente)) ? sconto : null;
}

type MomentoVoce = [number, number, number];
/** Il momento di una voce del Diario nell'anno di gioco (data, fascia, ordine nella giornata); null se la voce non c'è più. */
function momentoDellaVoce(voceUid: string): MomentoVoce | null {
  const v = prepared('SELECT data, fascia, ordine FROM main.voce_giornata WHERE uid = ?').get(voceUid) as { data: string; fascia: string; ordine: number } | undefined;
  return v ? [ordineGioco(v.data), v.fascia === 'sera' ? 1 : 0, v.ordine] : null;
}
const primaDi = (a: MomentoVoce, b: MomentoVoce): boolean => a[0] !== b[0] ? a[0] < b[0] : a[1] !== b[1] ? a[1] < b[1] : a[2] < b[2];

/**
 * Lo sconto del negozio che valeva nel momento della voce del Diario (revisione della chiusura dell'ondata 5, N1: una voce del passato non si paga
 * con il rango di oggi). Il rango si raggiunge nel Diario con la voce spuntata del Confidente che porta al rango dello sconto (`rango_atteso`):
 * una voce che viene prima della prima di queste spunte si paga a prezzo pieno. Se nessuna voce spuntata della partita porta il Confidente a quel
 * rango, il rango è stato segnato fuori dal Diario (dalla pagina Confidenti) e il Diario non dice da quando: vale il rango di adesso.
 */
export function scontoAllaVoce(negozio: string | null | undefined, partitaId: number | null | undefined, voceUid: string): ScontoNegozio | null {
  const sconto = scontoNellaPartita(negozio, partitaId);
  if (!sconto) return null;
  const voce = momentoDellaVoce(voceUid);
  if (!voce) return sconto;
  const raggiunto = (prepared(`SELECT g.data, g.fascia, g.ordine FROM main.voce_giornata g JOIN utente.spunta_voce_partita s ON s.voce_uid = g.uid AND s.partita_id = ?
    WHERE g.riferimento_tipo = 'confidente' AND g.riferimento_chiave = ? AND g.rango_atteso >= ?`).all(partitaId, sconto.confidente, sconto.rango) as Array<{ data: string; fascia: string; ordine: number }>)
    .map((v): MomentoVoce => [ordineGioco(v.data), v.fascia === 'sera' ? 1 : 0, v.ordine]);
  if (!raggiunto.length) return sconto;
  const primo = raggiunto.reduce((a, b) => (primaDi(b, a) ? b : a));
  return primaDi(voce, primo) ? null : sconto;
}

/**
 * Il prezzo in yen dell'offerta nella fascia (null = offerta assente o prezzo non indicato). Senza fascia nota vale `prezzo`. Con la partita
 * vale anche lo sconto del negozio legato al rango di un Confidente: quello di adesso (`scontoNellaPartita`) o, con la voce del Diario che compra,
 * quello che valeva nel suo momento (`scontoAllaVoce`). È l'importo che gli yen automatici scalano.
 */
export function prezzoDellArticolo(articolo: string, fascia: FasciaPrezzo | null | undefined, partitaId?: number | null, voceUid?: string | null): number | null {
  const r = prepared(conPrezzoPerFascia() ? 'SELECT prezzo, prezzo_per_fascia_json, negozio_chiave FROM main.articolo WHERE chiave = ?' : 'SELECT prezzo, NULL AS prezzo_per_fascia_json, negozio_chiave FROM main.articolo WHERE chiave = ?')
    .get(articolo) as { prezzo: number | null; prezzo_per_fascia_json: string | null; negozio_chiave: string | null } | undefined;
  if (!r) return null;
  const prezzo = prezzoNellaFascia(r.prezzo, r.prezzo_per_fascia_json, fascia);
  if (prezzo === null) return null;
  const sconto = voceUid ? scontoAllaVoce(r.negozio_chiave, partitaId, voceUid) : scontoNellaPartita(r.negozio_chiave, partitaId);
  return sconto ? prezzoScontato(prezzo, sconto) : prezzo;
}
