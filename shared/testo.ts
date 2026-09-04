// ============================================================
// testo — normalizzazione per la ricerca (minuscole, senza accenti né punteggiatura), condivisa da frontend e backend
// ============================================================

/** «Jack-o'-Lantern» → «jack o lantern»: confronto insensibile a maiuscole, accenti e punteggiatura. */
export function normalizzaTesto(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Vero se la ricerca `q` (normalizzata) compare in almeno uno dei testi; una ricerca vuota corrisponde sempre. */
export function corrispondeRicerca(q: string, ...testi: Array<string | null | undefined>): boolean {
  const n = normalizzaTesto(q);
  return n === '' || testi.some((x) => !!x && normalizzaTesto(x).includes(n));
}
