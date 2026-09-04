// ============================================================
// testoBreve — sintesi di testi lunghi della guida per chip e schede (il dettaglio resta a richiesta)
// ============================================================

/** Taglia il testo alla fine di una frase o di una parola entro `massimo` caratteri. */
export function sintesi(testo: string, massimo = 110): string {
  const pulito = testo.trim();
  if (pulito.length <= massimo) return pulito;
  const finestra = pulito.slice(0, massimo);
  const frase = finestra.match(/^[\s\S]*?[.;:!?](?=\s|$)/)?.[0];
  if (frase && frase.length >= 24) return frase.trim();
  const taglio = pulito.lastIndexOf(' ', massimo);
  return `${pulito.slice(0, taglio > 24 ? taglio : massimo).trim()}…`;
}

/** Prima parte di una data descrittiva della guida («12 Aprile (Martedì) — prima infiltrazione…» → «12 Aprile»). */
export function dataBreve(testo: string): string {
  const prima = testo.split(/\s[—–(]|\s-\s|;/)[0].trim();
  return prima.length > 34 ? `${prima.slice(0, 32).trim()}…` : prima;
}
