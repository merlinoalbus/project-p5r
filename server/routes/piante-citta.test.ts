// ============================================================
// Test mappe dei quartieri (Fase 8.3) — seed dei collegamenti, credito nella scheda, spilli dei luoghi, download nell'istanza
// ============================================================

import path from 'node:path';
import http from 'node:http';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { QuartiereDettaglioDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

describe('Mappe dei quartieri', () => {
  let server: http.Server; let porta = 0;
  beforeAll(async () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
    server = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(PNG); });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
    porta = (server.address() as { port: number }).port;
  });
  afterAll(async () => { await new Promise<void>((ok) => server.close(() => ok())); closeDb(); });

  it('22 quartieri su 24 hanno una mappa collegata con credito; i luoghi espongono lo spillo (nullo se non posizionato)', async () => {
    expect((getDb().prepare('SELECT COUNT(*) AS n FROM pianta_quartiere').get() as { n: number }).n).toBe(22);
    const s = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    expect(s.pianta).toMatchObject({ fonte: expect.stringContaining('fandom'), url: expect.stringContaining('static.wikia.nocookie.net') });
    expect(s.mappa).toBe(false);
    expect(s.luoghi.every((l) => 'marcatore' in l)).toBe(true);
    const i = (await request(app).get('/api/compendio/citta/ikebukuro')).body.data as QuartiereDettaglioDto;
    expect(i.pianta).toBeNull();
    expect(i.piantaAssente).toBeTruthy();
  });

  it('spillo di un luogo: fissa, rileggi, limiti, rimozione; il reseed non tocca gli spilli dell\'utente', async () => {
    const s = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    const luogo = s.luoghi[0];
    const m = await request(app).put('/api/mappe/marcatori-luoghi').send({ luogo: luogo.chiave, x: 40, y: 60 });
    expect(m.status).toBe(200);
    expect(m.body.data.marcatore).toEqual({ x: 40, y: 60 });
    const s2 = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    expect(s2.luoghi[0].marcatore).toEqual({ x: 40, y: 60 });
    expect((await request(app).put('/api/mappe/marcatori-luoghi').send({ luogo: luogo.chiave, x: 140, y: 0 })).status).toBe(400);
    expect((await request(app).put('/api/mappe/marcatori-luoghi').send({ luogo: 'x/y', x: 1, y: 1 })).status).toBe(404);
    caricaSeed(getDb(), DIR_SEED, true);
    const s3 = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    expect(s3.luoghi[0].marcatore).toEqual({ x: 40, y: 60 });
    expect((await request(app).put('/api/mappe/marcatori-luoghi').send({ luogo: luogo.chiave, x: null, y: null })).body.data.marcatore).toBeNull();
  });

  it('scarica la mappa del quartiere nell\'istanza dall\'URL del seed e la registra come immagine «citta-<quartiere>»', async () => {
    getDb().prepare('UPDATE pianta_quartiere SET url = ? WHERE quartiere_chiave = ?').run(`http://127.0.0.1:${porta}/mappa.png`, 'shinjuku');
    const res = await request(app).post('/api/mappe/piante-citta/shinjuku/scarica');
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ quartiere: 'shinjuku', mime: 'image/png' });
    const s = (await request(app).get('/api/compendio/citta/shinjuku')).body.data as QuartiereDettaglioDto;
    expect(s.mappa).toBe(true);
    expect((await request(app).post('/api/mappe/piante-citta/ikebukuro/scarica')).status).toBe(404);
  });
});
