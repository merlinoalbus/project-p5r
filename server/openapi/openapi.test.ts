// ============================================================
// Test openapi — copertura del registro delle descrizioni, validità del documento OpenAPI 3.1, rotte della documentazione
// ============================================================
//
// Il documento si costruisce dalle rotte vere: questo test tiene il registro in italiano allineato ai router
// (ogni rotta descritta, nessuna descrizione orfana) e controlla che quel che il registro afferma sia coerente
// con il codice: tipi `…Dto` esistenti in `shared/`, risposta JSON o file come fa davvero il gestore, corpo
// binario dove c'è `express.raw`, codici d'errore che il server lancia davvero.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import { Validator } from '@seriousme/openapi-schema-validator';
import { closeDb, initDb } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { chiaveRotta, elencaRotte } from './rotte.js';
import { documentoOpenApi, haCorpoBinario, parametriDelPercorso, rispondeJson, schemiDellaRotta, statoDiSuccesso } from './documento.js';
import { AREE, DESCRIZIONI } from './descrizioni/index.js';

const RADICE = path.resolve(import.meta.dirname, '../..');

/** I file `.ts` di una cartella, ricorsivamente, test esclusi. */
function sorgenti(cartella: string): string[] {
  return fs.readdirSync(cartella, { withFileTypes: true }).flatMap((v) => {
    const p = path.join(cartella, v.name);
    if (v.isDirectory()) return v.name === 'node_modules' ? [] : sorgenti(p);
    return /\.ts$/.test(v.name) && !/\.test\.ts$/.test(v.name) ? [p] : [];
  });
}

const app = createApp();
const rotte = elencaRotte(app);

describe('registro delle descrizioni', () => {
  it('ogni rotta montata ha la sua descrizione, e ogni descrizione una rotta', () => {
    const chiavi = rotte.map(chiaveRotta);
    expect(new Set(chiavi).size).toBe(chiavi.length);
    expect(chiavi.filter((k) => !DESCRIZIONI[k])).toEqual([]);
    expect(Object.keys(DESCRIZIONI).filter((k) => !chiavi.includes(k))).toEqual([]);
  });

  it('ogni area di montaggio ha un nome, e ogni nome un\'area', () => {
    const aree = new Set(rotte.map((r) => r.area ?? 'sistema'));
    expect([...aree].filter((a) => !AREE[a])).toEqual([]);
    expect(Object.keys(AREE).filter((a) => !aree.has(a))).toEqual([]);
  });

  it('sommario, descrizione e risposta ci sono e hanno la forma chiesta', () => {
    const difetti = rotte.flatMap((r) => {
      const d = DESCRIZIONI[chiaveRotta(r)];
      const out: string[] = [];
      if (!d.sommario || d.sommario.length > 120 || /\.$/.test(d.sommario)) out.push(`${chiaveRotta(r)}: sommario`);
      if (d.descrizione.trim().length < 20) out.push(`${chiaveRotta(r)}: descrizione`);
      if (!d.risposta.trim()) out.push(`${chiaveRotta(r)}: risposta`);
      return out;
    });
    expect(difetti).toEqual([]);
  });

  it('i tipi …Dto citati nelle risposte esistono in shared/', () => {
    const esportati = new Set(sorgenti(path.join(RADICE, 'shared')).flatMap((f) => [...fs.readFileSync(f, 'utf8').matchAll(/export (?:interface|type) ([A-Za-z0-9_]+)/g)].map((m) => m[1])));
    const mancanti = Object.entries(DESCRIZIONI).flatMap(([k, d]) => [...d.risposta.matchAll(/\b([A-Z][A-Za-z0-9]*Dto)\b/g)].filter((m) => !esportati.has(m[1])).map((m) => `${k}: ${m[1]}`));
    expect(mancanti).toEqual([]);
  });

  it('JSON o file come risponde davvero il gestore; corpo binario dove c\'è express.raw; ogni scrittura dichiara il suo corpo', () => {
    const difetti = rotte.flatMap((r) => {
      const k = chiaveRotta(r);
      const d = DESCRIZIONI[k];
      const s = schemiDellaRotta(r);
      const out: string[] = [];
      // una 204 non ha corpo: né involucro JSON né file
      const attesa = !rispondeJson(r) && statoDiSuccesso(r) !== 204;
      if (attesa !== !!d.rispostaBinaria) out.push(`${k}: rispostaBinaria ${d.rispostaBinaria ? 'di troppo' : 'mancante'}`);
      if (haCorpoBinario(r) !== !!d.corpoBinario) out.push(`${k}: corpoBinario`);
      if (['post', 'put', 'patch'].includes(r.metodo) && !s.body && !haCorpoBinario(r) && !d.corpo && !d.senzaCorpo) out.push(`${k}: corpo non dichiarato`);
      if (d.senzaCorpo && (s.body || haCorpoBinario(r) || d.corpo)) out.push(`${k}: senzaCorpo con un corpo`);
      if (d.corpo && s.body) out.push(`${k}: corpo doppio`);
      if (d.corpo && !parametriDelPercorso(r.percorso).includes(d.corpo.perParametro)) out.push(`${k}: perParametro non è nel percorso`);
      return out;
    });
    expect(difetti).toEqual([]);
  });

  it('i codici d\'errore dichiarati il server li lancia davvero', () => {
    // fuori da server/openapi: altrimenti ogni codice scritto nel registro troverebbe sé stesso
    const cartellaOpenApi = path.join(RADICE, 'server', 'openapi');
    const testo = sorgenti(path.join(RADICE, 'server')).filter((f) => !f.startsWith(cartellaOpenApi)).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
    const mancanti = Object.entries(DESCRIZIONI).flatMap(([k, d]) => (d.errori ?? [])
      .filter(([stato, codice]) => stato < 400 || stato > 599 || !(testo.includes(`'${codice}'`) || testo.includes(`"${codice}"`)))
      .map(([stato, codice]) => `${k}: ${stato} ${codice}`));
    expect(mancanti).toEqual([]);
  });
});

