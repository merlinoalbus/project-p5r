// ============================================================
// Schemi zod — compendio (elenchi e dettagli)
// ============================================================

import { z } from 'zod';
import { boolQuery, idParam, livello, testoRicerca } from './comuni.js';
import { DOTI_AZIONE, TIPI_AZIONE, TIPI_RIFERIMENTO_AZIONE, type ChiaveDoteAzione, type TipoAzione, type TipoRiferimentoAzione } from '../../shared/effettiAzione.js';

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

// ---- Guida giorno per giorno: le voci della giornata (canone, per tutte le partite) ----

export const paramsGiornoGuida = z.object({ data: z.string().regex(/^\d{2}-\d{2}$/, 'La data del gioco è nel formato MM-GG.') });
/** Tipo, collegamento, rango atteso ed effetti di una voce della giornata: i valori
 *  ammessi sono gli elenchi chiusi di `shared/effettiAzione.ts`; che gli elementi esistano lo verifica il servizio. */
export const campiAzioneStrutturata = {
  tipo: z.enum(TIPI_AZIONE.map((t) => t.chiave) as [TipoAzione, ...TipoAzione[]]).optional(),
  riferimento: z.object({ tipo: z.enum(TIPI_RIFERIMENTO_AZIONE.map((t) => t.chiave) as [TipoRiferimentoAzione, ...TipoRiferimentoAzione[]]), chiave: z.string().trim().min(1).max(200) }).nullable().optional(),
  rangoAtteso: z.number().int().min(1).max(10).nullable().optional(),
  produce: z.array(z.unknown()).max(20).optional(),
};
/** Una voce della giornata (azione della guida, cosa da fare, evento): canone, per tutte le partite. */
export const paramsVoceGiornata = z.object({ uid: z.string().regex(/^[0-9a-f]{32}$/, 'Identità della voce non valida.') });
const campiVoce = {
  genere: z.enum(['azione', 'evento', 'scadenza', 'promemoria']).optional(),
  // la guida ha azioni fino a ~780 caratteri e note fino a ~820: il margine lascia scrivere senza tagliare
  azione: z.string().trim().min(1).max(2000).optional(),
  note: z.string().trim().max(2000).nullable().optional(),
  fascia: z.enum(['giorno', 'sera']).optional(),
  /** Il posto nella fascia, da 0 (in cima). */
  posizione: z.number().int().min(0).max(500).optional(),
  ...campiAzioneStrutturata,
};
export const bodyNuovaVoce = z.object({ ...campiVoce, azione: z.string().trim().min(1).max(2000) });
export const bodyAggiornaVoce = z.object(campiVoce)
  .refine((b) => Object.values(b).some((v) => v !== undefined), { message: 'Indica almeno un campo da cambiare (testo, note, genere, fascia, posizione, tipo, collegamento, rango atteso o effetti).' });
export const bodySpostaVoce = z.object({ verso: z.union([z.literal(-1), z.literal(1)]) });

/** La Dote a ogni incontro di un Confidente, rango per rango: Doti chiuse, note 1–3, al massimo cinque per rango. */
export const bodyDotiIncontro = z.object({
  ranghi: z.array(z.object({
    rango: z.number().int().min(1).max(10),
    doti: z.array(z.object({ dote: z.enum(DOTI_AZIONE.map((d) => d.chiave) as [ChiaveDoteAzione, ...ChiaveDoteAzione[]]), note: z.union([z.literal(1), z.literal(2), z.literal(3)]) })).max(5),
  })).min(1).max(10),
});
