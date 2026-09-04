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

const booleano = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1').optional();

export const queryCicli = z.object({
  partita: z.coerce.number().int().positive().optional(),
  dlc: z.string().optional(),
  lunghezza: z.coerce.number().int().min(2).max(5).optional(),
  alternative: z.coerce.number().int().min(1).max(12).optional(),
  catture: z.enum(['true', 'false']).optional(),
  limitaLivello: z.enum(['true', 'false']).optional(),
  livelloMax: z.coerce.number().int().min(1).max(99).optional(),
});
export const queryEredita = z.object({
  a: idNumerico,
  b: idNumerico,
  partita: idNumerico.optional(),
  dlc: elencoDlc,
  livelloA: z.coerce.number().int().min(1).max(99).optional(),
  livelloB: z.coerce.number().int().min(1).max(99).optional(),
});

export const queryCercaSkill = z.object({
  skill: z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()).filter((x) => x.length > 0).map(Number))
    .pipe(z.array(z.number().int().positive()).min(1).max(4)),
  risultato: idNumerico.optional(),
  partita: idNumerico.optional(),
  dlc: elencoDlc,
  livelloMax: z.coerce.number().int().min(1).max(99).optional(),
  limite: z.coerce.number().int().min(1).max(2000).optional(),
});

export const queryPiani = z.object({
  partita: idNumerico.optional(),
  dlc: elencoDlc,
  livelloMax: z.coerce.number().int().min(1).max(99).optional(),
  profondita: z.coerce.number().int().min(1).max(4).optional(),
  alternative: z.coerce.number().int().min(1).max(10).optional(),
  catture: booleano,
  limitaLivello: booleano,
  slotFortunato: booleano,
  skill: z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()).filter((x) => x.length > 0).map(Number))
    .pipe(z.array(z.number().int().positive()).max(4))
    .optional(),
});
