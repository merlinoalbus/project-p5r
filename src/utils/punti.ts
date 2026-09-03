// ============================================================
// Punti dei Confidenti — formato e anteprima (stessa formula del backend `puntiConfidente`)
// ============================================================

import type { BonusEsame } from '../types';

/** Formato italiano dei punti: interi senza decimali, altrimenti fino a due (7,5). */
export function formattaPunti(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}

/** Importo in yen nel formato italiano (es. "8.227 ¥"). */
export function formattaYen(n: number): string {
  return `${n.toLocaleString('it-IT')} ¥`;
}

/** Anteprima dei punti: base × (Persona dello stesso arcano 1,5) × (esami 1,5 | 1,2) × (invito 1,2), ai centesimi. */
export function anteprimaPunti(base: number, bonusArcano: boolean, esame: BonusEsame | null, invito: boolean): number {
  const molt = (bonusArcano ? 1.5 : 1) * (esame === 'primo' ? 1.5 : esame === 'top10' ? 1.2 : 1) * (invito ? 1.2 : 1);
  return Math.round(base * molt * 100) / 100;
}
