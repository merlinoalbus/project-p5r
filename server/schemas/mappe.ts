// ============================================================
// Schemi zod — mappe e spilli dell'editor (Fase 13.1)
// ============================================================

import { z } from 'zod';
import { TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO } from '../../shared/spilli.js';

const chiaveMappa = z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/);
const riferimento = z.object({ tipo: z.enum(TIPI_RIFERIMENTO), chiave: z.string().min(1).max(200) }).nullable();
const entita = z.object({ tipo: z.string().min(1).max(40), chiave: z.string().min(1).max(200) }).nullable();

export const paramsMappa = z.object({ chiave: chiaveMappa });
export const paramsSpillo = z.object({ id: z.coerce.number().int().positive() });
export const queryMappa = z.object({ partita: z.coerce.number().int().positive().optional() });
export const bodyCreaMappa = z.object({
  chiave: chiaveMappa, nome: z.string().min(1).max(120), tipo: z.enum(TIPI_MAPPA), genitore: chiaveMappa.nullable().optional(), ordine: z.number().int().min(0).max(9999).optional(),
  asset: z.string().max(200).nullable().optional(), larghezza: z.number().int().positive().nullable().optional(), altezza: z.number().int().positive().nullable().optional(), entita: entita.optional(), note: z.string().max(2000).optional(),
});
export const bodyAggiornaMappa = bodyCreaMappa.omit({ chiave: true }).partial();
export const bodyCreaSpillo = z.object({
  tipo: z.enum(TIPI_SPILLO), nome: z.string().min(1).max(160), descrizione: z.string().max(2000).optional(), x: z.number().min(0).max(100), y: z.number().min(0).max(100),
  riferimento: riferimento.optional(), collezionabile: z.boolean().optional(), ordine: z.number().int().min(0).max(9999).optional(),
});
export const bodyAggiornaSpillo = bodyCreaSpillo.partial().extend({ mappa: chiaveMappa.optional() });
export const bodyRaccolto = z.object({ raccolto: z.boolean() });
export const bodyImporta = z.object({ pacchetto: z.object({ versione: z.literal(1), mappe: z.array(z.object({ chiave: z.string(), nome: z.string(), tipo: z.string() }).passthrough()).max(2000), immagini: z.record(z.string(), z.object({ mime: z.string(), base64: z.string() })).optional() }).passthrough(), sovrascrivi: z.boolean().optional() });
