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
import { prepared } from '../db/dbService.js';

/** Gli inviti dei Confidenti, letti una volta per chi valuta molti luoghi (un elenco, una mappa). */
export function invitiPerSblocco(): RigaInvito[] {
  return tuttiGliInviti();
}

/** Presenza fisica: quartiere AND (condizioni proprie OR inviti). `luogo{}` conserva invece lo sblocco intrinseco usato dai quartieri. */
export function condizioniDiSblocco(r: { chiave: string; condizioni_json: string | null; quartiere_chiave?: string | null }, inviti: readonly RigaInvito[] = tuttiGliInviti()): RequisitoSpillo[] {
  const quartiere = r.quartiere_chiave ?? (prepared('SELECT quartiere_chiave FROM luogo WHERE chiave = ?').get(r.chiave) as { quartiere_chiave: string | null } | undefined)?.quartiere_chiave;
  // La presenza fisica richiede il quartiere. Il riferimento intrinseco `luogo` nel valutatore resta separato:
  // alcuni quartieri si aprono proprio grazie al loro ritrovo e includerli lì creerebbe un ciclo.
  return [...(quartiere ? [{ tipo: 'quartiere' as const, quartiere }] : []),
    ...conGliInviti(leggiCondizioniSalvate(r.condizioni_json), invitiCheAprono('luogo', r.chiave, inviti))];
}
