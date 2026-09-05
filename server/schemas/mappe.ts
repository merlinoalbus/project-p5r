// ============================================================
// Schemi zod — mappe e spilli dell'editor (Fase 13.1)
// ============================================================

import { z } from 'zod';
import { TIPI_MAPPA, TIPI_RIFERIMENTO, TIPI_SPILLO } from '../../shared/spilli.js';
import { DOTI_CONDIZIONE, GIORNI_SETTIMANA, STAGIONI, dataValida, ordineGioco } from '../../shared/condizioniSpillo.js';

const chiaveMappa = z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/);
const riferimento = z.object({ tipo: z.enum(TIPI_RIFERIMENTO), chiave: z.string().min(1).max(200) }).nullable();
const entita = z.object({ tipo: z.string().min(1).max(40), chiave: z.string().min(1).max(200) }).nullable();
// Condizioni di visibilità degli spilli (shared/condizioniSpillo.ts): solo quelle che l'app sa calcolare, con parametri chiusi.
const dataMMGG = z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/).refine(dataValida, { message: 'Giorno inesistente nel calendario di gioco' });
const chiaveEntita = z.string().regex(/^[a-z0-9-]{1,60}$/);
const dote = z.enum(DOTI_CONDIZIONE.map((d) => d.chiave) as [string, ...string[]]);
const giorno = z.enum(GIORNI_SETTIMANA.map((g) => g.chiave) as [string, ...string[]]);
const stagione = z.enum(STAGIONI.map((x) => x.chiave) as [string, ...string[]]);
export const condizioneSpillo = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('data'), dal: dataMMGG }),
  z.object({ tipo: z.literal('intervallo'), dal: dataMMGG, al: dataMMGG }).refine((r) => ordineGioco(r.dal) <= ordineGioco(r.al), { message: 'La data di fine precede quella di inizio (calendario di gioco: aprile → marzo)' }),
  z.object({ tipo: z.literal('palazzo'), dungeon: chiaveEntita }),
  z.object({ tipo: z.literal('dote'), dote, rango: z.number().int().min(1).max(5) }),
  z.object({ tipo: z.literal('confidente'), confidente: chiaveEntita, rango: z.number().int().min(1).max(10) }),
  z.object({ tipo: z.literal('richiesta'), richiesta: z.string().min(1).max(200) }),
  z.object({ tipo: z.literal('piove') }),
  z.object({ tipo: z.literal('meteo'), condizione: z.literal('non-piove') }),
  z.object({ tipo: z.literal('giorno-settimana'), giorni: z.array(giorno).min(1).max(6) }),
  z.object({ tipo: z.literal('stagione'), stagione }),
  z.object({ tipo: z.literal('quartiere'), quartiere: chiaveEntita }),
  z.object({ tipo: z.literal('fascia'), fascia: z.enum(['giorno', 'sera']) }),
]);
const condizioni = z.array(condizioneSpillo).max(20).nullable().optional();

export const paramsMappa = z.object({ chiave: chiaveMappa });
export const paramsSpillo = z.object({ id: z.coerce.number().int().positive() });
export const queryEsporta = z.object({ radice: chiaveMappa.optional() });
export const queryDidascalia = z.object({ didascalia: z.string().max(300).optional() });
export const bodyImmagineSpillo = z.object({ didascalia: z.string().max(300).optional(), ordine: z.number().int().min(0).max(999).optional() });
export const queryMappa = z.object({ partita: z.coerce.number().int().positive().optional() });
export const bodyCreaMappa = z.object({
  chiave: chiaveMappa, nome: z.string().min(1).max(120), tipo: z.enum(TIPI_MAPPA), genitore: chiaveMappa.nullable().optional(), ordine: z.number().int().min(0).max(9999).optional(),
  asset: z.string().max(200).nullable().optional(), larghezza: z.number().int().positive().nullable().optional(), altezza: z.number().int().positive().nullable().optional(), entita: entita.optional(), note: z.string().max(2000).optional(),
});
export const bodyAggiornaMappa = bodyCreaMappa.omit({ chiave: true }).partial();
export const bodyCreaSpillo = z.object({
  tipo: z.enum(TIPI_SPILLO), nome: z.string().min(1).max(160), descrizione: z.string().max(2000).optional(), x: z.number().min(0).max(100), y: z.number().min(0).max(100),
  riferimento: riferimento.optional(), collezionabile: z.boolean().optional(), ordine: z.number().int().min(0).max(9999).optional(), condizioni,
});
export const bodyAggiornaSpillo = bodyCreaSpillo.partial().extend({ mappa: chiaveMappa.optional() });
export const bodyRaccolto = z.object({ raccolto: z.boolean() });
export const queryRiferimenti = z.object({ tipo: z.enum(TIPI_RIFERIMENTO), q: z.string().max(120).optional().default(''), limite: z.coerce.number().int().min(1).max(100).optional() });
export const bodyImporta = z.object({ pacchetto: z.object({ versione: z.literal(1), mappe: z.array(z.object({ chiave: z.string(), nome: z.string(), tipo: z.string() }).passthrough()).max(2000), immagini: z.record(z.string(), z.object({ mime: z.string(), base64: z.string() })).optional() }).passthrough(), sovrascrivi: z.boolean().optional() });
