// ============================================================
// Schemi zod — Negoziazione per umore (L8, B5)
// ============================================================

import { z } from 'zod';
import { testoRicerca } from './comuni.js';
import { UMORI } from '../../shared/elementi.js';

/**
 * `GET /api/compendio/negoziazione`: un umore (una delle quattro personalità), oppure un'Ombra (che porta al suo umore: la personalità valida
 * che l'Ombra ha, mai una dedotta dal nome), e la ricerca per testo su domande e risposte. Senza umore né Ombra: tutti e quattro gli umori.
 * Un umore sconosciuto è un errore di validazione, non una scelta silenziosa.
 */
export const queryNegoziazione = z.object({
  umore: z.enum(UMORI.map((u) => u.chiave) as [string, ...string[]]).optional(),
  ombra: z.string().trim().min(1).max(120).optional(),
  q: testoRicerca,
  /** Una sola famiglia di domande, con tutto il dettaglio (varianti, attestazioni): si apre da un tocco nella vista compatta. */
  domanda: z.string().trim().min(1).max(160).optional(),
  /** `1` = la forma compatta per consultarla in battaglia (un umore alla volta, poche decine di KB). */
  compatto: z.enum(['0', '1']).optional(),
});
export type QueryNegoziazione = z.infer<typeof queryNegoziazione>;
