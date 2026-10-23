// ============================================================
// Schemi zod — Ombre (elenco e scheda; L8, B4)
// ============================================================

import { z } from 'zod';
import { idParam, testoRicerca } from './comuni.js';
import { PERSONALITA_OMBRA } from '../../shared/elementi.js';

/** `GET /api/compendio/ombre`: testo, Palazzo o Memento d'incontro, personalità, Persona; `partita` verifica che la partita esista. */
export const queryOmbre = z.object({
  q: testoRicerca,
  dungeon: z.string().trim().min(1).max(80).optional(),
  personalita: z.enum(PERSONALITA_OMBRA as unknown as [string, ...string[]]).optional(),
  persona: idParam.optional(),
  partita: idParam.optional(),
});
export type QueryOmbre = z.infer<typeof queryOmbre>;

/** `GET /api/compendio/ombre/:chiave`: `?partita=` aggiunge se la Persona è registrata nella partita. */
export const paramsOmbra = z.object({ chiave: z.string().trim().min(1).max(120) });
export const queryOmbra = z.object({ partita: idParam.optional() });
