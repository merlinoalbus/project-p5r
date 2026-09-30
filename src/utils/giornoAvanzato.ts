// ============================================================
// giornoAvanzato — dopo una spunta: se era l'ultima attività del giorno, la partita è passata al giorno dopo
// ============================================================
//
// Il server lo decide (`avanzaSeGiornoCompleto`) e lo dice nella risposta della spunta. Qui la partita dello store si
// allinea — e con lei «Oggi», mappe, negozi e la richiesta del meteo del giorno nuovo (`MeteoAlCambioGiorno`) — e un
// avviso spiega che cosa è successo.
// ============================================================

import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { dataGiocoConArticolo } from './dateGioco';
import type { GiornoAvanzatoDto } from '../types';

/** Da chiamare con la risposta di ogni spunta; non fa niente se il giorno non è cambiato. */
export function seGiornoAvanzato(esito: { giornoAvanzato?: GiornoAvanzatoDto }): void {
  const g = esito.giornoAvanzato;
  if (!g) return;
  usePartitaStore.getState().aggiornaLocale(g.partita);
  notifica('success', `Giornata ${dataGiocoConArticolo(g.da, 'di')} completata: la partita passa ${dataGiocoConArticolo(g.a, 'a')}, di giorno.`, 6000);
}
