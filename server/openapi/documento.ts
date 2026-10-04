// ============================================================
// documento — il documento OpenAPI 3.1 dell'API, costruito dalle rotte montate e dagli schemi zod
// ============================================================
//
// Tre fonti, nessuna copiata a mano:
// - le rotte (metodo, percorso, gestori) vengono dalla pila dei router (`rotte.ts`);
// - parametri, query e corpo vengono dagli schemi zod di `validate` (`schemiDiValidazione`), convertiti
//   con `z.toJSONSchema` nella forma d'ingresso (quella che il client manda, prima delle coercizioni);
// - sommario, descrizione e risposta vengono dal registro in italiano (`descrizioni/`).
// Lo stato di successo (200, 201, 204) e il tipo di risposta (JSON o file) si leggono dal gestore finale.
//
// Gli schemi ricorsivi (i gruppi di condizioni) zod li scrive con `$defs` locali: in un documento OpenAPI un
// `$ref` «#/$defs/…» si risolverebbe contro la radice del documento, quindi le definizioni salgono in
// `components.schemas` con un nome unico e i riferimenti vengono riscritti.
// ============================================================

import type { Express } from 'express';
import { z, type ZodType } from 'zod';
import { config } from '../config.js';
import { schemiDiValidazione } from '../middleware/validate.js';
import { chiaveRotta, elencaRotte, type RottaMontata } from './rotte.js';
import { AREE, DESCRIZIONI } from './descrizioni/index.js';
import type { DescrizioneRotta } from './tipi.js';

type Schema = Record<string, unknown>;

/** Il registro degli schemi condivisi del documento in costruzione e un contatore per i nomi unici. */
interface Componenti { schemi: Record<string, Schema>; prossimo: number }

/** Riscrive i `$ref` locali di uno schema verso i nomi assegnati in `components.schemas`. */
function riscriviRiferimenti(valore: unknown, nomi: Map<string, string>): unknown {
  if (Array.isArray(valore)) return valore.map((v) => riscriviRiferimenti(v, nomi));
  if (!valore || typeof valore !== 'object') return valore;
  const out: Schema = {};
  for (const [k, v] of Object.entries(valore as Schema)) {
    if (k === '$ref' && typeof v === 'string' && v.startsWith('#/$defs/')) out[k] = `#/components/schemas/${nomi.get(v.slice(8)) ?? v.slice(8)}`;
    else out[k] = riscriviRiferimenti(v, nomi);
  }
  return out;
}

/**
 * Converte uno schema zod nello schema JSON d'ingresso: toglie `$schema`, sposta le `$defs` in `components.schemas`
 * con un nome unico (`Definizione<n>`) e riscrive i riferimenti. Un tipo non rappresentabile diventa «qualunque».
 */
function schemaJson(schema: ZodType, comp: Componenti): Schema {
  const grezzo = z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Schema;
  const { $schema: _s, $defs, ...resto } = grezzo as Schema & { $defs?: Record<string, Schema> };
  if (!$defs) return resto;
  const nomi = new Map(Object.keys($defs).map((k) => [k, `Definizione${++comp.prossimo}`]));
  for (const [k, def] of Object.entries($defs)) comp.schemi[nomi.get(k)!] = riscriviRiferimenti(def, nomi) as Schema;
  return riscriviRiferimenti(resto, nomi) as Schema;
}

/** Il percorso in sintassi OpenAPI: `/:chiave` diventa `/{chiave}`. */
const percorsoOpenApi = (p: string): string => p.replace(/:([A-Za-z0-9_]+)/g, '{$1}');

/** I nomi dei parametri di percorso, nell'ordine in cui compaiono. */
export const parametriDelPercorso = (p: string): string[] => [...p.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);

/** Il gestore finale della rotta (quello che risponde) e il suo sorgente. */
const sorgenteFinale = (r: RottaMontata): string => String(r.gestori[r.gestori.length - 1]);

/** Lo stato di successo letto dal gestore finale: 201 o 204 se li imposta, altrimenti 200. */
export function statoDiSuccesso(r: RottaMontata): number {
  const s = sorgenteFinale(r);
  if (/\.status\(\s*201\s*\)/.test(s)) return 201;
  if (/\.status\(\s*204\s*\)|sendStatus\(\s*204\s*\)/.test(s)) return 204;
  return 200;
}

