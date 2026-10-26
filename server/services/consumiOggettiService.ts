// ============================================================
// consumiOggettiService — le copie degli oggetti posseduti che la partita USA (Ondata 5, lotto F-bis; decisioni 21 e 22 dell'utente)
// ============================================================
//
// Decisione 21, precisazione: gli oggetti con effetti che incidono su ciò che l'app gestisce si modellano con i tipi dell'app. Un oggetto che si
// usa esce dalle copie possedute: il concime della pianta (Gentilezza), i materiali della fabbricazione (Perizia, decisione 22), l'incenso
// dell'Isolamento (statistiche della Persona). Un solo registro, `utente.consumo_oggetto_partita` (utente 055):
//   - un turno registrato con un esito che dichiara `consuma` (`attivita.esiti_json`, `shared/esitiAttivita.ts`) scrive una riga per oggetto
//     (registrando il turno, dentro la sua transazione) e la toglie togliendolo: lo stesso percorso degli oggetti dati
//     (`oggettiDegliEsitiService`) e del trofeo (`trofeiDegliEsitiService`);
//   - un ciclo di Isolamento con un incenso del catalogo scrive una riga con l'evento dello storico; quella riga si annulla dagli «Oggetti
//     ottenuti» (`annullaConsumoIsolamento`), perché l'Isolamento non ha un gesto che lo tolga.
// Il consumo non chiede di avere le copie: chi gioca le ha prese in un modo che l'app può non conoscere (un'aggiunta a mano, una partita
// iniziata prima del registro). Le copie rimaste si leggono in `copieOggetti` (mai sotto zero), e la scelta dell'esito le mostra.
// Nessuno yen si muove da qui: il prezzo l'oggetto lo aveva già quando si è comprato.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { esitiDellAttivita } from './esitiAttivitaService.js';
import { catalogoOggettiDisponibile } from './catalogoOggettiLetture.js';

const TABELLA = 'consumo_oggetto_partita';

/** La tabella c'è? (Uno schema di prima della utente 055 non registra consumi: niente da scrivere né da togliere.) */
export const conRegistroConsumi = (): boolean => !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(TABELLA);

/**
 * Registrando il turno `ordine` dell'attività con l'esito `esito`: gli oggetti che l'esito consuma escono dalle copie possedute. Va chiamata
 * dentro la transazione del turno. Le righe rimaste da un turno con lo stesso numero (tolto per un'altra strada) si tolgono prima.
 */
export function segnaConsumiDelTurno(p: number, attivita: string, ordine: number, esito: string | null | undefined): void {
  if (!conRegistroConsumi()) return;
  togliConsumiDelTurno(p, attivita, ordine);
  if (!esito) return;
  const consuma = esitiDellAttivita(attivita)?.esiti?.esiti.find((e) => e.chiave === esito)?.consuma ?? [];
  if (!consuma.length || !catalogoOggettiDisponibile()) return;
  const nelCatalogo = prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?');
  const inserisci = prepared(`INSERT INTO utente.${TABELLA} (partita_id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, evento_id, creato_il)
    VALUES (?, ?, ?, 'turno', ?, ?, ?, NULL, ?)`);
  const adesso = new Date().toISOString();
  // un oggetto che il catalogo non ha più non si consuma: nessuna riga orfana nasce da qui
  for (const o of consuma) if (nelCatalogo.get(o.oggetto)) inserisci.run(p, o.oggetto, o.quantita, attivita, ordine, esito, adesso);
}

/** Togliendo il turno `ordine` dell'attività: le copie che aveva consumato tornano. Va chiamata dentro la transazione del turno. */
export function togliConsumiDelTurno(p: number, attivita: string, ordine: number): void {
  if (!conRegistroConsumi()) return;
  prepared(`DELETE FROM utente.${TABELLA} WHERE partita_id = ? AND fonte = 'turno' AND attivita_chiave = ? AND ordine = ?`).run(p, attivita, ordine);
}

/** Un ciclo di Isolamento ha bruciato una copia dell'incenso `catalogo` (evento dello storico `eventoId`). Dentro la transazione dell'Isolamento. */
export function registraConsumoIsolamento(p: number, catalogo: string, eventoId: number): void {
  if (!conRegistroConsumi()) return;
  prepared(`INSERT INTO utente.${TABELLA} (partita_id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, evento_id, creato_il)
    VALUES (?, ?, 1, 'isolamento', NULL, NULL, NULL, ?, ?)`).run(p, catalogo, eventoId, new Date().toISOString());
}

/** Le copie dell'oggetto consumate nella partita (turni e Isolamento; i regali hanno il loro registro). */
export function copieConsumate(p: number, catalogo: string): number {
  if (!conRegistroConsumi()) return 0;
  return prepared(`SELECT COALESCE(SUM(quantita), 0) FROM utente.${TABELLA} WHERE partita_id = ? AND catalogo_chiave = ?`).pluck().get(p, catalogo) as number;
}

/** I consumi della partita, per la pagina degli oggetti: una riga per consumo, in ordine di registrazione. */
export function consumiDellaPartita(p: number): Array<{ id: number; catalogo: string; quantita: number; fonte: 'turno' | 'isolamento'; attivita: string | null; ordine: number | null; esito: string | null; creatoIl: string }> {
  if (!conRegistroConsumi()) return [];
  return (prepared(`SELECT id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, creato_il FROM utente.${TABELLA} WHERE partita_id = ? ORDER BY creato_il, id`).all(p) as
    Array<{ id: number; catalogo_chiave: string; quantita: number; fonte: 'turno' | 'isolamento'; attivita_chiave: string | null; ordine: number | null; esito_chiave: string | null; creato_il: string }>)
    .map((r) => ({ id: r.id, catalogo: r.catalogo_chiave, quantita: r.quantita, fonte: r.fonte, attivita: r.attivita_chiave, ordine: r.ordine, esito: r.esito_chiave, creatoIl: r.creato_il }));
}

/**
 * Annulla l'uso di un incenso bruciato in un Isolamento (rilievo della revisione: l'uso non si poteva togliere). La copia torna fra quelle
 * possedute; le statistiche e la skill che l'Isolamento ha dato restano, come quando si elimina la sua voce dallo storico («la modifica
 * registrata resta valida»): si correggono nella Persona. Solo le righe dell'Isolamento: l'uso di un turno si toglie togliendo il turno, che
 * è la sua sola fonte. 404 se la riga non c'è (o è di un'altra partita), 409 se è di un turno.
 */
export function annullaConsumoIsolamento(p: number, id: number): void {
  if (!conRegistroConsumi()) throw httpErrors.notFound('consumo-non-trovato', 'Nessun uso registrato da annullare.');
  const riga = prepared(`SELECT fonte FROM utente.${TABELLA} WHERE id = ? AND partita_id = ?`).get(id, p) as { fonte: string } | undefined;
  if (!riga) throw httpErrors.notFound('consumo-non-trovato', `L'uso ${id} non esiste in questa partita.`);
  if (riga.fonte !== 'isolamento') throw httpErrors.conflict('consumo-di-un-turno', 'Questo uso viene da un turno di un’attività: si annulla togliendo il turno (Partita → Progressi o il Diario).');
  getDb().transaction(() => {
    prepared(`DELETE FROM utente.${TABELLA} WHERE id = ? AND partita_id = ?`).run(id, p);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), p);
  })();
}
