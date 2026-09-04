// ============================================================
// Test piante delle aree (Fase 7.4) — seed dei collegamenti, credito nella scheda, spilli preposizionati che non sovrascrivono l'utente, download nell'istanza
// ============================================================

import path from 'node:path';
import http from 'node:http';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { DungeonDettaglioDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();
// PNG 1×1 valido per il server locale che simula la guida
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

describe('Piante delle aree', () => {
  let server: http.Server; let porta = 0;
  beforeAll(async () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
    server = http.createServer((req, res) => { if (req.url?.endsWith('.png')) { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(PNG); } else { res.writeHead(404); res.end(); } });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
    porta = (server.address() as { port: number }).port;
  });
  afterAll(async () => { await new Promise<void>((ok) => server.close(() => ok())); closeDb(); });

  it('107 aree su 116 hanno una pianta collegata (omoteura/game8), le altre spiegano il perché; la scheda espone credito e fonte', async () => {
    const righe = getDb().prepare('SELECT COUNT(*) AS n FROM pianta_area').get() as { n: number };
    expect(righe.n).toBe(107);
    const k = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(k.aree.every((a) => a.pianta !== null)).toBe(true);
    expect(k.aree[1].pianta).toMatchObject({ fonte: 'omoteura.com', url: expect.stringContaining('omoteura.com/persona5/the-royal/img/chart-map/'), pagina: expect.stringContaining('kamoshida-palace-chart.html') });
    expect(k.aree[1].pianta?.licenza.length).toBeGreaterThan(10);
    expect(k.aree[1].mappa).toBe(false);
    const m = (await request(app).get('/api/compendio/dungeon/mementos')).body.data as DungeonDettaglioDto;
    expect(m.aree.filter((a) => a.pianta === null).length).toBeGreaterThanOrEqual(7);
    expect(m.aree.find((a) => a.pianta === null)?.piantaAssente).toContain('proceduralmente');
  });

  it('gli spilli preposizionati dal seed non sovrascrivono quelli dell\'utente e il reseed li mantiene', async () => {
    const k = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    const conSpillo = k.aree.flatMap((a) => a.punti).filter((p) => p.marcatore);
    // gli spilli dal seed (se presenti) sono marcati come tali
    const origini = getDb().prepare('SELECT origine, COUNT(*) AS n FROM marcatore_mappa GROUP BY origine').all() as Array<{ origine: string; n: number }>;
    expect(origini.every((o) => o.origine === 'seed')).toBe(true);
    // 7.4b: 187 spilli in tutto, di cui 21 nel Palazzo di Kamoshida
    expect(origini.reduce((s, o) => s + o.n, 0)).toBe(187);
    expect((getDb().prepare("SELECT COUNT(*) AS n FROM marcatore_mappa WHERE punto_chiave LIKE 'kamoshida-%'").get() as { n: number }).n).toBe(conSpillo.length);
    expect(conSpillo).toHaveLength(21);
    const punto = k.aree[0].punti[0];
    await request(app).put('/api/mappe/marcatori').send({ punto: punto.chiave, x: 33, y: 44 });
    caricaSeed(getDb(), DIR_SEED, true);
    const dopo = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(dopo.aree[0].punti[0].marcatore).toEqual({ x: 33, y: 44 });
    expect((getDb().prepare('SELECT origine FROM marcatore_mappa WHERE punto_chiave = ?').get(punto.chiave) as { origine: string }).origine).toBe('utente');
  });

  it('scarica la pianta nell\'istanza dall\'URL del seed (con alternativa se il primo fallisce) e la registra come immagine dell\'area', async () => {
    const area = 'kamoshida-02-sala-centrale';
    getDb().prepare('UPDATE pianta_area SET url = ?, alternative_json = ? WHERE area_chiave = ?').run(`http://127.0.0.1:${porta}/manca.jpg`, JSON.stringify([{ url: `http://127.0.0.1:${porta}/pianta.png`, fonte: 'test', pagina: null, licenza: '', larghezza: 1, altezza: 1, note: '' }]), area);
    const res = await request(app).post(`/api/mappe/piante/${area}/scarica`);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ area, mime: 'image/png', fonte: 'test' });
    const k = (await request(app).get('/api/compendio/dungeon/kamoshida')).body.data as DungeonDettaglioDto;
    expect(k.aree.find((a) => a.chiave === area)?.mappa).toBe(true);
    expect(k.aree.find((a) => a.chiave === area)?.piantaScaricata).toEqual({ url: `http://127.0.0.1:${porta}/pianta.png`, fonte: 'test', pagina: null });
    expect(k.aree.find((a) => a.chiave === 'kamoshida-01-cancello-del-castello-ingresso')?.piantaScaricata).toBeNull();
    expect((await request(app).post('/api/mappe/piante/area-inesistente/scarica')).status).toBe(404);
    getDb().prepare('UPDATE pianta_area SET url = ?, alternative_json = ? WHERE area_chiave = ?').run(`http://127.0.0.1:${porta}/manca.jpg`, '[]', 'kamoshida-03-edificio-ovest-1p');
    expect((await request(app).post('/api/mappe/piante/kamoshida-03-edificio-ovest-1p/scarica')).status).toBe(400);
  });
});
