// ============================================================
// Schemi zod — traduzioni
// ============================================================

import { z } from 'zod';
import { boolQuery, testoRicerca } from './comuni.js';

export const queryTraduzioni = z.object({
  ambito: z.string().trim().min(1).max(40).optional(),
  q: testoRicerca,
  soloUtente: boolQuery,
});

export const paramsTraduzione = z.object({
  ambito: z.string().trim().min(1).max(40),
  chiave: z.string().min(1).max(300),
});

export const bodyTraduzione = z.object({
  testo: z.string().trim().min(1).max(500),
});
