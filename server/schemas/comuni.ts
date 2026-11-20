// ============================================================
// Schemi zod comuni — parametri numerici, booleani ed elenchi da query string, date di gioco, Doti e categorie
// ============================================================
//
// I pezzi che più schemi usano stanno qui, una volta sola: prima la data MM-GG era scritta sette volte (con tre messaggi
// diversi), l'id intero tre, il booleano da query due con nomi diversi, le Doti tre e le categorie degli articoli due (rilievo
// F16 della verifica completa, 2026-10-03).
// ============================================================

import { z } from 'zod';
import { CHIAVI_DOTI } from '../../shared/doti.js';
import { CATEGORIE_ARTICOLO } from '../../shared/articoli.js';

/** Intero positivo da parametro di percorso o di query (":id", "partita=3"). */
export const idParam = z.coerce.number().int().positive();

/** Booleano da query string ('true'/'false'/'1'/'0'); undefined se assente. */
export const boolQuery = z
  .union([z.literal('true'), z.literal('false'), z.literal('1'), z.literal('0')])
  .transform((v) => v === 'true' || v === '1')
  .optional();

/** Testo di ricerca (max 100 caratteri, spazi ai bordi rimossi). */
export const testoRicerca = z.string().trim().max(100).optional();

/** Livello di gioco 1–99. */
export const livello = z.coerce.number().int().min(1).max(99);

/** Data del calendario di gioco, «MM-GG». */
export const dataGioco = z.string().regex(/^\d{2}-\d{2}$/, 'La data del gioco è nel formato MM-GG.');

/** Identità di una voce della giornata (32 cifre esadecimali). */
export const uidVoce = z.string().regex(/^[0-9a-f]{32}$/, 'Identità della voce non valida.');

/** Elenco di interi positivi separati da virgola («1,2,3»), al più `max`; un elemento non numerico rende invalida la richiesta. */
export function elencoInteri(max: number, min = 0) {
  return z
    .string()
    .transform((s) => s.split(',').map((x) => x.trim()).filter((x) => x.length > 0).map(Number))
    .pipe(z.array(z.number().int().positive()).min(min).max(max));
}

/** Una delle cinque Doti sociali. */
export const dote = z.enum(CHIAVI_DOTI);

/** Una categoria di articolo. */
export const categoriaArticolo = z.enum(CATEGORIE_ARTICOLO);

/** Il tipo di un campo senza il suo valore predefinito (`.default()` o `.prefault()`, anche ripetuti). */
type SenzaPredefinito<T> = T extends z.ZodDefault<infer I extends z.core.SomeType> | z.ZodPrefault<infer I extends z.core.SomeType> ? SenzaPredefinito<I> : T;

/** Un campo senza il suo valore predefinito: tolto anche sotto `.optional()` / `.nullable()` e in testa a una trasformazione
 *  (`.default(x).transform(f)`). Dentro un valore composto (un oggetto, un elenco) i predefiniti restano: lì completano il valore che
 *  si manda intero, non toccano altri campi della riga. La descrizione OpenAPI del campo, se c'era, resta. */
function senzaPredefinito(schema: z.core.$ZodType): z.core.$ZodType {
  const def = schema._zod.def;
  let nuovo: z.core.$ZodType;
  switch (def.type) {
    case 'default':
    case 'prefault':
      nuovo = senzaPredefinito((def as z.core.$ZodDefaultDef | z.core.$ZodPrefaultDef).innerType);
      break;
    case 'optional': {
      const interno = (def as z.core.$ZodOptionalDef).innerType;
      const pulito = senzaPredefinito(interno);
      nuovo = pulito === interno ? schema : z.optional(pulito);
      break;
    }
    case 'nullable': {
      const interno = (def as z.core.$ZodNullableDef).innerType;
      const pulito = senzaPredefinito(interno);
      nuovo = pulito === interno ? schema : z.nullable(pulito);
      break;
    }
    case 'pipe': {
      const { in: ingresso, out: uscita } = def as z.core.$ZodPipeDef;
      const pulito = senzaPredefinito(ingresso);
      nuovo = pulito === ingresso ? schema : z.pipe(pulito, uscita);
      break;
    }
    default:
      nuovo = schema;
  }
  const descrizione = nuovo === schema ? undefined : z.globalRegistry.get(schema);
  return descrizione ? (nuovo as z.ZodType).meta(descrizione) : nuovo;
}

/**
 * Lo schema per correggere alcuni campi soltanto di una riga: ogni campo facoltativo e senza il suo valore predefinito.
 * In zod 4 `.partial()` lascia attivi i `.default()`: un campo assente nel corpo prenderebbe il predefinito e sovrascriverebbe il dato
 * salvato (un `PUT` delle sole condizioni di un DVD lo riportava al cinema). I predefiniti valgono solo nello schema completo, cioè
 * alla creazione. Le rifiniture (`superRefine`) si aggiungono dopo, sulla forma parziale.
 */
export function parziale<S extends z.core.$ZodShape, C extends z.core.$ZodObjectConfig>(schema: z.ZodObject<S, C>) {
  const forma = Object.fromEntries(Object.entries(schema.shape).map(([campo, s]) => [campo, senzaPredefinito(s)]));
  return schema.extend(forma).partial() as unknown as z.ZodObject<{ -readonly [k in keyof S]: z.ZodOptional<Extract<SenzaPredefinito<S[k]>, z.core.SomeType>> }, C>;
}
