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

export const bodyConfidente = z.object({
  sbloccato: z.boolean().optional(),
  rango: z.number().int().min(0).max(10).optional(),
  punti: z.number().int().min(0).max(999).optional(),
  deltaPunti: z.number().int().min(-999).max(999).optional(),
  note: z.string().max(2000).optional(),
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

export const bodyAggiungiPosseduta = z.object({ personaId: z.number().int().positive(), ...campiPosseduta });
export const bodyAggiornaPosseduta = z.object(campiPosseduta);
