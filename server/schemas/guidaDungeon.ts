// ============================================================
// Schemi zod — correzione dei testi della guida ai Palazzi (dungeon, aree, punti)
// ============================================================
//
// La sezione dei Palazzi era l'unica parte della guida in sola lettura: qui entrano le forme di
// quel che si può correggere. I testi sono dati di gioco, quindi finiscono nel pacchetto: le
// stringhe hanno un tetto generoso ma non illimitato, e il nome non può diventare vuoto.
// ============================================================

import { z } from 'zod';

export const TIPI_PUNTO = ['sicura', 'forziere', 'forziere-chiuso', 'volonta', 'puzzle', 'miniboss', 'boss', 'ombra-sciagura', 'persona', 'oggetto', 'scorciatoia', 'altro'] as const;

export const paramsChiaveGuida = z.object({ chiave: z.string().min(1).max(200) });
export const bodyDungeon = z.object({
  nome: z.string().trim().min(1).max(160).optional(), sovrano: z.string().max(200).optional(),
  dataSblocco: z.string().max(400).optional(), dataScadenza: z.string().max(400).optional(), furtoConsigliato: z.string().max(400).optional(),
  livelloConsigliato: z.string().max(200).optional(), note: z.string().max(4000).optional(),
});
export const bodyArea = z.object({ nome: z.string().trim().min(1).max(160).optional(), descrizione: z.string().max(4000).optional() });
export const bodyPunto = z.object({
  nome: z.string().trim().min(1).max(200).optional(), descrizione: z.string().max(4000).optional(),
  tipo: z.enum(TIPI_PUNTO).optional(), esauribile: z.boolean().optional(), ordine: z.number().int().min(0).max(9999).optional(),
});
export const bodyNuovoPunto = bodyPunto.extend({ nome: z.string().trim().min(1).max(200), tipo: z.enum(TIPI_PUNTO) });
