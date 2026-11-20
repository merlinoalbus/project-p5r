// ============================================================
// consumiOggettiService — le copie degli oggetti posseduti che la partita USA (Ondata 5, lotto F-bis; decisioni 21 e 22 dell'utente)
// ============================================================
//
// Decisione 21, precisazione: gli oggetti con effetti che incidono su ciò che l'app gestisce si modellano con i tipi dell'app. Un oggetto che si
// usa esce dalle copie possedute: il concime della pianta (Gentilezza), i materiali della fabbricazione (Perizia, decisione 22), l'incenso
// dell'Isolamento (statistiche della Persona). Un solo registro, `utente.consumo_oggetto_partita`:
//   - un turno registrato con un esito che dichiara `consuma` (`attivita.esiti_json`, `shared/esitiAttivita.ts`) scrive una riga per oggetto
//     (registrando il turno, dentro la sua transazione) e la toglie togliendolo: lo stesso percorso degli oggetti dati
//     (`oggettiDegliEsitiService`) e del trofeo (`trofeiDegliEsitiService`);
//   - un ciclo di Isolamento con un incenso del catalogo scrive una riga con l'evento dello storico; quella riga si annulla dagli «Oggetti
//     ottenuti» (`annullaConsumoIsolamento`), perché l'Isolamento non ha un gesto che lo tolga;
//   - 2026-10-28: una voce spuntata con l'effetto «oggetto restituito, venduto o usato» scrive una riga per effetto (`fonte` «voce», con il
//     modo, il ricavo e il giorno della voce: `scriviUscitaDaVoce`) e la toglie togliendo la spunta. Lei sì controlla le copie (mai sotto zero:
//     `effettiDiStatoService`), perché restituire, vendere o usare ciò che non si possiede non ha senso. Solo «restituito» rende di nuovo
//     disponibile il prestito (`copieRestituite`); solo «venduto» con il ricavo muove yen; «usato» esce e basta.
// Il consumo non chiede di avere le copie: chi gioca le ha prese in un modo che l'app può non conoscere (un'aggiunta a mano, una partita
// iniziata prima del registro). Le copie rimaste si leggono in `copieOggetti` (mai sotto zero), e la scelta dell'esito le mostra.
// Nessuno yen si muove da qui: il prezzo l'oggetto lo aveva già quando si è comprato.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { nomeOggettoCatalogo, oggettiDelTurnoVerificati } from './oggettiDegliEsitiService.js';
import type { ModoUscitaOggetto } from '../../shared/effettiVoce.js';

const TABELLA = 'consumo_oggetto_partita';

/**
 * Registrando il turno `ordine` dell'attività con l'esito `esito`: gli oggetti che l'esito consuma escono dalle copie possedute. Va chiamata
 * dentro la transazione del turno. Le righe rimaste da un turno con lo stesso numero (tolto per un'altra strada) si tolgono prima.
 * 2026-10-27: con la quantità della voce (le creazioni) e la versione con il bonus (`oggettiDelTurno`): ritorna che cosa ha consumato, per la ricevuta.
 */
export function segnaConsumiDelTurno(p: number, attivita: string, ordine: number, esito: string | null | undefined, quantita?: number): Array<{ nome: string; quantita: number }> {
  togliConsumiDelTurno(p, attivita, ordine);
  if (!esito) return [];
  const consuma = oggettiDelTurnoVerificati(attivita, esito, quantita, 'consumati');
  if (!consuma.length) return [];
  const nelCatalogo = prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?');
  const inserisci = prepared(`INSERT INTO utente.${TABELLA} (partita_id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, evento_id, creato_il)
    VALUES (?, ?, ?, 'turno', ?, ?, ?, NULL, ?)`);
  const adesso = new Date().toISOString();
  // un oggetto che il catalogo non ha più non si consuma: nessuna riga orfana nasce da qui
  const scritti: Array<{ nome: string; quantita: number }> = [];
  for (const o of consuma) if (nelCatalogo.get(o.oggetto)) { inserisci.run(p, o.oggetto, o.quantita, attivita, ordine, esito, adesso); scritti.push({ nome: nomeOggettoCatalogo(o.oggetto), quantita: o.quantita }); }
  return scritti;
}

