// ============================================================
// Schemi zod comuni — parametri numerici, booleani da query string
// ============================================================

import { z } from 'zod';

/** Intero positivo da parametro di percorso (":id"). */
export const idParam = z.coerce.number().int().positive();

/** Booleano da query string ('true'/'false'/'1'/'0'); undefined se assente. */
export const boolQuery = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === 'true' || v === '1')
  .optional();

/** Testo di ricerca (max 100 caratteri, spazi ai bordi rimossi). */
export const testoRicerca = z.string().trim().max(100).optional();

/** Livello di gioco 1–99. */
export const livello = z.coerce.number().int().min(1).max(99);
