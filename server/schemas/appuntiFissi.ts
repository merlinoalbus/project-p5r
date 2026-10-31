// ============================================================
// Schemi zod degli appunti fissi del Diario (2026-10-31, C7): i limiti sono quelli di `shared/appuntiFissi.ts`
// ============================================================

import { z } from 'zod';
import { LIMITE_APPUNTI, LIMITE_TESTO_APPUNTO, LIMITE_TITOLO_APPUNTO } from '../../shared/appuntiFissi.js';

/** Il titolo, ripulito ai capi: da 1 a 80 caratteri. */
const titolo = z.string().trim().min(1, 'Il titolo non può essere vuoto.').max(LIMITE_TITOLO_APPUNTO, `Il titolo può avere al massimo ${LIMITE_TITOLO_APPUNTO} caratteri.`);
/** Il testo, conservato com'è (il blocco delle voci del Diario va tenuto intatto): da 1 a 200.000 caratteri, non di soli spazi. */
const testo = z.string().min(1, 'Il testo non può essere vuoto.').max(LIMITE_TESTO_APPUNTO, `Il testo può avere al massimo ${LIMITE_TESTO_APPUNTO} caratteri.`)
  .refine((t) => t.trim().length > 0, 'Il testo non può essere fatto di soli spazi.');

const id = z.coerce.number().int().positive();

export const paramsAppuntoFisso = z.object({ id }).strict();

export const bodyNuovoAppuntoFisso = z.object({ titolo, testo }).strict();
export type DatiNuovoAppuntoFisso = z.infer<typeof bodyNuovoAppuntoFisso>;

export const bodyModificaAppuntoFisso = z.object({ titolo: titolo.optional(), testo: testo.optional() }).strict()
  .refine((d) => d.titolo !== undefined || d.testo !== undefined, 'Indica il titolo, il testo o entrambi.');
export type DatiModificaAppuntoFisso = z.infer<typeof bodyModificaAppuntoFisso>;

export const bodyOrdineAppuntiFissi = z.object({ ids: z.array(z.number().int().positive()).max(LIMITE_APPUNTI) }).strict();
export type DatiOrdineAppuntiFissi = z.infer<typeof bodyOrdineAppuntiFissi>;
