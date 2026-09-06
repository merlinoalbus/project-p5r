import type { MappaRiassuntoDto } from '../types';

/** Che cosa mostra questa versione del luogo: l'estensione della zona che rivela, l'inquadratura
 * che ne incornicia, o la forma dell'immagine quando non rappresenta una zona nota. È l'unica
 * funzione che produce questa etichetta: indice, albero, selettori dell'editor, scelta della
 * destinazione e ingresso del quartiere devono chiamare tutti questa, così lo stesso luogo non
 * viene presentato in due modi diversi a seconda della schermata.
 *
 * `indice` e `totale` servono solo quando l'etichetta non c'è: allora resta l'ordinale, che è
 * l'ultima risorsa e non descrive nulla. */
export function etichettaVersione(mappa: MappaRiassuntoDto, indice?: number, totale?: number): string {
  const etichetta = mappa.gruppoImmagini?.etichetta;
  if (etichetta) return etichetta;
  const ordine = indice ?? (mappa.gruppoImmagini ? mappa.gruppoImmagini.ordine + 1 : 1);
  const quante = totale ?? mappa.immagineCollezione?.totale;
  return quante ? `Immagine ${ordine} di ${quante}` : `Immagine ${ordine}`;
}

/** Nome del luogo seguito da ciò che la versione mostra: «Covo dei Ladri — settore d'ingresso». */
export function nomeConVersione(mappa: MappaRiassuntoDto, nomeLuogo: string): string {
  return mappa.gruppoImmagini ? `${nomeLuogo} — ${etichettaVersione(mappa)}` : nomeLuogo;
}
