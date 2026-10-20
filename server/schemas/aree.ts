// ============================================================
// Schemi zod — le Aree del mondo (L2, `/api/aree`)
// ============================================================

import { z } from 'zod';
import { CONTENITORI_AREA } from '../services/mappe/areeService.js';
import { boolQuery, idParam } from './comuni.js';

/** Il contenitore e la sua chiave: `citta/<quartiere>` o `citta/tokyo` (la città); L3 aggiungerà `dungeon`. */
export const paramsContenitore = z.object({ contenitore: z.enum(CONTENITORI_AREA), chiave: z.string().min(1).max(80) });
/** Un'Area del contenitore, per slug. */
export const paramsArea = paramsContenitore.extend({ slug: z.string().min(1).max(120) });

/** La pagina di un'Area, con la partita facoltativa. */
export const queryDettaglioArea = z.object({ partita: idParam.optional() });

const coordinata = z.coerce.number().min(0).max(100);
/** Creazione di un'Area: il corpo è l'immagine della prima planimetria; nome, punto sull'illustrazione (in coppia) ed etichetta in query. */
export const queryCreaArea = z.object({
  nome: z.string().min(1).max(80),
  x: coordinata.optional(),
  y: coordinata.optional(),
  etichetta: z.string().max(80).optional(),
}).refine((q) => (q.x === undefined) === (q.y === undefined), { message: 'Il punto sull’illustrazione vuole x e y insieme.', path: ['x'] });

/** Una planimetria in più: il corpo è l'immagine; etichetta e «diventa la predefinita» in query. */
export const queryAggiungiPlanimetria = z.object({ etichetta: z.string().max(80).optional(), predefinita: boolQuery });

/** Correzione di un'Area: nome, predefinita (chiave pubblica di una sua planimetria), «Tieni» per un'Area da verificare. */
export const bodyAggiornaArea = z.object({
  nome: z.string().max(80).optional(),
  predefinita: z.string().min(1).max(200).optional(),
  daVerificare: z.literal(false).optional(),
}).strict();

/** L'ordine delle Aree del contenitore: tutti gli slug, una volta. */
export const bodyOrdineAree = z.object({ slug: z.array(z.string().min(1).max(120)).max(200) }).strict();

/** L'ordine e le etichette delle versioni di un'Area (chiavi pubbliche delle sue planimetrie). */
export const bodyVersioni = z.object({
  ordine: z.array(z.string().min(1).max(200)).max(100).optional(),
  etichette: z.record(z.string().min(1).max(200), z.string().max(80).nullable()).optional(),
}).strict();

/** L'eliminazione: `conferma=1` quando l'Area ha contenuti. */
export const queryEliminaArea = z.object({ conferma: boolQuery });

/** «Colloca»: una planimetria senza Area in un'Area esistente (slug) o in una nuova (nome), con l'etichetta della versione. */
export const bodyColloca = z.object({
  mappa: z.string().min(1).max(200),
  quartiere: z.string().min(1).max(80),
  area: z.string().min(1).max(120).optional(),
  nuova: z.object({ nome: z.string().min(1).max(80) }).strict().optional(),
  etichetta: z.string().max(80).optional(),
}).strict();
