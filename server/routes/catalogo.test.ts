// ============================================================
// Test catalogo dei riferimenti — elenco con flag "presente", importazione a lotti, saltate/fallite, sovrascrivi
// ============================================================

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { invalidaCatalogo } from '../services/catalogoRiferimentiService.js';
import { config } from '../config.js';
import { createApp } from '../bootstrap.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();
const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');

describe('catalogo dei riferimenti', () => {
  let dataDir: string;
  let rifDir: string;
  let server: http.Server;
  let base: string;
  const originali = { dataDir: config.dataDir, riferimentiDir: config.riferimentiDir };

  beforeAll(async () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
    dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-cat-data-'));
    rifDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-cat-rif-'));
    (config as { dataDir: string }).dataDir = dataDir;
    (config as { riferimentiDir: string }).riferimentiDir = rifDir;
    server = http.createServer((req, res) => {
      if (req.url?.endsWith('.png')) { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(png); return; }
      res.writeHead(404); res.end();
    });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    fs.writeFileSync(path.join(rifDir, 'immagini.json'), JSON.stringify({
      versione: 1,
      voci: [
        { ambito: 'arcana', chiave: 'Fool', url: `${base}/fool.png`, fonte: 'https://esempio.it/fool' },
        { ambito: 'arcana', chiave: 'Magician', url: `${base}/magician.png` },
        { ambito: 'arcana', chiave: 'Priestess', url: `${base}/manca.jpg`, nota: 'link incerto' },
        { ambito: 'confidente', chiave: 'ryuji', url: `${base}/ryuji.png` },
        { ambito: 'sconosciuto', chiave: 'x', url: `${base}/x.png` },
        { chiave: 'senza-ambito', url: `${base}/y.png` },
      ],
    }));
    invalidaCatalogo();
  });

  afterAll(async () => {
    await new Promise<void>((ok) => server.close(() => ok()));
    (config as { dataDir: string }).dataDir = originali.dataDir;
    (config as { riferimentiDir: string }).riferimentiDir = originali.riferimentiDir;
    invalidaCatalogo();
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(rifDir, { recursive: true, force: true });
    closeDb();
  });

  it('elenca solo le voci valide, con il flag presente, filtrabili per ambito', async () => {
    const tutto = await request(app).get('/api/immagini/catalogo');
    expect(tutto.status).toBe(200);
    expect(tutto.body.data).toHaveLength(4);
    expect(tutto.body.data.find((v: { chiave: string }) => v.chiave === 'Fool')).toMatchObject({ ambito: 'arcana', presente: false, fonte: 'https://esempio.it/fool', nota: null });
    expect(tutto.body.data.find((v: { chiave: string }) => v.chiave === 'Priestess').nota).toBe('link incerto');
    const soloConf = await request(app).get('/api/immagini/catalogo?ambito=confidente');
    expect(soloConf.body.data.map((v: { chiave: string }) => v.chiave)).toEqual(['ryuji']);
    expect((await request(app).get('/api/immagini/catalogo?ambito=pippo')).status).toBe(400);
  });

  it('importa un lotto: successi, fallimenti isolati, salta le presenti, sovrascrive su richiesta', async () => {
    // Immagine caricata a mano dall'utente per Magician: non va toccata
    const mano = await request(app).put('/api/immagini/arcana/Magician').set('Content-Type', 'image/webp').send(Buffer.from('RIFF'));
    expect(mano.status).toBe(201);

    const lotto = await request(app).post('/api/immagini/catalogo/importa').send({ ambito: 'arcana', chiavi: ['Fool', 'Magician', 'Priestess', 'Inesistente'] });
    expect(lotto.status).toBe(200);
    expect(lotto.body.data.importate).toEqual(['Fool']);
    expect(lotto.body.data.saltate).toEqual(['Magician']);
    expect(lotto.body.data.fallite).toHaveLength(2);
    expect(lotto.body.data.fallite.find((f: { chiave: string }) => f.chiave === 'Priestess').motivo).toMatch(/404/);
    expect(lotto.body.data.fallite.find((f: { chiave: string }) => f.chiave === 'Inesistente').motivo).toMatch(/non presente nel catalogo/);
    // Magician resta quella dell'utente (webp), Fool è stata importata (png)
    expect((await request(app).get('/api/immagini/arcana/Magician')).body.data.mime).toBe('image/webp');
    expect((await request(app).get('/api/immagini/arcana/Fool')).body.data.mime).toBe('image/png');
    expect((await request(app).get('/api/immagini/catalogo?ambito=arcana')).body.data.filter((v: { presente: boolean }) => v.presente)).toHaveLength(2);

    const sovr = await request(app).post('/api/immagini/catalogo/importa').send({ ambito: 'arcana', chiavi: ['Magician'], sovrascrivi: true });
    expect(sovr.body.data.importate).toEqual(['Magician']);
    expect((await request(app).get('/api/immagini/arcana/Magician')).body.data.mime).toBe('image/png');
    // un solo file per entità su disco
    expect(fs.readdirSync(path.join(dataDir, 'immagini', 'arcana'))).toHaveLength(2);

    // validazione: lotto vuoto o troppo grande, ambito errato
    expect((await request(app).post('/api/immagini/catalogo/importa').send({ ambito: 'arcana', chiavi: [] })).status).toBe(400);
    expect((await request(app).post('/api/immagini/catalogo/importa').send({ ambito: 'arcana', chiavi: Array.from({ length: 21 }, (_, i) => `k${i}`) })).status).toBe(400);
    expect((await request(app).post('/api/immagini/catalogo/importa').send({ ambito: 'pippo', chiavi: ['Fool'] })).status).toBe(400);
  });

  it('catalogo assente o malformato → elenco vuoto senza errori', async () => {
    fs.writeFileSync(path.join(rifDir, 'immagini.json'), '{non json');
    invalidaCatalogo();
    expect((await request(app).get('/api/immagini/catalogo')).body.data).toEqual([]);
    fs.rmSync(path.join(rifDir, 'immagini.json'));
    invalidaCatalogo();
    expect((await request(app).get('/api/immagini/catalogo')).body.data).toEqual([]);
    const imp = await request(app).post('/api/immagini/catalogo/importa').send({ ambito: 'arcana', chiavi: ['Fool'] });
    expect(imp.body.data.fallite[0].motivo).toMatch(/non presente nel catalogo/);
  });
});
