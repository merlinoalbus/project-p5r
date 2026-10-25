// ============================================================
// verificaPartita — 404 «partita-non-trovata» se la partita non esiste: il controllo comune a tutti i servizi per partita
// ============================================================
//
// Prima la stessa riga (query, codice e messaggio) era copiata in 26 punti di 21 file, con un messaggio diverso nella rotta
// delle condizioni (rilievi F18/K3 della verifica completa, 2026-10-03). Chi deve anche leggere la riga della partita la legge da
// sé e solleva lo stesso errore.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { getProprietario } from '../middleware/requestContext.js';

/**
 * Solleva 404 `partita-non-trovata` se la partita `partitaId` non esiste O NON È del proprietario della richiesta (L12, passo 3:
 * seconda difesa dopo il controllo centrale `middleware/appartenenzaPartita.ts`; "non è tua" e "non esiste" sono la stessa risposta).
 * Fuori da una richiesta e in preparazione il proprietario è l'unico, quello di tutte le partite esistenti: nessuna differenza.
 */
export function verificaPartita(partitaId: number): void {
  if (!prepared('SELECT 1 FROM partita WHERE id = ? AND proprietario = ?').get(partitaId, getProprietario())) throw partitaNonTrovata(partitaId);
}

/** L'errore della partita che non esiste, per chi legge già la riga. */
export function partitaNonTrovata(partitaId: number) {
  return httpErrors.notFound('partita-non-trovata', `La partita ${partitaId} non esiste.`);
}
