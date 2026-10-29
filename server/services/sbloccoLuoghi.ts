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

import { condizionePropriaArea, conGliInviti, invitiCheAprono, tuttiGliInviti, type RigaInvito } from './condizioni/condizioneEffettiva.js';
import { leggiCondizioniSalvate, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { prepared } from '../db/dbService.js';

/** Gli inviti dei Confidenti, letti una volta per chi valuta molti luoghi (un elenco, una mappa). */
export function invitiPerSblocco(): RigaInvito[] {
  return tuttiGliInviti();
}

/** Presenza fisica: quartiere AND condizione propria della sua Area (303) AND (condizioni proprie OR inviti). `luogo{}` conserva invece lo
 *  sblocco intrinseco usato dai quartieri. Quartiere e Area si leggono dalla riga se li porta, altrimenti dal luogo. */
export function condizioniDiSblocco(r: { chiave: string; condizioni_json: string | null; quartiere_chiave?: string | null; area_chiave?: string | null }, inviti: readonly RigaInvito[] = tuttiGliInviti()): RequisitoSpillo[] {
  const riga = r.quartiere_chiave == null || r.area_chiave === undefined
    ? prepared('SELECT quartiere_chiave, area_chiave FROM luogo WHERE chiave = ?').get(r.chiave) as { quartiere_chiave: string | null; area_chiave: string | null } | undefined
    : undefined;
  const quartiere = r.quartiere_chiave ?? riga?.quartiere_chiave;
  const area = r.area_chiave === undefined ? riga?.area_chiave : r.area_chiave;
  // La presenza fisica richiede il quartiere e, se l'Area del luogo ha una condizione propria (il Covo dal 5 maggio), anche quella:
  // la data sta una volta, sull'Area, e i suoi luoghi la ereditano. Il riferimento intrinseco `luogo` nel valutatore resta separato:
  // alcuni quartieri si aprono proprio grazie al loro ritrovo e includerli lì creerebbe un ciclo.
  return [...(quartiere ? [{ tipo: 'quartiere' as const, quartiere }] : []),
    ...condizionePropriaArea(area, inviti),
    ...conGliInviti(leggiCondizioniSalvate(r.condizioni_json), invitiCheAprono('luogo', r.chiave, inviti))];
}
