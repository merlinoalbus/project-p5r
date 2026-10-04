// ============================================================
// fonti — come si mostra la fonte di un dato (un indirizzo web o una citazione a parole)
// ============================================================

/** Il sito di una fonte (`www.allgamestaff.it`), o `null` se la fonte non è un indirizzo web http(s): allora la si mostra come
 *  testo e non come collegamento. Prima `new URL(f)` stava nel render della scheda del Confidente, e una fonte scritta a parole
 *  («guida cartacea») faceva cadere la pagina (rilievo A8 della verifica completa, 2026-10-03). */
export function sitoDellaFonte(fonte: string): string | null {
  try {
    const u = new URL(fonte);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.hostname : null;
  } catch {
    return null;
  }
}
