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

/** Dove si trovava la partita (data e fascia di gioco) quando è partito il gesto: serve a riconoscere un avanzamento che la risposta non porta. */
export interface PuntoPartita { dataGioco: string | null; fasciaGioco: string }

/** Il punto in cui lo store vede la partita, o null se non è nell'elenco a schermo. */
export function puntoPartitaNelloStore(partitaId: number): PuntoPartita | null {
  const p = usePartitaStore.getState().partite.find((x) => x.id === partitaId);
  return p ? { dataGioco: p.dataGioco, fasciaGioco: p.fasciaGioco } : null;
}

/**
 * Dopo una decisione sulle proposte, in ogni caso (risposta nuova o ricevuta ripetuta): se la risposta porta l'avanzamento lo applica; se non lo porta
 * (la risposta di un replay, dopo una risposta persa, è la sola ricevuta salvata, senza l'esito) rilegge la partita dal server e, se data o fascia
 * sono cambiate rispetto a prima del gesto, allinea lo store e lo dice. Così il client resta allineato qualunque strada abbia fatto la risposta.
 * Una rilettura fallita non rovescia la decisione, già registrata: l'avviso lo dice e lo store si allinea alla prossima lettura.
 */
export async function allineaDopoDecisione(partitaId: number, esito: AvanzamentoGiornataDto, prima: PuntoPartita | null): Promise<void> {
  if (esito.giornoAvanzato || esito.fasciaAvanzata) { seGiornoAvanzato(esito); return; }
  try {
    await usePartitaStore.getState().carica();
    // `carica` non lancia: un fallimento si legge nell'errore dello store
    if (usePartitaStore.getState().errore) throw new Error(usePartitaStore.getState().errore!);
    const dopo = puntoPartitaNelloStore(partitaId);
    if (!prima || !dopo || (prima.dataGioco === dopo.dataGioco && prima.fasciaGioco === dopo.fasciaGioco)) return;
    notifica('info', dopo.dataGioco && dopo.dataGioco !== prima.dataGioco
      ? `La partita è passata ${dataGiocoConArticolo(dopo.dataGioco, 'a')}: la giornata era completa.`
      : `La partita è passata alla sera${dopo.dataGioco ? ` ${dataGiocoConArticolo(dopo.dataGioco, 'di')}` : ''}: le attività di giorno erano complete.`, 6000);
  } catch {
    notifica('warning', 'Decisione registrata, ma non è stato possibile rileggere la partita: ricarica la pagina per vedere la data e la fascia aggiornate.', 8000);
  }
}
