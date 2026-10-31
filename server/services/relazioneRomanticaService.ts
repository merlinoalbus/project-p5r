// ============================================================
// relazioneRomanticaService — la relazione romantica con un Confidente nella partita: il punto unico di lettura e scrittura (L13, ondata 10, O10-2)
// ============================================================
//
// Domanda posta all'utente il 2026-10-31 sulla relazione romantica con Takemi («a) aggiungo alla partita il dato "relazione romantica" (lo segni
// con la scelta romantica al rango 9) e da lì l'app sposta da sola la disponibilità di Takemi alla sera»): risposta «a».
// Due dati, uno per file:
//   - `main.confidente.romanzabile` (migrazioni 324-325, dal dialogo del rango 9): con il Confidente si può iniziare una relazione romantica;
//   - `utente.confidente_partita.relazione_romantica` (migrazione utente 059): la partita l'ha iniziata; dal 2026-10-31 (ondata 11, O11-1,
//     risposta dell'utente «Sì, in automatico» sui doni «se fidanzata») con il giorno d'inizio, `relazione_romantica_dal` (utente 060), letto
//     dalle condizioni `relazione-romantica` / `relazioni-romantiche` del valutatore unico (`relazioniConGiorno`).
// Qui si leggono (la scheda del Confidente, i semafori, il Diario con la mappa dei Confidenti della partita, la disponibilità strutturata) e si
// scrivono (la scheda del Confidente nella partita, la spunta del passaggio al rango 9 e il suo annullo). Un Confidente non romanzabile non ha
// mai la relazione. Il modulo non importa altri servizi della partita: lo usano `partiteService`, `semaforiService` e
// `disponibilitaStrutturataService` senza un giro di import.
// ============================================================

import { nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { registraCacheDiGioco } from './cacheDiGioco.js';
import { registraEvento } from './storicoService.js';
import { RANGO_DELLA_SCELTA_ROMANTICA } from '../../shared/puntiConfidenti.js';

/** I Confidenti romanzabili, letti una volta e svuotati quando il DB di gioco cambia; vuoto su un file di gioco senza la colonna (prima della 324). */
let romanzabili: Set<string> | null = null;
registraCacheDiGioco(() => { romanzabili = null; });
export function confidentiRomanzabili(): ReadonlySet<string> {
  if (!romanzabili) {
    const conColonna = !!prepared("SELECT 1 FROM pragma_table_info('confidente') WHERE name = 'romanzabile'").get();
    romanzabili = new Set(conColonna ? prepared('SELECT chiave FROM confidente WHERE romanzabile = 1').pluck().all() as string[] : []);
  }
  return romanzabili;
}

/** Con il Confidente si può iniziare una relazione romantica. */
export const eRomanzabile = (chiave: string): boolean => confidentiRomanzabili().has(chiave);

/** I Confidenti con cui la partita ha iniziato una relazione romantica (solo i romanzabili): la lettura unica del dato. */
export function relazioniDellaPartita(partitaId: number): ReadonlySet<string> {
  const r = confidentiRomanzabili();
  if (!r.size) return new Set();
  return new Set((prepared('SELECT confidente_chiave FROM utente.confidente_partita WHERE partita_id = ? AND relazione_romantica = 1').pluck().all(partitaId) as string[]).filter((c) => r.has(c)));
}

/** La colonna del giorno d'inizio (utente 060) c'è: su uno schema di prima la relazione si legge senza giorno (null). */
const conGiornoDInizio = (): boolean => !!prepared("SELECT 1 FROM pragma_table_info('confidente_partita', 'utente') WHERE name = 'relazione_romantica_dal'").get();

/**
 * L13 (ondata 11, O11-1; risposta dell'utente del 2026-10-31 «Sì, in automatico» sui doni «se fidanzata»): le relazioni romantiche della
 * partita con il giorno in cui sono iniziate (MM-GG del calendario di gioco, `utente.confidente_partita.relazione_romantica_dal`, utente 060;
 * null se il giorno non è registrato). Solo i Confidenti romanzabili, come `relazioniDellaPartita`, di cui è la stessa lettura con il giorno:
 * la legge lo stato dei semafori per le condizioni `relazione-romantica` e `relazioni-romantiche`.
 */
export function relazioniConGiorno(partitaId: number): ReadonlyMap<string, string | null> {
  const r = confidentiRomanzabili();
  if (!r.size) return new Map();
  const righe = (conGiornoDInizio()
    ? prepared('SELECT confidente_chiave, relazione_romantica_dal AS dal FROM utente.confidente_partita WHERE partita_id = ? AND relazione_romantica = 1').all(partitaId)
    : prepared('SELECT confidente_chiave, NULL AS dal FROM utente.confidente_partita WHERE partita_id = ? AND relazione_romantica = 1').all(partitaId)) as Array<{ confidente_chiave: string; dal: string | null }>;
  return new Map(righe.filter((x) => r.has(x.confidente_chiave)).map((x) => [x.confidente_chiave, x.dal]));
}

/** Il giorno d'inizio della relazione con il Confidente nella partita (null se non c'è la relazione o il giorno non è registrato). */
const giornoDInizio = (partitaId: number, chiave: string): string | null => relazioniConGiorno(partitaId).get(chiave) ?? null;

/** La relazione romantica con il Confidente nella partita: falsa se il Confidente non è romanzabile o non ha ancora una riga nella partita. */
export const relazioneRomantica = (partitaId: number, chiave: string): boolean => eRomanzabile(chiave) && relazioniDellaPartita(partitaId).has(chiave);

/** Il rango in cui la guida fa scegliere la relazione romantica (lo stesso per tutti i Confidenti romanzabili: la regola della 325); il valore
 *  sta in `shared/puntiConfidenti`, letto anche dall'interfaccia (O10-3). */
export { RANGO_DELLA_SCELTA_ROMANTICA };

/**
 * La relazione che vale per l'incontro verso `rangoAtteso` (una voce del Diario): fino al rango della scelta compreso la relazione non c'era
 * ancora (falsa: valgono le fasce di sempre); dopo, quella della partita (null senza partita: non la sappiamo). Una voce senza rango atteso non
 * dice quando cade rispetto alla scelta: null.
 */
export function relazioneAlRango(relazione: boolean | null, rangoAtteso: number | null): boolean | null {
  if (rangoAtteso === null) return null;
  return rangoAtteso <= RANGO_DELLA_SCELTA_ROMANTICA ? false : relazione;
}

/** Il Confidente non è romanzabile: 409 con un codice chiaro (la relazione romantica non si segna). */
export function richiediRomanzabile(chiave: string, nome = chiave): void {
  if (!eRomanzabile(chiave)) throw httpErrors.conflict('confidente-non-romanzabile', `Con ${nome} non si può iniziare una relazione romantica.`);
}

/**
 * Segna (o toglie) la relazione romantica con il Confidente nella partita e dice com'era: `prima` e `dopo`. Senza cambiamento non scrive. Una
 * riga assente nella partita si crea con i valori di partenza (non sbloccato, rango 0), come le altre scritture del Confidente. Lo storico lo
 * dice («relazione romantica iniziata» / «tolta»), con l'origine. Va chiamata dentro la transazione di chi la usa.
 * L13 (O11-1): scrive anche il giorno d'inizio (`relazione_romantica_dal`, utente 060) e dice quello di prima (`primaDal`, null senza relazione o
 * senza giorno): `giorno` è il giorno della voce spuntata per l'origine «diario», il giorno di prima (dalla ricevuta) per «diario-tolto»; per
 * «pagina» vale il giorno corrente della partita (`partita.data_gioco`). Togliendo la relazione il giorno torna null.
 */
export function scriviRelazioneRomantica(partitaId: number, chiave: string, nome: string, valore: boolean, origine: 'pagina' | 'diario' | 'diario-tolto', giorno: string | null = null): { prima: boolean; dopo: boolean; primaDal: string | null; dal: string | null } {
  richiediRomanzabile(chiave, nome);
  const prima = relazioneRomantica(partitaId, chiave);
  const primaDal = prima ? giornoDInizio(partitaId, chiave) : null;
  if (prima === valore) return { prima, dopo: valore, primaDal, dal: primaDal };
  const adesso = nowIso();
  const dal = !valore ? null : origine === 'pagina'
    ? ((prepared('SELECT data_gioco FROM utente.partita WHERE id = ?').pluck().get(partitaId) as string | null | undefined) ?? null)
    : giorno;
  prepared(`INSERT INTO utente.confidente_partita (partita_id, confidente_chiave, sbloccato, rango, punti, note, updated_at, relazione_romantica, relazione_romantica_dal) VALUES (?, ?, 0, 0, 0, '', ?, ?, ?)
    ON CONFLICT(partita_id, confidente_chiave) DO UPDATE SET relazione_romantica = excluded.relazione_romantica, relazione_romantica_dal = excluded.relazione_romantica_dal, updated_at = excluded.updated_at`)
    .run(partitaId, chiave, adesso, valore ? 1 : 0, dal);
  prepared('UPDATE utente.partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  const da = origine === 'pagina' ? 'Segnata a mano dalla scheda del Confidente.' : origine === 'diario' ? 'Scelta romantica alla spunta del Diario.' : 'Spunta tolta dal Diario: la relazione torna com’era.';
  registraEvento(partitaId, 'confidente-relazione', `${nome}: relazione romantica ${valore ? 'iniziata' : 'tolta'}`, da, { confidente: chiave, prima, dopo: valore, origine, dal });
  return { prima, dopo: valore, primaDal, dal };
}

/** La relazione della ricevuta di una spunta (`EffettiAzioneDto.relazione`); `primaDal` (O11-1) manca nelle ricevute scritte prima: vale null. */
interface RelazioneDellaSpunta { confidente: string; nome: string; prima: boolean; dopo: boolean; primaDal?: string | null }

/** Togliendo la spunta la relazione torna com'era (`prima`), solo se nella partita vale ancora quella della spunta (`dopo`): un cambio fatto
 *  dopo, dalla scheda, resta (come `annullaPiazzamentoDallaSpunta`). Vero se l'annullo la riporterebbe indietro. */
export function relazioneSiAnnulla(partitaId: number, r: RelazioneDellaSpunta): boolean {
  return r.prima !== r.dopo && eRomanzabile(r.confidente) && relazioneRomantica(partitaId, r.confidente) === r.dopo;
}
export function annullaRelazioneDallaSpunta(partitaId: number, r: RelazioneDellaSpunta): void {
  if (relazioneSiAnnulla(partitaId, r)) scriviRelazioneRomantica(partitaId, r.confidente, r.nome, r.prima, 'diario-tolto', r.prima ? r.primaDal ?? null : null);
}
