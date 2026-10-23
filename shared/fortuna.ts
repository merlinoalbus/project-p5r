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

/** L'unico lettore del ×1,5 della Fortuna, per Doti, voci del Diario, Aojiru e pesca: arrotondato per difetto. */
export const moltiplicaFortuna = (punti: number): number => Math.floor(punti * 1.5);
