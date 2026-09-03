// ============================================================
// Schemi zod — partite e tracking
// ============================================================

import { z } from 'zod';
import { idParam, livello } from './comuni.js';

export const difficolta = z.enum(['sicura', 'facile', 'normale', 'difficile', 'spietata']);

const campiPartita = {
  nome: z.string().trim().min(1).max(80),
  note: z.string().max(2000),
  livelloProtagonista: livello,
  dataGioco: z.string().regex(/^\d{2}-\d{2}$/, 'Formato atteso MM-GG').nullable(),
  difficolta,
  nuovaPartitaPlus: z.boolean(),
  dlcPosseduti: z.array(z.number().int().min(1).max(50)).max(50),
  allarmeAttivo: z.boolean(),
};

export const bodyCreaPartita = z.object({ ...campiPartita, attiva: z.boolean().optional() }).partial().required({ nome: true });
export const bodyAggiornaPartita = z.object(campiPartita).partial();

export const paramsPartita = z.object({ id: idParam });
export const paramsPartitaChiave = z.object({ id: idParam, chiave: z.string().trim().min(1).max(40) });
export const paramsPartitaPersona = z.object({ id: idParam, personaId: idParam });
export const paramsPartitaPosseduta = z.object({ id: idParam, possedutaId: idParam });

export const bodyDote = z
  .object({
    punti: z.number().int().min(0).max(999).optional(),
    delta: z.number().int().min(-999).max(999).optional(),
    note: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    libro: z.boolean().optional(),
    fortuna: z.boolean().optional(),
  })
  .refine((v) => v.punti !== undefined || v.delta !== undefined || v.note !== undefined, { message: 'Indicare punti, delta oppure note.' });

export const bodyConfidente = z
  .object({
    sbloccato: z.boolean().optional(),
    rango: z.number().int().min(0).max(10).optional(),
    punti: z.number().min(0).max(9999).optional(),
    deltaPunti: z.number().min(-9999).max(9999).optional(),
    noteRisposta: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
    regalo: z.boolean().optional(),
    uscita: z.boolean().optional(),
    bonusArcano: z.boolean().optional(),
    esame: z.enum(['primo', 'top10']).optional(),
    invito: z.boolean().optional(),
    note: z.string().max(2000).optional(),
  })
  .refine((v) => [v.noteRisposta !== undefined, v.regalo === true, v.uscita === true, v.deltaPunti !== undefined, v.punti !== undefined].filter(Boolean).length <= 1, {
    message: 'Indicare una sola sorgente di punti fra note della risposta, regalo, uscita, deltaPunti e punti.',
  });

export const bodyCompendio = z.object({
  registrata: z.boolean(),
  livelloRegistrato: livello.nullable().optional(),
});

const statistiche = z.object({
  forza: z.number().int().min(1).max(99),
  magia: z.number().int().min(1).max(99),
  resistenza: z.number().int().min(1).max(99),
  agilita: z.number().int().min(1).max(99),
  fortuna: z.number().int().min(1).max(99),
});

const campiPosseduta = {
  livello: livello.optional(),
  statistiche: statistiche.nullable().optional(),
  trattoSkillId: z.number().int().positive().nullable().optional(),
  inSquadra: z.boolean().optional(),
  note: z.string().max(2000).optional(),
  skillIds: z.array(z.number().int().positive()).max(8).optional(),
};

export const bodyAggiungiPosseduta = z.object({ personaId: z.number().int().positive(), ...campiPosseduta, origine: z.string().max(200).optional() });

export const queryStorico = z.object({
  limite: z.coerce.number().int().min(1).max(200).optional(),
  prima: z.coerce.number().int().positive().optional(),
  /** Tipi separati da virgola. */
  tipi: z.string().max(1000).optional(),
  persona: z.coerce.number().int().positive().optional(),
});
const campiObiettivo = {
  skillIds: z.array(z.number().int().positive()).max(8).optional(),
  livelloMin: livello.nullable().optional(),
  priorita: z.number().int().min(0).max(2).optional(),
  note: z.string().max(2000).optional(),
};
export const bodyCreaObiettivo = z.object({ personaId: z.number().int().positive(), ...campiObiettivo });
export const bodyAggiornaObiettivo = z.object({ ...campiObiettivo, stato: z.enum(['aperto', 'raggiunto', 'annullato']).optional() });
export const queryObiettivi = z.object({ stato: z.enum(['aperto', 'raggiunto', 'annullato']).optional() });
export const paramsPartitaObiettivo = z.object({ id: z.coerce.number().int().positive(), obiettivoId: z.coerce.number().int().positive() });
const nodoPiano: z.ZodType<unknown> = z.lazy(() => z.object({
  persona: z.object({ id: z.number().int().positive() }).passthrough(),
  modo: z.enum(['scorta', 'registro', 'cattura', 'fusione']),
  costo: z.number().min(0),
  tipo: z.enum(['normale', 'stesso-arcano', 'tesoro', 'speciale']).optional(),
  figli: z.array(nodoPiano).max(12),
  skillPortate: z.array(z.object({ id: z.number().int(), nome: z.string(), nomeIt: z.string() })).max(8).default([]),
  skillDaLivello: z.array(z.object({ id: z.number().int(), nome: z.string(), nomeIt: z.string() })).max(8).default([]),
}).passthrough());
export const bodySalvaPiano = z.object({
  personaId: z.number().int().positive(),
  piano: z.object({ radice: nodoPiano, costo: z.number().min(0), profondita: z.number().int().min(0), catture: z.number().int().min(0), evocazioni: z.number().int().min(0), fusioni: z.number().int().min(0) }).passthrough(),
  opzioni: z.object({}).passthrough().optional(),
  skillIds: z.array(z.number().int().positive()).max(8).optional(),
  obiettivoId: z.number().int().positive().nullable().optional(),
  nome: z.string().max(80).optional(),
  note: z.string().max(2000).optional(),
});
export const bodyAggiornaPianoSalvato = z.object({ nome: z.string().max(80).optional(), note: z.string().max(2000).optional(), obiettivoId: z.number().int().positive().nullable().optional() });
export const queryPianiSalvati = z.object({ obiettivo: z.coerce.number().int().positive().optional() });
export const paramsPartitaPiano = z.object({ id: z.coerce.number().int().positive(), pianoId: z.coerce.number().int().positive() });
export const paramsPartitaEvento = z.object({ id: z.coerce.number().int().positive(), eventoId: z.coerce.number().int().positive() });
export const bodyAggiornaPosseduta = z.object(campiPosseduta);
