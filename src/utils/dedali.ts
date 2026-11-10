// ============================================================
// dedali — il conteggio di un dedalo dei Memento ricalcolato nella pagina, con la regola del server (099)
// ============================================================
//
// Dopo un gesto (timbri del dedalo, stato di una Richiesta, voce segnata) la scheda si aggiorna subito, senza aspettare la rilettura:
// le aree del dedalo, il dedalo e l'anello del Memento si ricalcolano qui con `shared/dedali.ts`, la stessa regola che usa il
// server. Così il numero che si vede non può dire una cosa diversa da quello che il server rimanderà.
// ============================================================

import { contoAreaDedalo, contoDedalo } from '../../shared/dedali';
import { percentualeSegnati } from '../../shared/avanzamento';
import type { AreaDungeonDto, DungeonDettaglioDto } from '../types';

/** Il nome di un dedalo senza «Dedalo di»: nel binario, nella fila e nella griglia del telefono basta il nome proprio (progetto approvato:
 *  «2 Aiyatsbus 31%»). */
export const nomeBreveDedalo = (nome: string): string => nome.replace(/^Dedalo di /i, '');

/** L10-03: la percentuale di un dedalo, elementi fatti su elementi in tutto (timbri, Richieste e Trama), con la regola unica di
 *  `shared/avanzamento.ts`: la stessa della carta del dedalo in «Luoghi della guida». Null senza partita o senza elementi. */
export function percentualeDedalo(a: AreaDungeonDto): number | null {
  const o = a.dedalo?.obiettivi;
  return o && o.fatti !== null && o.totale > 0 ? percentualeSegnati(o.fatti, o.totale) : null;
}

/** Il dedalo di `area` con elementi e completamento di ogni sua area ricalcolati dalle voci (`area.punti`) e dalle Richieste, e il dedalo
 *  con i suoi timbri (L10-02: contano una volta sola, nel dedalo). */
export function ricalcolaDedalo(area: AreaDungeonDto, conPartita: boolean): AreaDungeonDto {
  if (!area.dedalo) return area;
  const aree = area.dedalo.aree.map((a) => {
    const conto = contoAreaDedalo({ voci: area.punti.filter((p) => p.areaDedalo === a.chiave), richieste: a.richieste }, conPartita);
    return { ...a, elementi: { totale: conto.totale, fatti: conto.fatti }, completata: conto.completata };
  });
  const conto = contoDedalo(aree, area.dedalo.timbri, conPartita);
  return { ...area, dedalo: { ...area.dedalo, aree, obiettivi: { totale: conto.totale, fatti: conto.fatti }, completato: conto.completato } };
}

/** Il conto di un dedalo per elemento (pagina per formato, 2026-10-12): i timbri del dedalo (L10-02; null se la guida non ne dà il
 *  numero), Richieste fatte, Trama segnata, Persona catturate (registrate nel compendio). */
export function contiDelDedalo(d: AreaDungeonDto & { dedalo: NonNullable<AreaDungeonDto['dedalo']> }, catturate: ReadonlySet<number> | null) {
  const aree = d.dedalo.aree;
  const t = d.dedalo.timbri;
  const trama = d.punti.filter((p) => p.tipo !== 'persona' && p.areaDedalo !== null);
  const persone = d.punti.filter((p) => p.tipo === 'persona');
  return {
    timbri: t ? { fatti: Math.min(t.raccolti ?? 0, t.totale), totale: t.totale } : null,
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

/** L10-02: la somma dei timbri dei dedali che ne hanno un totale (i dedali senza numero non contano), da mettere accanto ai timbri che
 *  la guida dichiara per tutti i Memento; null se nessun dedalo ha un totale. */
export function sommaTimbriDeiDedali(aree: ReadonlyArray<AreaDungeonDto>): number | null {
  const conTotale = aree.filter((a) => a.dedalo?.timbri);
  return conTotale.length ? conTotale.reduce((s, a) => s + (a.dedalo?.timbri?.totale ?? 0), 0) : null;
}

/** L'anello del Memento dai suoi dedali: elementi fatti e dedali completati (con la partita). */
export function raccoltaDeiDedali(aree: ReadonlyArray<AreaDungeonDto>, raccolta: DungeonDettaglioDto['raccolta']): DungeonDettaglioDto['raccolta'] {
  if (raccolta.presi === null) return raccolta;
  return { ...raccolta, presi: aree.reduce((s, a) => s + (a.dedalo?.obiettivi.fatti ?? 0), 0), mappeComplete: aree.filter((a) => a.dedalo?.completato).length };
}
