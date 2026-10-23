// ============================================================
// Punti dei Confidenti — formato e anteprima (la formula è quella del server: `shared/puntiConfidenti.ts`)
// ============================================================

import { puntiConfidente, type IngressoPuntiConfidente } from '../../shared/puntiConfidenti';

/** Formato italiano dei punti: interi senza decimali, altrimenti fino a due (7,5). */
export function formattaPunti(n: number): string {
  return n.toLocaleString('it-IT', { maximumFractionDigits: 2 });
}

/** Importo in yen nel formato italiano (es. "8.227 ¥"). */
export function formattaYen(n: number): string {
  return `${n.toLocaleString('it-IT')} ¥`;
}

/**
 * Anteprima dei punti: lo stesso modulo del server (base, ×1,5 arcano, esame solo per i sette Confidenti col piazzamento della partita, ×1,2 invito,
 * intero a ogni passaggio) e lo stesso controllo del rango: dove i punti non contano (`contaPunti === false`, un rango a evento) il server non somma, e
 * l'anteprima dice 0.
 */
export function anteprimaPunti(i: IngressoPuntiConfidente & { contaPunti?: boolean }): number {
  return i.contaPunti === false ? 0 : puntiConfidente(i);
}
