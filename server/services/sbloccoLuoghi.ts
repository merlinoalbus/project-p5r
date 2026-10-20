// ============================================================
// sbloccoLuoghi — le condizioni di sblocco di un luogo (L5): quelle della riga, o il ripiego della guida
// ============================================================
//
// Modulo foglia (solo database e condivisi): lo usano `luoghiService` (presenza del luogo) e `negoziService` (presenza della sede di un
// negozio), che altrimenti si richiamerebbero in cerchio.
// ============================================================

import { datiGuida } from './datiGuida.js';
import { leggiCondizioniSalvate, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';

/** Le regole di presenza scritte a mano in `sblocco-luoghi` della guida: ripiego per le righe senza `condizioni_json`. */
export function regoleSbloccoLuoghi(): Map<string, RequisitoSpillo[]> {
  const dati = datiGuida<{ luoghi?: Array<{ chiave: string; condizioni: unknown }> }>('sblocco-luoghi');
  const out = new Map<string, RequisitoSpillo[]>();
  for (const l of dati?.luoghi ?? []) {
    const condizioni = normalizzaCondizioniSpillo(l.condizioni);
    if (condizioni.length > 0) out.set(l.chiave, condizioni);
  }
  return out;
}

/** Le condizioni di sblocco di un luogo: quelle della riga, o il ripiego della guida. */
export function condizioniDiSblocco(r: { chiave: string; condizioni_json: string | null }, regole: Map<string, RequisitoSpillo[]>): RequisitoSpillo[] {
  const dellaRiga = leggiCondizioniSalvate(r.condizioni_json);
  return dellaRiga.length ? dellaRiga : (regole.get(r.chiave) ?? []);
}
