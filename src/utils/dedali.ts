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

/** Il conto di un dedalo per elemento (pagina per formato, 2026-10-12): timbri delle aree con un totale (e quante aree non lo
 *  hanno), Richieste fatte, Trama segnata, Persona catturate (registrate nel compendio). */
export function contiDelDedalo(d: AreaDungeonDto & { dedalo: NonNullable<AreaDungeonDto['dedalo']> }, catturate: ReadonlySet<number> | null) {
  const aree = d.dedalo.aree;
  const conTimbri = aree.filter((a) => a.timbri);
  const trama = d.punti.filter((p) => p.tipo !== 'persona' && p.areaDedalo !== null);
  const persone = d.punti.filter((p) => p.tipo === 'persona');
  return {
    timbri: { fatti: conTimbri.reduce((s, a) => s + (a.timbri?.raccolti ?? 0), 0), totale: conTimbri.reduce((s, a) => s + (a.timbri?.totale ?? 0), 0), daImpostare: aree.length - conTimbri.length },
    richieste: { fatti: aree.reduce((s, a) => s + a.richieste.filter((r) => r.stato === 'completata').length, 0), totale: aree.reduce((s, a) => s + a.richieste.length, 0) },
    trama: { fatti: trama.filter((p) => !!p.stato).length, totale: trama.length },
    persona: { fatti: persone.filter((p) => !!p.persona && !!catturate?.has(p.persona.id)).length, totale: persone.length },
  };
}

/** I timbri presi dopo un tocco sul timbro `k` (da 1): l'ultimo preso torna indietro di uno, gli altri portano a `k` (progetto
 *  approvato: «Tocchi il terzo e risultano presi tre; tocchi l'ultimo preso e torna indietro di uno»). */
export function timbriDopoIlTocco(k: number, raccolti: number): number {
  return k === raccolti ? k - 1 : k;
}

/** L'anello del Memento dai suoi dedali: elementi fatti e dedali completati (con la partita). */
export function raccoltaDeiDedali(aree: ReadonlyArray<AreaDungeonDto>, raccolta: DungeonDettaglioDto['raccolta']): DungeonDettaglioDto['raccolta'] {
  if (raccolta.presi === null) return raccolta;
  return { ...raccolta, presi: aree.reduce((s, a) => s + (a.dedalo?.obiettivi.fatti ?? 0), 0), mappeComplete: aree.filter((a) => a.dedalo?.completato).length };
}
