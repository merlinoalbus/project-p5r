// ============================================================
// testo — normalizzazione per la ricerca (minuscole, senza accenti né punteggiatura)
// ============================================================

/** «Jack-o'-Lantern» → «jack o lantern»: confronto insensibile a maiuscole, accenti e punteggiatura. */
export function normalizzaTesto(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
