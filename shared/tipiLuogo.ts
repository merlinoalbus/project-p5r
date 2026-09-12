// ============================================================
// tipiLuogo — come si classifica un luogo della città
// ============================================================
//
// Un luogo (una riga di `luogo`) ha un tipo preso da questo catalogo, e il tipo decide tutto il
// resto: l'etichetta, lo spillo che lo rappresenta sulla pianta del quartiere (`spilloPerLuogo`,
// usato da `sincronizzaMappe`) e quindi anche il colore, che è quello dello spillo — una sorgente
// sola, così la pastiglia nella scheda e il pin sulla mappa dicono la stessa cosa. Il catalogo è
// unico per la guida e per i luoghi aggiunti dall'utente: chi aggiunge un luogo sceglie da qui, non
// scrive un testo. L'ordine è quello con cui i tipi compaiono nei filtri della scheda del quartiere.
// ============================================================

import { DEFINIZIONI_SPILLO, type TipoSpillo } from './spilli.js';

export interface DefinizioneTipoLuogo {
  chiave: string;
  nome: string;
  /** Lo spillo dell'atlante che rappresenta il luogo sulla pianta del quartiere. */
  icona: TipoSpillo;
  /** Colore dello spillo, e della pastiglia del tipo: lo stesso. */
  colore: string;
}

const CATALOGO = [
  { chiave: 'negozio', nome: 'Negozio', icona: 'negozio' },
  { chiave: 'ristorante', nome: 'Ristorante', icona: 'ristorante' },
  { chiave: 'attivita', nome: 'Attività', icona: 'attivita' },
  { chiave: 'confidente', nome: 'Confidente', icona: 'confidente' },
  { chiave: 'servizio', nome: 'Servizio', icona: 'attivita' },
  { chiave: 'distributore', nome: 'Distributore', icona: 'distributore' },
  { chiave: 'punto-interesse', nome: 'Punto di interesse', icona: 'nota' },
  { chiave: 'scuola', nome: 'Scuola', icona: 'biblioteca' },
  { chiave: 'trasporto', nome: 'Trasporto', icona: 'treno' },
  { chiave: 'altro', nome: 'Altro', icona: 'nota' },
] as const satisfies readonly { chiave: string; nome: string; icona: TipoSpillo }[];

export type TipoLuogo = (typeof CATALOGO)[number]['chiave'];

export const TIPI_LUOGO: readonly DefinizioneTipoLuogo[] = CATALOGO.map((t) => ({ ...t, colore: DEFINIZIONI_SPILLO[t.icona].colore }));

const PER_CHIAVE: Record<string, DefinizioneTipoLuogo> = Object.fromEntries(TIPI_LUOGO.map((t) => [t.chiave, t]));

export function eTipoLuogo(x: unknown): x is TipoLuogo {
  return typeof x === 'string' && x in PER_CHIAVE;
}

/** La definizione del tipo; un tipo sconosciuto (dati vecchi) ricade su «Altro». */
export function definizioneTipoLuogo(tipo: string): DefinizioneTipoLuogo {
  return PER_CHIAVE[tipo] ?? PER_CHIAVE.altro;
}

/** Lo spillo che rappresenta un luogo sulla pianta del quartiere. Due voci non sono tipi di luogo ma
 *  entità della città con un segno proprio (la Stanza di Velluto e l'ingresso ai Memento): restano qui
 *  perché `sincronizzaMappe` le tratta nello stesso passaggio. */
export function spilloPerLuogo(tipoLuogo: string): TipoSpillo {
  if (tipoLuogo === 'velluto' || tipoLuogo === 'mementos') return tipoLuogo;
  return definizioneTipoLuogo(tipoLuogo).icona;
}

/** Ordina i tipi presenti secondo il catalogo, scartando i doppioni. */
export function ordinaTipiLuogo(tipi: Iterable<string>): TipoLuogo[] {
  const presenti = new Set(tipi);
  return TIPI_LUOGO.filter((t) => presenti.has(t.chiave)).map((t) => t.chiave as TipoLuogo);
}