/** Togliendo il turno `ordine` dell'attività: le copie che aveva consumato tornano. Va chiamata dentro la transazione del turno. */
export function togliConsumiDelTurno(p: number, attivita: string, ordine: number): void {
  prepared(`DELETE FROM utente.${TABELLA} WHERE partita_id = ? AND fonte = 'turno' AND attivita_chiave = ? AND ordine = ?`).run(p, attivita, ordine);
}

/** Un ciclo di Isolamento ha bruciato una copia dell'incenso `catalogo` (evento dello storico `eventoId`). Dentro la transazione dell'Isolamento. */
export function registraConsumoIsolamento(p: number, catalogo: string, eventoId: number): void {
  prepared(`INSERT INTO utente.${TABELLA} (partita_id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, evento_id, creato_il)
    VALUES (?, ?, 1, 'isolamento', NULL, NULL, NULL, ?, ?)`).run(p, catalogo, eventoId, new Date().toISOString());
}

/** Le copie dell'oggetto consumate nella partita (turni e Isolamento; i regali hanno il loro registro). */
export function copieConsumate(p: number, catalogo: string): number {
  return prepared(`SELECT COALESCE(SUM(quantita), 0) FROM utente.${TABELLA} WHERE partita_id = ? AND catalogo_chiave = ?`).pluck().get(p, catalogo) as number;
}

/** Una riga di uscita scritta da una voce: l'oggetto restituito, venduto o usato dall'effetto della voce. */
export interface UscitaDaVoce { catalogo: string; quantita: number; modo: ModoUscitaOggetto; prezzo: number | null; giorno: string | null; creatoIl: string }

/** L'uscita che l'effetto `effettoUid` della voce ha scritto nella partita, o null. Sola lettura. */
export function uscitaDellaVoce(p: number, voceUid: string, effettoUid: string): UscitaDaVoce | null {
  const r =prepared(`SELECT catalogo_chiave, quantita, modo, prezzo, giorno, creato_il FROM utente.${TABELLA} WHERE partita_id = ? AND fonte = 'voce' AND voce_uid = ? AND effetto_uid = ?`)
    .get(p, voceUid, effettoUid) as { catalogo_chiave: string; quantita: number; modo: ModoUscitaOggetto; prezzo: number | null; giorno: string | null; creato_il: string } | undefined;
  return r ? { catalogo: r.catalogo_chiave, quantita: r.quantita, modo: r.modo, prezzo: r.prezzo, giorno: r.giorno, creatoIl: r.creato_il } : null;
}

/**
 * 2026-10-28 (effetto «oggetto restituito, venduto o usato» della voce): scrive l'uscita dell'effetto della voce, al posto di quella che aveva (una riga
 * per effetto). Dentro la transazione di chi la chiama (la spunta, il salvataggio della guida, l'approvazione dell'elenco del passato). Le copie le
 * controlla chi chiama: qui si scrive soltanto.
 */
export function scriviUscitaDaVoce(p: number, voceUid: string, effettoUid: string, u: { catalogo: string; quantita: number; modo: ModoUscitaOggetto; prezzo?: number; giorno: string | null }): void {
  togliUscitaDaVoce(p, voceUid, effettoUid);
  prepared(`INSERT INTO utente.${TABELLA} (partita_id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, evento_id, creato_il, voce_uid, effetto_uid, modo, prezzo, giorno)
    VALUES (?, ?, ?, 'voce', NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?)`).run(p, u.catalogo, u.quantita, new Date().toISOString(), voceUid, effettoUid, u.modo, u.modo === 'venduto' ? u.prezzo ?? null : null, u.giorno);
}

