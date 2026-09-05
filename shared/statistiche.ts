// ============================================================
// statistiche — crescita delle statistiche di una Persona con il livello
// ============================================================
//
// Nel dataset Royal la somma delle cinque statistiche al livello base segue quasi esattamente
// 10 + 3·L (regressione sulle 232 Persona: 10,03 + 2,982·L, deviazione 12,5): ogni livello porta
// **3 punti** distribuiti fra le statistiche. In gioco la ripartizione dipende dai level-up (e dal
// bonus di fusione/Potenziamento manipolabile, vedi docs/riferimenti/manipolazione-statistiche.md);
// qui si stima ripartendo i punti in proporzione alle statistiche base (metodo del resto maggiore),
// con il tetto di 99 per statistica. La ripartizione reale del gioco ha pesi propri di ogni Persona
// che il dataset non conosce (Arsène al livello 2: FR 4 MA 2 nel gioco, FR 3 MA 3 qui): perciò
// l'utente registra nella scorta i VALORI REALI letti nel gioco a un livello (15.26) e da lì in su la
// stima riparte da quelli (`statisticheStimate`), con i bonus di Potenziamento e simili a parte.
// ============================================================

export interface Statistiche {
  forza: number;
  magia: number;
  resistenza: number;
  agilita: number;
  fortuna: number;
}

export const CHIAVI_STATISTICHE = ['forza', 'magia', 'resistenza', 'agilita', 'fortuna'] as const;
export type ChiaveStatistica = (typeof CHIAVI_STATISTICHE)[number];

/** Punti di statistica guadagnati per ogni livello. */
export const PUNTI_PER_LIVELLO = 3;
/** Tetto di una statistica. */
export const MASSIMO_STATISTICA = 99;

export function totaleStatistiche(s: Statistiche): number {
  return CHIAVI_STATISTICHE.reduce((tot, k) => tot + s[k], 0);
}

/**
 * Statistiche stimate al `livello` partendo da quelle `base` al `livelloBase`.
 * Sotto il livello base restituisce le statistiche base (una Persona non scende di livello).
 */
export function statistichePerLivello(base: Statistiche, livelloBase: number, livello: number): Statistiche {
  const livelli = Math.max(0, Math.floor(livello) - livelloBase);
  if (livelli === 0) return { ...base };
  const extra = livelli * PUNTI_PER_LIVELLO;
  const totaleBase = Math.max(1, totaleStatistiche(base));
  // Quote proporzionali, poi il resto alle frazioni più alte (a parità: ordine delle chiavi).
  const quote = CHIAVI_STATISTICHE.map((k) => ({ k, esatto: (extra * base[k]) / totaleBase }));
  const interi = quote.map((q) => Math.floor(q.esatto));
  let resto = extra - interi.reduce((a, b) => a + b, 0);
  const ordine = quote
    .map((q, i) => ({ i, frazione: q.esatto - interi[i] }))
    .sort((a, b) => b.frazione - a.frazione || a.i - b.i);
  // Il resto va alle frazioni più alte, ciclando se serve (base tutta a zero → ripartizione uniforme).
  for (let giro = 0; resto > 0 && giro < extra; giro++) {
    interi[ordine[giro % ordine.length].i] += 1;
    resto -= 1;
  }
  const esito = { ...base };
  quote.forEach((q, i) => {
    esito[q.k] = Math.min(MASSIMO_STATISTICA, base[q.k] + interi[i]);
  });
  return esito;
}

/** Valori reali letti nella scheda della Persona nel gioco a un livello (15.26). */
export interface Osservazione extends Statistiche {
  livello: number;
}

/** Da dove parte la stima al `livello`: dai valori reali registrati (se il livello è almeno quello registrato) o dalla base del dataset. */
export function origineStima(osservate: Osservazione | null | undefined, livello: number): 'base' | 'osservate' {
  return osservate && Math.floor(livello) >= osservate.livello ? 'osservate' : 'base';
}

/**
 * Statistiche stimate al `livello`: al livello registrato sono esattamente i valori reali; sopra ripartono da quelli
 * (+3 punti per livello in proporzione ai valori reali); sotto il livello registrato, o senza valori reali, si usa la base del dataset.
 */
export function statisticheStimate(base: Statistiche, livelloBase: number, osservate: Osservazione | null | undefined, livello: number): Statistiche {
  if (osservate && origineStima(osservate, livello) === 'osservate') {
    const { livello: livelloOsservato, ...valori } = osservate;
    return statistichePerLivello(valori, livelloOsservato, livello);
  }
  return statistichePerLivello(base, livelloBase, livello);
}
