import { z } from 'zod';
import { CATEGORIE_OGGETTO } from '../../shared/catalogo.js';
import { TIPI_PROPOSTA_OGGETTO } from '../../shared/types.js';
import { slug } from '../../shared/slug.js';
import { costoScambio } from './catalogo.js';
import { condizioneSpillo } from './mappe.js';

/** Metadati interni delle proposte, condivisi con la fusione dei riferimenti. */
export const rettificaPropostaOggetto = z.object({
  azione: z.enum(['collega', 'nascondi', 'crea']), ruolo: z.literal('costo').optional(),
  prezzo: z.number().int().nonnegative().optional(), condizioni: z.array(condizioneSpillo).max(20).optional(),
  negozio: z.string().min(1).optional(), ordine: z.number().int().nonnegative().optional(),
  categoria: z.enum(CATEGORIE_OGGETTO).optional(), quantita: z.number().int().positive().optional(),
  prima: z.record(z.string(), z.unknown()).nullable().optional(),
  costo: costoScambio.optional(), nome_offerta: z.string().trim().min(1).max(160).optional(),
  nota_offerta: z.string().max(6000).optional(), fonte: z.string().max(2000).optional(),
  ricevuti: z.array(z.object({ chiave: z.string().min(1).max(600), quantita: z.number().int().min(1).max(999999), nota: z.string().max(6000).nullable() }).strict())
    .max(40).refine((v) => new Set(v.map((r) => r.chiave)).size === v.length, 'Un risultato va indicato una sola volta.').optional(),
}).refine((m) => m.ricevuti === undefined || (m.azione === 'crea' && !!m.nome_offerta && m.costo?.tipo === 'oggetti' && m.prezzo === undefined),
  'Un baratto composto crea una sola offerta, con nome e costo in oggetti.');
export type RettificaPropostaOggetto = z.infer<typeof rettificaPropostaOggetto>;

const nome = z.string().trim().min(1).max(300);
const chiave = z.string().min(1).max(600);
const campi = z.object({
  categoria: z.enum(CATEGORIE_OGGETTO), nome: nome.refine((n) => slug(n).length > 0, 'Il nome deve contenere almeno una lettera o un numero.'),
  sottocategoria: z.string().trim().max(100).nullable(),
  nomiAltri: z.array(nome).max(60),
  nomeOriginale: z.string().trim().max(300).nullable(),
  effetto: z.string().trim().max(6000), descrizione: z.string().trim().max(20000),
  statistiche: z.record(z.string().max(100), z.unknown()).nullable()
    .refine((v) => JSON.stringify(v).length <= 20000, 'Le statistiche sono troppo lunghe.'),
}).strict();
// I default sono solo della creazione: un PUT parziale non deve azzerare descrizione, alias o statistiche omessi.
export const bodyNuovoOggetto = campi.extend({
  sottocategoria: campi.shape.sottocategoria.default(null), nomiAltri: campi.shape.nomiAltri.default([]),
  nomeOriginale: campi.shape.nomeOriginale.default(null), effetto: campi.shape.effetto.default(''),
  descrizione: campi.shape.descrizione.default(''), statistiche: campi.shape.statistiche.default(null),
});
export const bodyOggetto = campi.partial().refine((v) => Object.keys(v).length > 0, 'Indica almeno un campo da aggiornare.');
export type DatiCatalogoOggetto = z.infer<typeof bodyNuovoOggetto>;

export const paramsOggetto = z.object({ categoria: z.enum(CATEGORIE_OGGETTO), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(500) });
export const queryCatalogoOggetti = z.object({
  categoria: z.enum(CATEGORIE_OGGETTO).optional(), q: z.string().trim().max(300).optional(),
  partita: z.coerce.number().int().positive().optional(), nascosti: z.enum(['1']).optional(),
});
export const bodyPropostaOggetto = z.object({ riga_tipo: z.enum(TIPI_PROPOSTA_OGGETTO), riga_chiave: chiave, catalogo_chiave: chiave.nullable(), gruppo: z.string().max(600).default('') }).strict();
export const bodyLegameOggetto = bodyPropostaOggetto.extend({
  catalogo_chiave: chiave,
  quantita: z.number().int().min(1).max(999999).nullable().optional(),
  nota: z.string().trim().max(6000).nullable().optional(),
  togli: z.boolean().default(false),
  precedente_catalogo_chiave: chiave.optional(),
  proposta_catalogo_chiave: chiave.nullable().optional(),
}).strict().refine((v) => v.quantita !== null || (v.riga_tipo === 'ricompensa' && v.riga_chiave.startsWith('ricetta/')),
  'La quantità può essere non indicata soltanto per il prodotto di una ricetta.');
export type DatiPropostaOggetto = z.infer<typeof bodyPropostaOggetto>;
export type DatiLegameOggetto = z.infer<typeof bodyLegameOggetto>;
