// ============================================================
// sbloccoLuoghi — le condizioni di sblocco di un luogo (L5, L6)
// ============================================================
//
// Modulo foglia (solo database e condivisi): lo usano `luoghiService` (presenza del luogo) e `negoziService` (presenza della sede di un
// negozio), che altrimenti si richiamerebbero in cerchio.
// L6 (§1, §4.2): lo sblocco è la condizione della riga (`luogo.condizioni_json`) **oppure** un invito di un Confidente che apre il luogo
// (`confidente_invito`). Le regole `dati_guida.sblocco-luoghi` non si leggono più: la migrazione 118 le ha copiate nelle righe senza
// condizione (erano già strutturate, l'esito non cambia).
// ============================================================

import { conGliInviti, invitiCheAprono, tuttiGliInviti, type RigaInvito } from './condizioni/condizioneEffettiva.js';
import { leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';

/** Gli inviti dei Confidenti, letti una volta per chi valuta molti luoghi (un elenco, una mappa). */
export function invitiPerSblocco(): RigaInvito[] {
  return tuttiGliInviti();
}

/** Le condizioni di sblocco di un luogo: quelle della riga, in OR con gli inviti che lo aprono (`inviti` letti da chi chiama; senza, si
 *  leggono qui). */
export function condizioniDiSblocco(r: { chiave: string; condizioni_json: string | null }, inviti: readonly RigaInvito[] = tuttiGliInviti()): RequisitoSpillo[] {
  return conGliInviti(leggiCondizioniSalvate(r.condizioni_json), invitiCheAprono('luogo', r.chiave, inviti));
}
