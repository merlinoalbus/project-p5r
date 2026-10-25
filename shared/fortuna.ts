import type { DoteChiave } from './doti.js';

/**
 * La Fortuna (lettura della buona sorte di Chihaya) come stato della partita: la Dote scelta e il giorno in cui è stata accesa.
 * Vale per il resto di quel giorno; al cambio di giorno si spegne da sola.
 */
export interface FortunaPartitaDto {
  attiva: boolean;
  /** La Dote scelta; con la Fortuna spenta dal cambio di giorno resta quella dell'ultima accensione, per ricordarla. */
  dote: DoteChiave | null;
  /** Il giorno di gioco ('MM-GG') in cui è stata accesa; null se la partita non ha una data. */
  giorno: string | null;
  /** C'era una Fortuna accesa un altro giorno: ormai spenta. */
  scaduta: boolean;
}

/** L'unico lettore del ×1,5 della Fortuna per Doti, voci del Diario e Aojiru: arrotondato per difetto. La Perizia della pesca NON lo usa:
 *  legge la propria regola fotografata nel gesto (punti base + `bonusFortuna`, modificabili nell'editor), che col valore di fabbrica
 *  (2 + 1) dà lo stesso risultato; vedi `pescaLetture` e la decisione del 2026-10-25 in docs/DECISIONI.md. */
export const moltiplicaFortuna = (punti: number): number => Math.floor(punti * 1.5);
