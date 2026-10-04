// ============================================================
// Schemi zod — fusione
// ============================================================
//
// Gli elenchi (`dlc=1,2,3`, `skill=…`) e i booleani hanno la stessa forma in tutte le rotte: prima `/cicli` prendeva `dlc` come
// testo libero, scartando in silenzio i pezzi non numerici, e accettava solo `true`/`false` dove `/piani` accetta anche `1`/`0`
// (rilievo F13 della verifica completa, 2026-10-03).
// ============================================================

import { z } from 'zod';
import { boolQuery, elencoInteri, idParam } from './comuni.js';

/** Elenco di id DLC separati da virgola ("1,2,3"). */
const elencoDlc = elencoInteri(50).optional();
const livelloMax = z.coerce.number().int().min(1).max(99).optional();

export const queryFondi = z.object({
  a: idParam,
  b: idParam,
  partita: idParam.optional(),
  dlc: elencoDlc,
});

export const queryRicette = z.object({
  partita: idParam.optional(),
  dlc: elencoDlc,
  livelloMax,
  limite: z.coerce.number().int().min(1).max(5000).optional(),
});

export const paramsPersonaId = z.object({ personaId: idParam });

export const queryCicli = z.object({
  partita: idParam.optional(),
  dlc: elencoDlc,
  lunghezza: z.coerce.number().int().min(2).max(15).optional(),
  lunghezzaMin: z.coerce.number().int().min(2).max(15).optional(),
  partnerDistinti: boolQuery,
  alternative: z.coerce.number().int().min(1).max(12).optional(),
  catture: boolQuery,
  limitaLivello: boolQuery,
  livelloMax,
});

export const queryEredita = z.object({
  a: idParam,
  b: idParam,
  partita: idParam.optional(),
  dlc: elencoDlc,
  livelloA: z.coerce.number().int().min(1).max(99).optional(),
  livelloB: z.coerce.number().int().min(1).max(99).optional(),
});

export const queryCercaSkill = z.object({
  skill: elencoInteri(4, 1),
  risultato: idParam.optional(),
  partita: idParam.optional(),
  dlc: elencoDlc,
  livelloMax,
  limite: z.coerce.number().int().min(1).max(2000).optional(),
});

export const queryPiani = z.object({
  partita: idParam.optional(),
  dlc: elencoDlc,
  livelloMax,
  profondita: z.coerce.number().int().min(1).max(4).optional(),
  alternative: z.coerce.number().int().min(1).max(10).optional(),
  catture: boolQuery,
  limitaLivello: boolQuery,
  slotFortunato: boolQuery,
  skill: elencoInteri(4).optional(),
});

export const queryVelluto = z.object({ partita: idParam });
