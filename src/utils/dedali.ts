// ============================================================
// dedali — il conteggio di un dedalo dei Memento ricalcolato nella pagina, con la regola del server (099)
// ============================================================
//
// Dopo un gesto (timbri, stato di una Richiesta, voce segnata) la scheda si aggiorna subito, senza aspettare la rilettura:
// le aree del dedalo, il dedalo e l'anello del Memento si ricalcolano qui con `shared/dedali.ts`, la stessa regola che usa il
// server. Così il numero che si vede non può dire una cosa diversa da quello che il server rimanderà.
// ============================================================

import { contoAreaDedalo, contoDedalo } from '../../shared/dedali';
import type { AreaDungeonDto, DungeonDettaglioDto } from '../types';

/** Il dedalo di `area` con elementi e completamento di ogni sua area ricalcolati dalle voci (`area.punti`), Richieste e timbri. */
export function ricalcolaDedalo(area: AreaDungeonDto, conPartita: boolean): AreaDungeonDto {
  if (!area.dedalo) return area;
  const aree = area.dedalo.aree.map((a) => {
    const conto = contoAreaDedalo({ voci: area.punti.filter((p) => p.areaDedalo === a.chiave), richieste: a.richieste, timbri: a.timbri }, conPartita);
    return { ...a, elementi: { totale: conto.totale, fatti: conto.fatti }, completata: conto.completata };
  });
  const conto = contoDedalo(aree, conPartita);
  return { ...area, dedalo: { ...area.dedalo, aree, obiettivi: { totale: conto.totale, fatti: conto.fatti }, completato: conto.completato } };
}

/** L'anello del Memento dai suoi dedali: elementi fatti e dedali completati (con la partita). */
export function raccoltaDeiDedali(aree: ReadonlyArray<AreaDungeonDto>, raccolta: DungeonDettaglioDto['raccolta']): DungeonDettaglioDto['raccolta'] {
  if (raccolta.presi === null) return raccolta;
  return { ...raccolta, presi: aree.reduce((s, a) => s + (a.dedalo?.obiettivi.fatti ?? 0), 0), mappeComplete: aree.filter((a) => a.dedalo?.completato).length };
}
