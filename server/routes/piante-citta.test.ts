// ============================================================
// Test mappe dei quartieri (Fase 8.3) — seed dei collegamenti, credito nella scheda, spilli dei luoghi, download nell'istanza
// ============================================================

import http from 'node:http';
import request from 'supertest';
import { closeDb, getDb } from '../db/dbService.js';
import { regoleAllAvvio } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import type { QuartiereDettaglioDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

describe('Mappe dei quartieri', () => {
  let server: http.Server; let porta = 0;
  beforeAll(async () => {
    dbDiProva();
    server = http.createServer((_req, res) => { res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(PNG); });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
    porta = (server.address() as { port: number }).port;
  });
  afterAll(async () => { await new Promise<void>((ok) => server.close(() => ok())); closeDb(); });

  it('22 quartieri su 24 hanno una mappa collegata con credito; i luoghi espongono lo spillo (nullo se non posizionato)', async () => {
    expect((getDb().prepare('SELECT COUNT(*) AS n FROM pianta_quartiere').get() as { n: number }).n).toBeGreaterThanOrEqual(20);
    const s = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    expect(s.pianta).toMatchObject({ fonte: expect.stringContaining('fandom'), url: expect.stringContaining('static.wikia.nocookie.net') });
    expect(typeof s.mappa).toBe('boolean');
    expect(s.luoghi.every((l) => 'marcatore' in l)).toBe(true);
    const i = (await request(app).get('/api/compendio/citta/ikebukuro')).body.data as QuartiereDettaglioDto;
    expect(i.pianta).toBeNull();
    expect(i.piantaAssente).toBeTruthy();
  });

  // La rotta che scriveva lo spillo di un luogo non c'è più: nessuno la chiamava (rilievo O10). Resta da provare che quello che
  // c'è nel database si legge nella scheda e che le regole dell'avvio non toccano gli spilli dell'utente.
  it('spillo di un luogo: si rilegge nella scheda; le regole dell\'avvio non toccano gli spilli dell\'utente', async () => {
    const s = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    const luogo = s.luoghi[0];
    getDb().prepare("INSERT INTO marcatore_luogo (luogo_chiave, x, y, updated_at, origine) VALUES (?, 40, 60, 'prova', 'utente') ON CONFLICT(luogo_chiave) DO UPDATE SET x = excluded.x, y = excluded.y, origine = 'utente'").run(luogo.chiave);
    const s2 = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    expect(s2.luoghi[0].marcatore).toEqual({ x: 40, y: 60 });
    regoleAllAvvio(getDb());
    const s3 = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    expect(s3.luoghi[0].marcatore).toEqual({ x: 40, y: 60 });
    getDb().prepare('DELETE FROM marcatore_luogo WHERE luogo_chiave = ?').run(luogo.chiave);
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
