// ============================================================
// Schemi zod — compendio (elenchi e dettagli)
// ============================================================

import { z } from 'zod';
import { boolQuery, idParam, livello, testoRicerca } from './comuni.js';

export const paramsId = z.object({ id: idParam });

export const queryPersona = z.object({
  q: testoRicerca,
  arcana: z.string().trim().min(1).max(40).optional(),
  livelloMin: livello.optional(),
  livelloMax: livello.optional(),
  dlc: boolQuery,
  rara: boolQuery,
  speciale: boolQuery,
  skill: z.string().trim().min(1).max(80).optional(),
});
export type QueryPersona = z.infer<typeof queryPersona>;

export const querySkill = z.object({
  q: testoRicerca,
  elemento: z.string().trim().min(1).max(20).optional(),
});

export const queryOggetti = z.object({
  q: testoRicerca,
  categoria: z.string().trim().min(1).max(20).optional(),
});
