// ============================================================
// condizioniSpillo (client) — elenchi della Guida usati dal costruttore delle condizioni e nomi per le descrizioni (fuori dai componenti
// per il fast refresh)
// ============================================================

import type { ConfidenteDto, DungeonRiassuntoDto, QuartiereRiassuntoDto, RichiestaDto } from '../types';
import type { NomiCondizioni } from '../../shared/condizioniSpillo';

export interface ElenchiCondizioni {
  confidenti: ConfidenteDto[];
  quartieri: QuartiereRiassuntoDto[];
  richieste: RichiestaDto[];
  dungeon: DungeonRiassuntoDto[];
}

export const ELENCHI_VUOTI: ElenchiCondizioni = { confidenti: [], quartieri: [], richieste: [], dungeon: [] };

/** Chiave → nome per Confidenti, quartieri, richieste e Palazzi, da mostrare nelle condizioni. */
export function nomiDaElenchi(e: ElenchiCondizioni): NomiCondizioni {
  return {
    confidenti: Object.fromEntries(e.confidenti.map((c) => [c.chiave, c.nome])),
    quartieri: Object.fromEntries(e.quartieri.map((q) => [q.chiave, q.nome])),
    richieste: Object.fromEntries(e.richieste.map((r) => [r.chiave, r.nome])),
    dungeon: Object.fromEntries(e.dungeon.map((d) => [d.chiave, d.nome])),
  };
}
