// ============================================================
// doti — avanzamento continuo di una Dote sociale sulla stella a cinque punte
// ============================================================

import type { DoteSocialePartitaDto } from '../types';

export const RANGO_MAX_DOTE = 5;
/** Nucleo minimo visibile della stella al rango 1 senza punti (come il grafico del gioco, mai un punto). */
const NUCLEO = 0.12;

/** Quota (0–1) dei punti già accumulati verso il rango successivo; 0 al rango massimo o senza soglia. */
export function quotaVersoProssimoRango(d: DoteSocialePartitaDto): number {
  const inizio = d.ranghi.find((r) => r.rango === d.rango)?.soglia ?? 0;
  const fine = d.sogliaProssima ?? inizio;
  if (fine <= inizio) return 0;
  return Math.min(1, Math.max(0, (d.punti - inizio) / (fine - inizio)));
}

/** Valore 0–1 per l'asse della stella: ranghi completati più la quota verso il prossimo, con un nucleo minimo visibile. */
export function avanzamentoDote(d: DoteSocialePartitaDto): number {
  if (d.rango >= RANGO_MAX_DOTE) return 1;
  const x = (Math.max(1, d.rango) - 1 + quotaVersoProssimoRango(d)) / (RANGO_MAX_DOTE - 1);
  return NUCLEO + (1 - NUCLEO) * Math.min(1, Math.max(0, x));
}
