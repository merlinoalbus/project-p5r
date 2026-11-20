// ============================================================
// eventiIntermedi — la regola pura degli eventi intermedi dei Confidenti (7.5, 8.5, 6.5)
// ============================================================
//
// Alcuni Confidenti hanno un evento fra due ranghi (Tae Takemi: rango 7 → evento 7.5 → rango 8). L'evento è un dialogo della guida con un
// rango non intero (`confidente_dialogo.rango` = intero + 0,5); non è un rango: il rango della partita resta intero ovunque. Per partita si
// segna solo se l'evento è stato fatto (`utente.evento_intermedio_partita`), dal pannello del Confidente o dalla spunta della voce del Diario
// che lo rappresenta. Qui stanno le regole che non leggono niente: riconoscere un rango intermedio, il rango prima e dopo, l'etichetta e la
// chiave con cui la partita lo ricorda. Nessun import di Node, DB o DOM.
// ============================================================

import { RANGO_MASSIMO_CONFIDENTE } from './puntiConfidenti.js';

/** È il rango di un evento intermedio: un intero da 1 a 9 più mezzo (1.5 … 9.5). */
export const eRangoIntermedio = (rango: number): boolean =>
  Number.isFinite(rango) && !Number.isInteger(rango) && Number.isInteger(rango * 2) && rango > 1 && rango < RANGO_MASSIMO_CONFIDENTE;

/** Un rango che una condizione Confidente o un requisito di rango possono citare: intero da 1 al massimo, o un evento intermedio. */
export const eRangoDiPasso = (rango: number): boolean =>
  (Number.isInteger(rango) && rango >= 1 && rango <= RANGO_MASSIMO_CONFIDENTE) || eRangoIntermedio(rango);

/** Il rango intero da cui si fa l'evento (7 per il 7.5). */
export const rangoPrimaDellEvento = (rango: number): number => Math.floor(rango);

/** Il rango intero che segue l'evento (8 per il 7.5). */
export const rangoDopoLEvento = (rango: number): number => Math.ceil(rango);

/** Il rango dell'evento intermedio che può stare fra un rango intero e il successivo (7 → 7.5). */
export const rangoIntermedioDopo = (rango: number): number => rango + 0.5;

/** L'etichetta dell'evento: «7.5». */
export const etichettaEventoIntermedio = (rango: number): string => `${rangoPrimaDellEvento(rango)}.5`;

/** Un passo del Confidente in parole: «rango 8» per un intero, «evento 7.5» per un evento intermedio. */
export const testoPassoConfidente = (rango: number): string => (eRangoIntermedio(rango) ? `evento ${etichettaEventoIntermedio(rango)}` : `rango ${rango}`);

/** Lo stesso con l'iniziale maiuscola: «Rango 8», «Evento 7.5». */
export const titoloPassoConfidente = (rango: number): string => (eRangoIntermedio(rango) ? `Evento ${etichettaEventoIntermedio(rango)}` : `Rango ${rango}`);

/** La chiave con cui la partita ricorda un evento intermedio fatto, e con cui lo cita un effetto della voce: «takemi:7.5». */
export const chiaveEventoIntermedio = (confidente: string, rango: number): string => `${confidente}:${etichettaEventoIntermedio(rango)}`;

/** Da «takemi:7.5» al Confidente e al rango dell'evento; null se la chiave non è di un evento intermedio. */
export function leggiChiaveEventoIntermedio(chiave: string): { confidente: string; rango: number } | null {
  const i = chiave.lastIndexOf(':');
  if (i <= 0) return null;
  const rango = Number(chiave.slice(i + 1));
  return eRangoIntermedio(rango) ? { confidente: chiave.slice(0, i), rango } : null;
}
