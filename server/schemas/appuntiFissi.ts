// ============================================================
// Schemi zod degli appunti fissi del Diario (2026-10-31, C7) e delle loro categorie (2026-11-02): i limiti sono quelli di `shared/appuntiFissi.ts`
// ============================================================

import { z } from 'zod';
import { LIMITE_APPUNTI, LIMITE_CATEGORIE, LIMITE_NOME_CATEGORIA, LIMITE_TESTO_APPUNTO, LIMITE_TITOLO_APPUNTO } from '../../shared/appuntiFissi.js';

/** Il titolo, ripulito ai capi: da 1 a 80 caratteri. */
const titolo = z.string().trim().min(1, 'Il titolo non può essere vuoto.').max(LIMITE_TITOLO_APPUNTO, `Il titolo può avere al massimo ${LIMITE_TITOLO_APPUNTO} caratteri.`);
/** Il testo, conservato com'è (il blocco delle voci del Diario va tenuto intatto): da 1 a 200.000 caratteri, non di soli spazi. */
const testo = z.string().min(1, 'Il testo non può essere vuoto.').max(LIMITE_TESTO_APPUNTO, `Il testo può avere al massimo ${LIMITE_TESTO_APPUNTO} caratteri.`)
  .refine((t) => t.trim().length > 0, 'Il testo non può essere fatto di soli spazi.');
/** Il nome di una categoria, ripulito ai capi: da 1 a 40 caratteri. */
const nome = z.string().trim().min(1, 'Il nome della categoria non può essere vuoto.')
  .max(LIMITE_NOME_CATEGORIA, `Il nome della categoria può avere al massimo ${LIMITE_NOME_CATEGORIA} caratteri.`);

const id = z.coerce.number().int().positive();
/** La categoria di un appunto: il suo id, o null per la lista senza categoria. */
const categoriaId = z.number().int().positive().nullable();

export const paramsAppuntoFisso = z.object({ id }).strict();
export const paramsCategoriaAppunti = z.object({ id }).strict();

export const bodyNuovoAppuntoFisso = z.object({ titolo, testo, categoriaId: categoriaId.optional() }).strict();
export type DatiNuovoAppuntoFisso = z.infer<typeof bodyNuovoAppuntoFisso>;

export const bodyModificaAppuntoFisso = z.object({ titolo: titolo.optional(), testo: testo.optional(), categoriaId: categoriaId.optional() }).strict()
  .refine((d) => d.titolo !== undefined || d.testo !== undefined || d.categoriaId !== undefined, 'Indica il titolo, il testo o la categoria.');
export type DatiModificaAppuntoFisso = z.infer<typeof bodyModificaAppuntoFisso>;

/** Il posto nuovo di un appunto: il gruppo e il posto lì (un posto oltre la fine vale «in fondo»). */
export const bodyPostoAppuntoFisso = z.object({ categoriaId, indice: z.number().int().min(0).max(LIMITE_APPUNTI) }).strict();
export type DatiPostoAppuntoFisso = z.infer<typeof bodyPostoAppuntoFisso>;

export const bodyNomeCategoriaAppunti = z.object({ nome }).strict();
export type DatiNomeCategoriaAppunti = z.infer<typeof bodyNomeCategoriaAppunti>;

/** Il posto nuovo di una categoria fra le categorie (un posto oltre la fine vale «in fondo»). */
export const bodyPostoCategoriaAppunti = z.object({ indice: z.number().int().min(0).max(LIMITE_CATEGORIE) }).strict();
export type DatiPostoCategoriaAppunti = z.infer<typeof bodyPostoCategoriaAppunti>;