/** Toglie l'uscita dell'effetto della voce (la spunta tolta, l'effetto cambiato o tolto nella guida): le copie tornano. Restituisce se c'era. */
export function togliUscitaDaVoce(p: number, voceUid: string, effettoUid: string): boolean {
  return prepared(`DELETE FROM utente.${TABELLA} WHERE partita_id = ? AND fonte = 'voce' AND voce_uid = ? AND effetto_uid = ?`).run(p, voceUid, effettoUid).changes > 0;
}

/**
 * Le copie dell'oggetto del catalogo restituite dalle voci nella partita, per la regola «restituzione» del rifornimento (`scorteService`): un
 * prestito restituito torna disponibile. `finoA` dice quali giorni contano (quelli fino alla data della partita: decide chi chiama).
 */
export function copieRestituite(p: number, catalogo: string, finoA: (giorno: string | null) => boolean): number {
  const righe =prepared(`SELECT quantita, giorno FROM utente.${TABELLA} WHERE partita_id = ? AND fonte = 'voce' AND modo = 'restituito' AND catalogo_chiave = ?`).all(p, catalogo) as Array<{ quantita: number; giorno: string | null }>;
  return righe.filter((r) => finoA(r.giorno)).reduce((n, r) => n + r.quantita, 0);
}

/** I consumi della partita, per la pagina degli oggetti: una riga per consumo, in ordine di registrazione. 2026-10-28: anche le uscite dalle
 *  voci (`fonte` «voce», con il modo e la voce), che si annullano togliendo la spunta. */
export function consumiDellaPartita(p: number): Array<{ id: number; catalogo: string; quantita: number; fonte: 'turno' | 'isolamento' | 'voce'; attivita: string | null; ordine: number | null; esito: string | null; creatoIl: string;
  voceUid: string | null; modo: ModoUscitaOggetto | null }> {
  return (prepared(`SELECT id, catalogo_chiave, quantita, fonte, attivita_chiave, ordine, esito_chiave, creato_il, voce_uid, modo FROM utente.${TABELLA} WHERE partita_id = ? ORDER BY creato_il, id`).all(p) as
    Array<{ id: number; catalogo_chiave: string; quantita: number; fonte: 'turno' | 'isolamento' | 'voce'; attivita_chiave: string | null; ordine: number | null; esito_chiave: string | null; creato_il: string; voce_uid: string | null; modo: ModoUscitaOggetto | null }>)
    .map((r) => ({ id: r.id, catalogo: r.catalogo_chiave, quantita: r.quantita, fonte: r.fonte, attivita: r.attivita_chiave, ordine: r.ordine, esito: r.esito_chiave, creatoIl: r.creato_il, voceUid: r.voce_uid, modo: r.modo }));
}

/**
 * Annulla l'uso di un incenso bruciato in un Isolamento (rilievo della revisione: l'uso non si poteva togliere). La copia torna fra quelle
 * possedute; le statistiche e la skill che l'Isolamento ha dato restano, come quando si elimina la sua voce dallo storico («la modifica
 * registrata resta valida»): si correggono nella Persona. Solo le righe dell'Isolamento: l'uso di un turno si toglie togliendo il turno, che
 * è la sua sola fonte. 404 se la riga non c'è (o è di un'altra partita), 409 se è di un turno.
 */
export function annullaConsumoIsolamento(p: number, id: number): void {
  const riga = prepared(`SELECT fonte FROM utente.${TABELLA} WHERE id = ? AND partita_id = ?`).get(id, p) as { fonte: string } | undefined;
  if (!riga) throw httpErrors.notFound('consumo-non-trovato', `L'uso ${id} non esiste in questa partita.`);
  if (riga.fonte === 'voce') throw httpErrors.conflict('consumo-di-una-voce', 'Questa uscita viene da una voce del Diario: si annulla togliendo la spunta della voce.');
  if (riga.fonte !== 'isolamento') throw httpErrors.conflict('consumo-di-un-turno', 'Questo uso viene da un turno di un’attività: si annulla togliendo il turno (Partita → Progressi o il Diario).');
  getDb().transaction(() => {
    prepared(`DELETE FROM utente.${TABELLA} WHERE id = ? AND partita_id = ?`).run(id, p);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), p);
  })();
}
