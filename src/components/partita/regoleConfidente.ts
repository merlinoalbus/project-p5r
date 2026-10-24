// ============================================================
// regoleConfidente — due domande sul Confidente della partita che la riga dell'elenco, il pannello e l'ordine degli attivi si pongono uguali
// ============================================================

import type { ConfidentePartitaDto } from '../../types';

/** Se il passaggio al rango successivo si fa a punti (note, regali, uscite). */
export function aPuntiDi(c: ConfidentePartitaDto): boolean {
  return c.rango < 10 && c.puntiNecessari !== null && c.puntiNecessari > 0;
}

/** Se la soglia di punti del rango successivo è raggiunta. */
export function sogliaRaggiunta(c: ConfidentePartitaDto): boolean {
  return aPuntiDi(c) && c.mancanti === 0;
}
