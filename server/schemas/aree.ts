// ============================================================
// Schemi zod — le Aree del mondo (L2, `/api/aree`)
// ============================================================

import { z } from 'zod';
import { CONTENITORI_AREA } from '../services/mappe/areeService.js';
import { boolQuery, idParam } from './comuni.js';
import { condizioneSpillo } from './mappe.js';

/** Il contenitore e la sua chiave: `citta/<quartiere>` o `citta/tokyo` (la città), `dungeon/<palazzo>` (L3). */
export const paramsContenitore = z.object({ contenitore: z.enum(CONTENITORI_AREA), chiave: z.string().min(1).max(80) });
/** Un'Area del contenitore, per slug. */
export const paramsArea = paramsContenitore.extend({ slug: z.string().min(1).max(120) });

/** La pagina di un'Area (e l'elenco delle Aree), con la partita facoltativa (nei Palazzi conta la raccolta). */
export const queryDettaglioArea = z.object({ partita: idParam.optional() });

const coordinata = z.coerce.number().min(0).max(100);
/** Le chiavi delle infiltrazioni separate da virgola (L3), senza vuoti né ripetizioni. */
const elencoInfiltrazioni = z.string().max(4000).transform((s) => s.split(',').map((k) => k.trim()).filter((k) => k.length > 0))
  .refine((a) => a.length <= 100 && new Set(a).size === a.length && a.every((k) => k.length <= 200), { message: 'Infiltrazioni non valide o ripetute.' });
/**
 * Creazione di un'Area: il corpo è l'immagine della prima planimetria; nome, punto sull'illustrazione (in coppia, solo nel mondo),
 * etichetta e — nei Palazzi (L3) — le infiltrazioni da collegare (chiavi separate da virgola) in query.
 */
export const queryCreaArea = z.object({
  nome: z.string().min(1).max(80),
  x: coordinata.optional(),
  y: coordinata.optional(),
  etichetta: z.string().max(80).optional(),
  infiltrazioni: elencoInfiltrazioni.optional(),
}).refine((q) => (q.x === undefined) === (q.y === undefined), { message: 'Il punto sull’illustrazione vuole x e y insieme.', path: ['x'] });

/** L3 (R3-23, dall'area): le infiltrazioni che toccano un'Area di un Palazzo (chiavi), l'insieme che sostituisce quello di prima. */
export const bodyInfiltrazioniArea = z.object({
  infiltrazioni: z.array(z.string().min(1).max(200)).max(100).refine((a) => new Set(a).size === a.length, { message: 'Un’infiltrazione compare due volte.' }),
}).strict();

/** Una planimetria in più: il corpo è l'immagine; etichetta e «diventa la predefinita» in query. */
export const queryAggiungiPlanimetria = z.object({ etichetta: z.string().max(80).optional(), predefinita: boolQuery });

/** Correzione di un'Area: nome, predefinita (chiave pubblica di una sua planimetria), «Tieni» per un'Area da verificare. */
export const bodyAggiornaArea = z.object({
  nome: z.string().max(80).optional(),
  predefinita: z.string().min(1).max(200).optional(),
  daVerificare: z.literal(false).optional(),
}).strict();

/** La condizione propria di un'Area (303), in AND con quella del quartiere; un elenco vuoto la toglie. */
export const bodySbloccoArea = z.object({ condizioni: z.array(condizioneSpillo).max(20) }).strict();

/** L'ordine delle Aree del contenitore: tutti gli slug, una volta. */
export const bodyOrdineAree = z.object({ slug: z.array(z.string().min(1).max(120)).max(200) }).strict();

/** L'ordine e le etichette delle versioni di un'Area (chiavi pubbliche delle sue planimetrie). */
export const bodyVersioni = z.object({
  ordine: z.array(z.string().min(1).max(200)).max(100).optional(),
  etichette: z.record(z.string().min(1).max(200), z.string().max(80).nullable()).optional(),
}).strict();

/** L'eliminazione: `conferma=1` quando l'Area ha contenuti. */
export const queryEliminaArea = z.object({ conferma: boolQuery });

/** «Colloca»: `conferma=1` quando la versione spostata è l'unica della sua Area, che si svuota e va nel cestino (L3 §3.6.1). */
export const queryColloca = z.object({ conferma: boolQuery });

/**
 * «Colloca»: una planimetria senza Area in un'Area esistente (slug) o in una nuova (nome), con l'etichetta della versione; il contenitore
 * è il `quartiere` (o `tokyo`) oppure, da L3, il `dungeon` (lì anche «Sposta la versione in un'altra area» e «Rendila un'area a sé»).
 */
export const bodyColloca = z.object({
  mappa: z.string().min(1).max(200),
  quartiere: z.string().min(1).max(80).optional(),
  dungeon: z.string().min(1).max(80).optional(),
  area: z.string().min(1).max(120).optional(),
  nuova: z.object({ nome: z.string().min(1).max(80) }).strict().optional(),
  etichetta: z.string().max(80).optional(),
}).strict().refine((b) => (b.quartiere === undefined) !== (b.dungeon === undefined), { message: 'Indica il quartiere (o la città) oppure il Palazzo.', path: ['quartiere'] });
