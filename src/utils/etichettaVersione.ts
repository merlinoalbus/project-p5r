import type { MappaRiassuntoDto } from '../types';

/** Che cosa mostra questa versione del luogo: l'estensione della zona che rivela o
 * l'inquadratura che ne incornicia. L'ordinale resta solo dove la differenza fra le versioni non
 * è stata dimostrata sulle immagini. */
export function etichettaVersione(mappa: MappaRiassuntoDto, indice: number, totale: number): string {
  return mappa.gruppoImmagini?.etichetta ?? `Immagine ${indice} di ${totale}`;
}
