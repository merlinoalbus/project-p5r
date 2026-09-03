// ============================================================
// Schemi zod — fusione
// ============================================================

import { z } from 'zod';

const idNumerico = z.coerce.number().int().positive();

/** Elenco di id DLC separati da virgola ("1,2,3"). */
const elencoDlc = z
  .string()
  .transform((s) => s.split(',').map((x) => x.trim()).filter((x) => x.length > 0).map(Number))
  .pipe(z.array(z.number().int().positive()).max(50))
  .optional();

export const queryFondi = z.object({
  a: idNumerico,
  b: idNumerico,
  partita: idNumerico.optional(),
  dlc: elencoDlc,
});

export const queryRicette = z.object({
  partita: idNumerico.optional(),
  dlc: elencoDlc,
  livelloMax: z.coerce.number().int().min(1).max(99).optional(),
  limite: z.coerce.number().int().min(1).max(5000).optional(),
});

export const paramsPersonaId = z.object({ personaId: idNumerico });
