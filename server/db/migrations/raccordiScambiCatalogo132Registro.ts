// F5: copia congelata, identica, di `server/services/raccordiScambiCatalogoRegistro.ts` (e del suo manifesto
// `shared/raccordiScambiCatalogo132.json`, copiato accanto) com'era quando la migrazione 132 l'ha usata. Non modificarla: il servizio
// vivo è l'altro file.
// Registro informativo 132: nessuna identità commerciale viene scelta o riscritta.
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import manifestJson from './raccordiScambiCatalogo132.json' with { type: 'json' };
import type { AppDatabase } from '../dbService.js';

export const CHIAVE_RACCORDI_SCAMBI_132 = 'raccordi-scambi-catalogo-132';
export const VERSIONE_RACCORDI_SCAMBI_132 = 'raccordi-scambi-catalogo-132-v1';
const ruolo = z.enum(['offerta-principale', 'variante-non-equiparata', 'riferimento-archivio']);
const destinazione = z.object({ articolo: z.string().min(1), ruolo }).strict();
const disposizione = z.enum(['offerta', 'archivio']);
const relazione = z.enum(['singola', 'offerte-distinte', 'archivio-con-rinvii']);
const layout = {
  percorso: z.string().min(1), disposizione, destinazioni: z.array(destinazione).min(1),
  fontiComplete: z.array(z.string()), relazione, rilievi: z.array(z.string()),
};
const nodoManifest = z.object({ ...layout, rawFonte: z.record(z.string(), z.unknown()), gruppo: z.string().nullable() }).strict();
const schemaManifest = z.object({
  versione: z.literal(1), specifica: z.literal('43ad8889'),
  origine: z.object({ percorso: z.literal('pacchetto/gioco.db'), versione: z.literal(93), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict(),
  gruppi: z.array(z.object({ percorso: z.string(), rawMetadati: z.record(z.string(), z.unknown()) }).strict()).length(5),
  nodi: z.array(nodoManifest).length(97),
}).strict();
export type NodoManifestScambi132 = z.infer<typeof nodoManifest>;
export const MANIFEST_SCAMBI_132 = schemaManifest.parse(manifestJson);
const nodi = new Map(MANIFEST_SCAMBI_132.nodi.map((n) => [n.percorso, n]));
const gruppi = new Map(MANIFEST_SCAMBI_132.gruppi.map((g) => [g.percorso, g.rawMetadati]));
if (nodi.size !== 97 || gruppi.size !== 5 || MANIFEST_SCAMBI_132.nodi.some((n) =>
  (n.gruppo !== null && !gruppi.has(n.gruppo)) || n.fontiComplete.some((p) => !nodi.has(p))
  || new Set(n.destinazioni.map((d) => d.articolo)).size !== n.destinazioni.length)) {
  throw new Error('Manifest pubblico dei raccordi 132 incoerente.');
}
export const nodoManifestScambi132 = (percorso: string): NodoManifestScambi132 | undefined => nodi.get(percorso);

export interface BloccoScambiRaw { presente: boolean; json: unknown }
export type BlocchiScambiRaw = ReadonlyMap<'jose' | 'oggetti-guida', BloccoScambiRaw>;
export function leggiBlocchiScambiRaw(db: AppDatabase): BlocchiScambiRaw {
  const righe = db.prepare("SELECT chiave,json FROM dati_guida WHERE chiave IN ('jose','oggetti-guida')").all() as Array<{ chiave: 'jose' | 'oggetti-guida'; json: unknown }>;
  return new Map((['jose', 'oggetti-guida'] as const).map((chiave) => {
    const r = righe.find((v) => v.chiave === chiave);
    return [chiave, { presente: r !== undefined, json: r?.json ?? null }];
  }));
}
export const recordScambi132 = (v: unknown): Record<string, unknown> | null => v !== null && typeof v === 'object' && !Array.isArray(v)
  ? v as Record<string, unknown> : null;
export function parseScambi132(v: unknown): { leggibile: boolean; valore: unknown } {
  if (typeof v !== 'string') return { leggibile: false, valore: v };
  try { return { leggibile: true, valore: JSON.parse(v) as unknown }; }
  catch { return { leggibile: false, valore: v }; }
}

const schemaFotografia = z.object({
  stato: z.enum(['presente', 'assente', 'non-supportata']), raw: z.unknown(), gruppoRaw: z.unknown(),
}).strict();
export type FotografiaFonteScambio132 = z.infer<typeof schemaFotografia>;
/** Mantiene i valori RAW, compresi i contenitori illeggibili: non risolve nodi spostati per nome. */
export function fotografiaFonteScambio132(blocchi: BlocchiScambiRaw, n: NodoManifestScambi132): FotografiaFonteScambio132 {
  const parti = n.percorso.split('/'); const blocco = blocchi.get(parti[0] as 'jose' | 'oggetti-guida');
  if (!blocco?.presente) return { stato: 'assente', raw: null, gruppoRaw: null };
  const parsed = parseScambi132(blocco.json); const radice = recordScambi132(parsed.valore);
  if (!parsed.leggibile || !radice) return { stato: 'non-supportata', raw: parsed.valore, gruppoRaw: null };
  if (!Object.hasOwn(radice, 'scambi')) return { stato: 'assente', raw: null, gruppoRaw: null };
  if (!Array.isArray(radice.scambi)) return { stato: 'non-supportata', raw: radice.scambi, gruppoRaw: null };
  const indice = Number(parti[2]);
  if (indice >= radice.scambi.length) return { stato: 'assente', raw: null, gruppoRaw: null };
  const contenuto: unknown = radice.scambi[indice];
  if (n.gruppo === null) return { stato: recordScambi132(contenuto) ? 'presente' : 'non-supportata', raw: contenuto, gruppoRaw: null };
  const gruppo = recordScambi132(contenuto);
  if (!gruppo) return { stato: 'non-supportata', raw: contenuto, gruppoRaw: contenuto };
  const gruppoRaw = Object.fromEntries(Object.entries(gruppo).filter(([k]) => k !== 'offerte'));
  if (!Object.hasOwn(gruppo, 'offerte')) return { stato: 'assente', raw: null, gruppoRaw };
  if (!Array.isArray(gruppo.offerte)) return { stato: 'non-supportata', raw: gruppo.offerte, gruppoRaw };
  const offerta = Number(parti[4]);
  if (offerta >= gruppo.offerte.length) return { stato: 'assente', raw: null, gruppoRaw };
  const raw: unknown = gruppo.offerte[offerta];
  return { stato: recordScambi132(raw) ? 'presente' : 'non-supportata', raw, gruppoRaw };
}

const esitoRegistrazione = z.enum(['fonte-coincidente', 'fonte-diversa', 'fonte-assente', 'fonte-non-supportata']);
const nodoRegistro = z.object({ ...layout, fonte: schemaFotografia, esitoRegistrazione }).strict();
const schemaRegistro = z.object({
  versione: z.literal(1), manifest: z.literal(VERSIONE_RACCORDI_SCAMBI_132), registratoIl: z.string().datetime(),
  nodi: z.array(nodoRegistro).length(97),
}).strict();
export type RegistroRaccordiScambi132 = z.infer<typeof schemaRegistro>;
export type NodoRegistroScambi132 = z.infer<typeof nodoRegistro>;
export type StatoRegistroScambi132 = { stato: 'valido'; registro: RegistroRaccordiScambi132 }
  | { stato: 'assente' | 'non-supportato'; registro: null };

export function esitoFonteScambio132(f: FotografiaFonteScambio132, n: NodoManifestScambi132): NodoRegistroScambi132['esitoRegistrazione'] {
  if (f.stato === 'assente') return 'fonte-assente';
  if (f.stato === 'non-supportata') return 'fonte-non-supportata';
  return isDeepStrictEqual(f.raw, n.rawFonte) && isDeepStrictEqual(f.gruppoRaw, n.gruppo === null ? null : gruppi.get(n.gruppo))
    ? 'fonte-coincidente' : 'fonte-diversa';
}
export function layoutNodoScambio132(n: NodoManifestScambi132): Pick<NodoRegistroScambi132, keyof typeof layout> {
  return { percorso: n.percorso, disposizione: n.disposizione, destinazioni: n.destinazioni,
    fontiComplete: n.fontiComplete, relazione: n.relazione, rilievi: n.rilievi };
}
/** Tutto il registro deve essere riconosciuto: nessun target o percorso importato diventa attendibile per la sola versione. */
export function validaRegistroScambi132(v: unknown): RegistroRaccordiScambi132 | null {
  const esito = schemaRegistro.safeParse(v);
  if (!esito.success || new Set(esito.data.nodi.map((n) => n.percorso)).size !== 97) return null;
  for (const r of esito.data.nodi) {
    const n = nodi.get(r.percorso);
    if (!n || !Object.hasOwn(r.fonte, 'raw') || !Object.hasOwn(r.fonte, 'gruppoRaw')) return null;
    const { fonte, esitoRegistrazione: decisione, ...raccordo } = r;
    if (!isDeepStrictEqual(raccordo, layoutNodoScambio132(n)) || decisione !== esitoFonteScambio132(fonte, n)) return null;
    if (fonte.stato === 'presente' && (!recordScambi132(fonte.raw)
      || (n.gruppo === null ? fonte.gruppoRaw !== null : !recordScambi132(fonte.gruppoRaw)))) return null;
  }
  return esito.data;
}
export function leggiRegistroScambi132(db: AppDatabase): StatoRegistroScambi132 {
  const r = db.prepare('SELECT json FROM dati_guida WHERE chiave=?').get(CHIAVE_RACCORDI_SCAMBI_132) as { json: unknown } | undefined;
  if (!r) return { stato: 'assente', registro: null };
  const p = parseScambi132(r.json); const registro = p.leggibile ? validaRegistroScambi132(p.valore) : null;
  return registro ? { stato: 'valido', registro } : { stato: 'non-supportato', registro: null };
}