/** Vero se il gestore finale risponde con l'involucro JSON (`res.json`). */
export const rispondeJson = (r: RottaMontata): boolean => /\bres\.(status\([^)]*\)\.)?json\(/.test(sorgenteFinale(r));

/** Gli schemi di `validate` della rotta, fusi (una rotta ne ha al più uno). */
export function schemiDellaRotta(r: RottaMontata): { body?: ZodType; params?: ZodType; query?: ZodType } {
  return Object.assign({}, ...r.gestori.map((g) => schemiDiValidazione(g) ?? {}));
}

/** Vero se fra i gestori c'è `express.raw`: il corpo arriva come byte. */
export const haCorpoBinario = (r: RottaMontata): boolean => r.gestori.some((g) => g.name === 'rawParser');

/** I parametri OpenAPI di percorso e di query, con gli schemi presi dagli schemi zod quando ci sono. */
function parametri(r: RottaMontata, schemi: ReturnType<typeof schemiDellaRotta>, comp: Componenti): Schema[] {
  const out: Schema[] = [];
  /** Le proprietà dello schema JSON di un oggetto zod e l'insieme di quelle obbligatorie; vuote se lo schema manca. */
  const proprieta = (s: ZodType | undefined): { props: Record<string, Schema>; richiesti: Set<string> } => {
    if (!s) return { props: {}, richiesti: new Set() };
    const j = schemaJson(s, comp) as { properties?: Record<string, Schema>; required?: string[] };
    return { props: j.properties ?? {}, richiesti: new Set(j.required ?? []) };
  };
  const p = proprieta(schemi.params);
  for (const nome of parametriDelPercorso(r.percorso)) out.push({ name: nome, in: 'path', required: true, schema: p.props[nome] ?? { type: 'string' } });
  const q = proprieta(schemi.query);
  for (const [nome, schema] of Object.entries(q.props)) {
    const { description, ...solo } = schema as Schema & { description?: string };
    out.push({ name: nome, in: 'query', required: q.richiesti.has(nome), schema: solo, ...(description ? { description } : {}) });
  }
  return out;
}

/** Il corpo della richiesta: dallo schema di `validate`, dalle varianti del registro, o binario. */
function corpoRichiesta(r: RottaMontata, d: DescrizioneRotta, schemi: ReturnType<typeof schemiDellaRotta>, comp: Componenti): Schema | undefined {
  if (schemi.body) return { required: true, content: { 'application/json': { schema: schemaJson(schemi.body, comp) } } };
  if (d.corpo) {
    const varianti = Object.entries(d.corpo.varianti).map(([valore, s]) => ({ title: `${d.corpo!.perParametro} = ${valore}`, ...schemaJson(s, comp) }));
    return {
      required: true,
      description: `Lo schema dipende dal parametro «${d.corpo.perParametro}» del percorso: una variante per valore.`,
      content: { 'application/json': { schema: { oneOf: varianti } } },
    };
  }
  if (d.corpoBinario && haCorpoBinario(r)) return { required: true, content: { [d.corpoBinario]: { schema: { type: 'string', format: 'binary' } } } };
  return undefined;
}

/**
 * Le operazioni che la pagina di Swagger non deve eseguire, come «metodo percorso-OpenAPI» («get /api/mappe/esporta»): sono le
 * rotte con `senzaProva` nel registro. Le GET qui dentro non sono semplici letture o pesano troppo per una pagina.
 */
export function operazioniSenzaProva(app: Express): string[] {
  return elencaRotte(app).filter((r) => DESCRIZIONI[chiaveRotta(r)]?.senzaProva).map((r) => `${r.metodo} ${percorsoOpenApi(r.percorso)}`);
}

/** Il documento OpenAPI completo dell'app (le rotte senza descrizione compaiono con un sommario che lo dice: il test lo vieta). */
export function documentoOpenApi(app: Express): Schema {
  const comp: Componenti = { schemi: {}, prossimo: 0 };
  const paths: Record<string, Record<string, Schema>> = {};
  for (const r of elencaRotte(app)) {
    const chiave = chiaveRotta(r);
    const d: DescrizioneRotta = DESCRIZIONI[chiave] ?? { sommario: `(senza descrizione) ${chiave}`, descrizione: '', risposta: '' };
    const schemi = schemiDellaRotta(r);
    const stato = statoDiSuccesso(r);
    const successo: Schema = stato === 204
      ? { description: d.risposta || 'Nessun contenuto.' }
      : rispondeJson(r)
        ? { description: d.risposta, content: { 'application/json': { schema: { type: 'object', required: ['data'], properties: { data: { description: d.risposta } } } } } }
        : { description: d.risposta, content: { [d.rispostaBinaria ?? 'application/octet-stream']: { schema: { type: 'string', format: 'binary' } } } };
    const errori: Record<string, Schema> = {};
    for (const [codice, nome] of d.errori ?? []) {
      const voce = errori[String(codice)] ?? { description: '', content: { 'application/json': { schema: { $ref: '#/components/schemas/Errore' } } } };
      voce.description = [voce.description, `\`${nome}\``].filter(Boolean).join(', ');
      errori[String(codice)] = voce;
    }
    if (schemi.body || schemi.params || schemi.query) errori['400'] ??= { description: '`validation-error`: la richiesta non rispetta lo schema (dettagli in `error.details.issues`).', content: { 'application/json': { schema: { $ref: '#/components/schemas/Errore' } } } };
    const corpo = corpoRichiesta(r, d, schemi, comp);
    (paths[percorsoOpenApi(r.percorso)] ??= {})[r.metodo] = {
      operationId: `${r.metodo}${r.percorso.replace(/[^A-Za-z0-9]+(.)?/g, (_m, c: string | undefined) => (c ? c.toUpperCase() : ''))}`,
      tags: [AREE[r.area ?? 'sistema']?.nome ?? r.area ?? 'sistema'],
      summary: d.sommario,
      description: d.senzaProva ? `${d.descrizione}\n\n**Non si prova da questa pagina.** ${d.senzaProva}` : d.descrizione,
      ...(d.senzaProva ? { 'x-senza-prova': d.senzaProva } : {}),
      parameters: parametri(r, schemi, comp),
      ...(corpo ? { requestBody: corpo } : {}),
      responses: { [String(stato)]: successo, ...errori, default: { $ref: '#/components/responses/Errore' } },
    };
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'project-p5r — API',
      version: config.appVersion,
      description: [
        'API del compagno di gioco per Persona 5 Royal: compendio, fusioni, partite, guida, mappe, impostazioni.',
        '',
        'Ogni risposta riuscita in JSON ha la forma `{ "data": … }`; ogni errore ha la forma',
        '`{ "error": { "code", "message", "details"? }, "requestId" }`, con un codice in italiano stabile (`error.code`).',
        'Parametri, query e corpi descritti qui sono quelli validati dal server (schemi zod), nella forma che il client invia.',
      ].join('\n'),
    },
    servers: [{ url: '/', description: 'Questa istanza' }],
    tags: Object.values(AREE).map((a) => ({ name: a.nome, description: a.descrizione })),
    paths,
    components: {
      schemas: {
        Errore: {
          type: 'object',
          required: ['error', 'requestId'],
          properties: {
            error: {
              type: 'object',
              required: ['code', 'message'],
              properties: { code: { type: 'string', description: 'Codice stabile dell\'errore (es. `persona-non-trovata`).' }, message: { type: 'string', description: 'Messaggio in italiano.' }, details: { description: 'Dettagli facoltativi (es. `issues` della validazione).' } },
            },
            requestId: { type: 'string', description: 'Identificativo della richiesta, lo stesso dei log del server.' },
          },
        },
        ...comp.schemi,
      },
      responses: {
        Errore: { description: 'Errore: 4xx per richieste non valide o risorse mancanti, 500 per un errore interno.', content: { 'application/json': { schema: { $ref: '#/components/schemas/Errore' } } } },
      },
    },
  };
}