describe('documento OpenAPI', () => {
  const documento = documentoOpenApi(app) as { paths: Record<string, Record<string, { parameters: Array<{ name: string; in: string }>; summary: string; requestBody?: unknown }>> };

  it('è un documento OpenAPI 3.1 valido', async () => {
    const esito = await new Validator().validate(documento as never);
    expect(esito.errors ?? []).toEqual([]);
    expect(esito.valid).toBe(true);
  });

  it('contiene ogni rotta, con i parametri del percorso e le query degli schemi zod', () => {
    const difetti: string[] = [];
    for (const r of rotte) {
      const op = documento.paths[r.percorso.replace(/:([A-Za-z0-9_]+)/g, '{$1}')]?.[r.metodo];
      if (!op) { difetti.push(`${chiaveRotta(r)}: assente`); continue; }
      for (const p of parametriDelPercorso(r.percorso)) if (!op.parameters.some((x) => x.in === 'path' && x.name === p)) difetti.push(`${chiaveRotta(r)}: parametro ${p}`);
      const query = schemiDellaRotta(r).query as { shape?: Record<string, unknown> } | undefined;
      for (const q of Object.keys(query?.shape ?? {})) if (!op.parameters.some((x) => x.in === 'query' && x.name === q)) difetti.push(`${chiaveRotta(r)}: query ${q}`);
      if (schemiDellaRotta(r).body && !op.requestBody) difetti.push(`${chiaveRotta(r)}: corpo`);
      if (op.summary.startsWith('(senza descrizione)')) difetti.push(`${chiaveRotta(r)}: senza descrizione`);
    }
    expect(difetti).toEqual([]);
    expect(Object.values(documento.paths).reduce((n, p) => n + Object.keys(p).length, 0)).toBe(rotte.length);
  });
});

describe('rotte della documentazione', () => {
  beforeAll(() => { initDb(':memory:'); });
  afterAll(() => { closeDb(); });

  it('GET /api/openapi.json manda il documento senza la busta { data }', async () => {
    const res = await request(app).get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.data).toBeUndefined();
  });

  it('GET /api/docs manda la pagina di Swagger UI, e i suoi file statici arrivano da /api/docs/', async () => {
    const pagina = await request(app).get('/api/docs');
    expect(pagina.status).toBe(200);
    expect(pagina.headers['content-type']).toMatch(/text\/html/);
    expect(pagina.text).toContain('/api/docs/swagger-ui-bundle.js');
    expect(pagina.text).toContain("url: '/api/openapi.json'");
    const script = await request(app).get('/api/docs/swagger-ui-bundle.js');
    expect(script.status).toBe(200);
    const css = await request(app).get('/api/docs/swagger-ui.css');
    expect(css.status).toBe(200);
  });

  it('un file inesistente sotto /api/docs/ è il solito 404 JSON', async () => {
    const res = await request(app).get('/api/docs/non-esiste.js');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not-found');
  });
});
