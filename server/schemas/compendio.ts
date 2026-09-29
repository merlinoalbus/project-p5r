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

// ---- Guida giorno per giorno: correzioni dell'utente alle azioni (valgono per tutte le partite) ----

export const paramsAzioneGuida = z.object({
  data: z.string().regex(/^\d{2}-\d{2}$/, 'La data del gioco è nel formato MM-GG.'),
  indice: z.coerce.number().int().min(0).max(200),
});
export const bodyCorreggiAzioneGuida = z.object({
  // la guida ha azioni fino a ~780 caratteri e note fino a ~820: il margine lascia correggere senza tagliare
  azione: z.string().trim().min(1).max(2000).optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  fascia: z.enum(['giorno', 'sera']).optional(),
}).refine((b) => b.azione !== undefined || b.note !== undefined || b.fascia !== undefined, { message: 'Indica almeno un campo da correggere (azione, note o fascia).' });
export const bodyRimuoviAzioneGuida = z.object({ rimossa: z.boolean() });
