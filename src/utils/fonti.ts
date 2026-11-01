// ============================================================
// fonti — come si mostra la fonte di un dato (un indirizzo web o una citazione a parole)
// ============================================================

import { urlHttp } from '../../shared/urlHttp';

/** Il sito di una fonte (`www.allgamestaff.it`), o `null` se la fonte non è un indirizzo web http(s) (`urlHttp`, L9-05): allora la si
 *  mostra come testo e non come collegamento. Prima `new URL(f)` stava nel render della scheda del Confidente, e una fonte scritta a
 *  parole («guida cartacea») faceva cadere la pagina (rilievo A8 della verifica completa, 2026-10-03). */
export function sitoDellaFonte(fonte: string): string | null {
  const href = urlHttp(fonte);
  return href ? new URL(href).hostname : null;
}
