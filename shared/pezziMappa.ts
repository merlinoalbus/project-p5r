// ============================================================
// pezziMappa (condiviso) — la geometria dei pezzi delle planimetrie (102), uguale per server e visore
// ============================================================
//
// Un pezzo è una zona rettangolare dell'immagine (`sorgente`, in pixel) posata altrove (`posizione`: l'angolo in alto a sinistra
// del suo ingombro), specchiata (prima) e ruotata di 90° in 90° in senso orario attorno al centro (poi).
// ============================================================

import type { RotazionePezzo } from './types.js';

/** L'ingombro del pezzo posato: a 90° e 270° larghezza e altezza si scambiano. */
export function ingombroPezzo(larghezza: number, altezza: number, rotazione: RotazionePezzo): { larghezza: number; altezza: number } {
  return rotazione === 90 || rotazione === 270 ? { larghezza: altezza, altezza: larghezza } : { larghezza, altezza };
}
