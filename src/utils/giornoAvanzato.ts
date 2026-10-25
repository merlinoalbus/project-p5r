// ============================================================
// giornoAvanzato — dopo una spunta o una decisione: la partita è passata alla sera o al giorno dopo
// ============================================================
//
// Il server lo decide (`avanzaSeFasciaCompleta`, decisione A1 del 2026-10-25) e lo dice nella risposta del gesto che l'ha fatto scattare: la
// spunta (Diario, Home, Guida) oppure la decisione che ha chiuso l'ultima proposta aperta. Qui la partita dello store si allinea — e con
// lei «Oggi», mappe, negozi e la richiesta del meteo del giorno nuovo (`MeteoAlCambioGiorno`) — e un avviso spiega che cosa è successo.
// Se nel giorno (o nella sera) restano decisioni aperte, l'avviso lo dice e porta al giorno per chiuderle.
// ============================================================

import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import { dataGiocoConArticolo } from './dateGioco';
import type { AvanzamentoGiornataDto } from '../types';

/** Il pezzo di avviso sulle decisioni ancora aperte («Restano 2 decisioni aperte»), o stringa vuota. */
const restano = (n: number | undefined): string => (n && n > 0 ? ` Resta ${n === 1 ? '1 decisione aperta' : `${n} decisioni aperte`}: decidila dal giorno.` : '');

/** Da chiamare con la risposta di ogni spunta e di ogni decisione sulle proposte; non fa niente se la partita non è avanzata. */
export function seGiornoAvanzato(esito: AvanzamentoGiornataDto): void {
  const g = esito.giornoAvanzato;
  const f = esito.fasciaAvanzata;
  if (g) {
    usePartitaStore.getState().aggiornaLocale(g.partita);
    notifica(g.decisioniAperte ? 'warning' : 'success',
      `Giornata ${dataGiocoConArticolo(g.da, 'di')} completata: la partita passa ${dataGiocoConArticolo(g.a, 'a')}, di giorno.${restano(g.decisioniAperte)}`,
      g.decisioniAperte ? 0 : 6000, g.decisioniAperte ? { collegamento: { etichetta: `Vai ${dataGiocoConArticolo(g.da, 'a')}`, verso: `/guida/percorso/${g.da}` } } : undefined);
    return;
  }
  if (f) {
    usePartitaStore.getState().aggiornaLocale(f.partita);
    notifica(f.decisioniAperte ? 'warning' : 'success',
      `Attività di giorno ${dataGiocoConArticolo(f.giorno, 'di')} completate: la partita passa alla sera.${restano(f.decisioniAperte)}`,
      f.decisioniAperte ? 0 : 6000, f.decisioniAperte ? { collegamento: { etichetta: `Vai ${dataGiocoConArticolo(f.giorno, 'a')}`, verso: `/guida/percorso/${f.giorno}` } } : undefined);
  }
}
