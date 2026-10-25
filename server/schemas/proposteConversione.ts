// ============================================================
// Schemi zod — proposte «da completare» sulle voci del Diario (L13, ondata 4a; solo preparazione)
// ============================================================

import { z } from 'zod';
import { dataGioco } from './comuni.js';
import { effettoVoce } from './acquisti.js';
import { bodyAggiornaVoce } from './compendio.js';

const revisione = z.string().regex(/^[0-9a-f]{64}$/, 'Revisione non valida.');

export const paramsPropostaConversione = z.object({ id: z.string().min(1).max(120) }).strict();
/** Il periodo (giorni di gioco «MM-GG», estremi compresi) e lo stato; senza stato, le aperte. */
export const queryProposteConversione = z.object({
  da: dataGioco.optional(),
  a: dataGioco.optional(),
  stato: z.enum(['aperta', 'applicata', 'scartata', 'tutte']).optional(),
  partita: z.coerce.number().int().positive().optional(),
});
export const queryApplicaProposta = z.object({ partita: z.coerce.number().int().positive().optional() });
/** Applica: gli effetti proposti completati (stesso ordine della proposta) oppure la voce della finestra («Modifica»), non tutti e due. */
export const bodyApplicaProposta = z.object({
  revisionePropostaAttesa: revisione,
  effetti: z.array(effettoVoce).max(100).optional(),
  voce: bodyAggiornaVoce.optional(),
}).strict().refine((b) => b.effetti === undefined || b.voce === undefined, 'Invia gli effetti completati oppure la voce della finestra, non tutti e due.');
export const bodyScartaProposta = z.object({ revisionePropostaAttesa: revisione }).strict();
