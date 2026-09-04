// ============================================================
// Test API font — caricamento per ruolo, riconoscimento del formato, elenco, file, rimozione
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { config } from '../config.js';
import { createApp } from '../bootstrap.js';
import { MAX_BYTE_FONT, rilevaFormatoFont } from '../services/fontService.js';
import type { FontDto } from '../../shared/types.js';

const app = createApp();

/** Buffer con la firma di un TrueType (00 01 00 00) seguita da byte qualsiasi. */
const fintoTtf = (byte = 64): Buffer => Buffer.concat([Buffer.from([0, 1, 0, 0]), Buffer.alloc(byte - 4, 7)]);

describe('API font', () => {
  let dataDir: string;
  let originale: string;
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-font-'));
    originale = config.dataDir;
    (config as { dataDir: string }).dataDir = dataDir;
  });
  afterAll(() => {
    (config as { dataDir: string }).dataDir = originale;
    fs.rmSync(dataDir, { recursive: true, force: true });
    closeDb();
  });

  it('riconosce il formato dalla firma del file', () => {
    expect(rilevaFormatoFont(fintoTtf())).toBe('ttf');
    expect(rilevaFormatoFont(Buffer.from('OTTOxxxx'))).toBe('otf');
    expect(rilevaFormatoFont(Buffer.from('wOFFxxxx'))).toBe('woff');
    expect(rilevaFormatoFont(Buffer.from('wOF2xxxx'))).toBe('woff2');
    expect(rilevaFormatoFont(Buffer.from('ciao'))).toBeNull();
    expect(rilevaFormatoFont(Buffer.alloc(2))).toBeNull();
  });

  it('GET /api/font → tre ruoli, tutti assenti all\'inizio', async () => {
    const res = await request(app).get('/api/font');
    expect(res.status).toBe(200);
    const elenco = res.body.data as FontDto[];
    expect(elenco.map((f) => f.ruolo)).toEqual(['display', 'menu', 'decor']);
    expect(elenco.every((f) => !f.presente && f.url === null && f.formato === null)).toBe(true);
    expect((await request(app).get('/api/font/display/file')).status).toBe(404);
  });

  it('PUT /api/font/:ruolo salva il file (formato dal contenuto), GET file lo restituisce, DELETE lo rimuove', async () => {
    const contenuto = fintoTtf(128);
    const su = await request(app).put('/api/font/display').set('Content-Type', 'application/octet-stream').send(contenuto);
    expect(su.status).toBe(201);
    expect(su.body.data).toMatchObject({ ruolo: 'display', presente: true, formato: 'ttf', byte: 128, url: '/api/font/display/file' });
    expect(fs.readdirSync(path.join(dataDir, 'font'))).toEqual(['display.ttf']);

    const elenco = (await request(app).get('/api/font')).body.data as FontDto[];
    expect(elenco.find((f) => f.ruolo === 'display')?.presente).toBe(true);
    expect(elenco.find((f) => f.ruolo === 'menu')?.presente).toBe(false);

    const file = await request(app).get('/api/font/display/file').buffer(true).parse((res, cb) => {
      const parti: Buffer[] = [];
      res.on('data', (c: Buffer) => parti.push(c));
      res.on('end', () => cb(null, Buffer.concat(parti)));
    });
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toContain('font/ttf');
    expect(Buffer.compare(file.body as Buffer, contenuto)).toBe(0);

    // sostituzione con un altro formato: resta un solo file per ruolo
    const woff2 = Buffer.concat([Buffer.from('wOF2'), Buffer.alloc(60, 1)]);
    const sost = await request(app).put('/api/font/display').set('Content-Type', 'font/woff2').send(woff2);
    expect(sost.status).toBe(201);
    expect(sost.body.data.formato).toBe('woff2');
    expect(fs.readdirSync(path.join(dataDir, 'font'))).toEqual(['display.woff2']);

    expect((await request(app).delete('/api/font/display')).status).toBe(204);
    expect(fs.readdirSync(path.join(dataDir, 'font'))).toEqual([]);
    expect((await request(app).delete('/api/font/display')).status).toBe(404);
  });

  it('rifiuta ruoli sconosciuti, file non font, vuoti o troppo grandi', async () => {
    expect((await request(app).put('/api/font/titolo').set('Content-Type', 'font/ttf').send(fintoTtf())).status).toBe(400);
    expect((await request(app).get('/api/font/titolo/file')).status).toBe(400);
    const nonFont = await request(app).put('/api/font/menu').set('Content-Type', 'font/ttf').send(Buffer.from('questo non è un font'));
    expect(nonFont.status).toBe(400);
    expect(nonFont.body.error.code).toBe('formato-font-non-ammesso');
    const vuoto = await request(app).put('/api/font/menu').set('Content-Type', 'font/ttf').send(Buffer.alloc(0));
    expect(vuoto.status).toBe(400);
    const grande = await request(app).put('/api/font/menu').set('Content-Type', 'font/ttf').send(Buffer.concat([Buffer.from([0, 1, 0, 0]), Buffer.alloc(MAX_BYTE_FONT)]));
    expect([400, 413]).toContain(grande.status);
    expect(fs.existsSync(path.join(dataDir, 'font', 'menu.ttf'))).toBe(false);
  });
});
