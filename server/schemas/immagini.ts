// ============================================================
// Schemi zod — immagini
// ============================================================

import { z } from 'zod';
import { AMBITI_IMMAGINE } from '../services/immaginiService.js';

export const paramsImmagine = z.object({
  ambito: z.enum(AMBITI_IMMAGINE),
  chiave: z.string().min(1).max(120),
});

export const queryImmagini = z.object({
  ambito: z.enum(AMBITI_IMMAGINE).optional(),
});

export const bodyDaUrl = z.object({
  url: z.string().url().max(2000),
});

