// ============================================================
// Schemi zod — immagini
// ============================================================

import { z } from 'zod';
import { AMBITI_CARICAMENTO, AMBITI_IMMAGINE } from '../../shared/immagini.js';

/** Una singola immagine: tutti gli ambiti, anche quelli della grafica predefinita (che si può sostituire o leggere). */
export const paramsImmagine = z.object({
  ambito: z.enum(AMBITI_IMMAGINE),
  chiave: z.string().min(1).max(200),
});

/** Elenco e rimozione multipla: solo gli ambiti di caricamento (la grafica predefinita non si svuota in blocco). */
export const queryImmagini = z.object({
  ambito: z.enum(AMBITI_CARICAMENTO).optional(),
});

export const bodyDaUrl = z.object({
  url: z.string().url().max(2000),
});
