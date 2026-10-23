// ============================================================
// contestoScheda — i due contesti del pannello della scheda sopra il diario (R10-27)
// ============================================================
//
// - `ApriPannelloContext`: chi lo legge sta dentro un diario che sa aprire il pannello (Home, Guida › Giorno per giorno). Fuori (Partita ›
//   Oggi) è null e i cartellini navigano come sempre.
// - `SchedaCorrenteContext`: chi lo legge sta DENTRO il pannello. Porta la posizione «virtuale» della scheda (l'indirizzo mostrato), i
//   parametri del suo percorso e la navigazione verso altre schede. Le pagine mostrate nel pannello la leggono con gli hook di
//   `routerScheda` (che, fuori dal pannello, sono quelli di react-router); intestazioni e titolo del documento si adattano.
// ============================================================

import { createContext, useContext } from 'react';
import type { Location, NavigateOptions, To } from 'react-router-dom';

/** Apre una scheda nel pannello: l'indirizzo della pagina dell'oggetto e l'elemento a cui ridare il fuoco alla chiusura. */
export type ApriPannello = (indirizzo: string, daElemento?: HTMLElement | null) => void;

export const ApriPannelloContext = createContext<ApriPannello | null>(null);

/** Ciò che una pagina mostrata nel pannello vede al posto del router. */
export interface SchedaCorrente {
  posizione: Location;
  params: Readonly<Record<string, string | undefined>>;
  /** Va a un'altra scheda del pannello (se l'indirizzo è una scheda) o a una pagina vera (e il pannello si lascia con il diario). */
  naviga: (a: To | number, opzioni?: NavigateOptions) => void;
}

export const SchedaCorrenteContext = createContext<SchedaCorrente | null>(null);

/** La funzione che apre una scheda nel pannello, o null dove il diario non lo prevede. */
export function useApriPannello(): ApriPannello | null {
  return useContext(ApriPannelloContext);
}

/** Vero dentro il pannello della scheda. */
export function useInPannello(): boolean {
  return useContext(SchedaCorrenteContext) !== null;
}
