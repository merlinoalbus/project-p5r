// ============================================================
// LAY-2 (L2, 2026-10-20) — lo scarico di un'immagine da una fonte esterna (la pianta di un quartiere, un indirizzo dell'utente)
// si presenta con uno User-Agent onesto che identifica l'app, senza Referer contraffatto; se la fonte rifiuta, l'errore lo dice
// (400 `fonte-rifiuta`) e non si scrive niente. Decisione del PM: non si aggirano le protezioni di un sito altrui.
// ============================================================

import http from 'node:http';
import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

describe('scarico da una fonte esterna (LAY-2)', () => {
  let server: http.Server; let porta = 0;
  /** Le intestazioni dell'ultima richiesta arrivata alla fonte simulata, e come risponde. */
  let ricevute: http.IncomingHttpHeaders = {};
  let stato = 200;
  beforeAll(async () => {
    dbDiProva();
    server = http.createServer((req, res) => {
      ricevute = req.headers;
      if (stato !== 200) { res.writeHead(stato, { 'Content-Type': 'text/html' }); res.end('<title>Just a moment...</title>'); return; }
      res.writeHead(200, { 'Content-Type': 'image/png' }); res.end(PNG);
    });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
    porta = (server.address() as { port: number }).port;
    getDb().prepare('UPDATE pianta_quartiere SET url = ? WHERE quartiere_chiave = ?').run(`http://127.0.0.1:${porta}/P5R_Kichijoji.jpg`, 'kichijoji');
  });
  afterAll(async () => { await new Promise<void>((ok) => server.close(() => ok())); closeDb(); });

  // Superato dal lotto L11 (R11-02/8, migrazione 210): la rotta di scarico delle illustrazioni dei quartieri e `pianta_quartiere` sono tolte
  // su decisione dell'utente; i test restano, da riscrivere sullo scarico da indirizzo (`/api/immagini/:ambito/:chiave/da-url`).
  it.skip('la fonte riceve uno User-Agent che dice chi è (project-p5r con la versione), e nessun Referer', async () => {
    stato = 200;
    await request(app).post('/api/mappe/piante-citta/kichijoji/scarica').expect(201);
    expect(ricevute['user-agent']).toMatch(/^project-p5r\/\d+\.\d+\.\d+ \(/);
    expect(ricevute['user-agent']).not.toMatch(/Mozilla/);
    expect(ricevute.referer).toBeUndefined();
  });

  it.skip('una fonte che rifiuta (403) è 400 `fonte-rifiuta` con la pagina della fonte, e l’immagine non cambia', async () => {
    const prima = prepared("SELECT created_at FROM immagine WHERE ambito = 'mappa' AND chiave = 'citta-kichijoji'").pluck().get();
    stato = 403;
    const r = await request(app).post('/api/mappe/piante-citta/kichijoji/scarica');
    expect([r.status, r.body.error.code]).toEqual([400, 'fonte-rifiuta']);
    expect(r.body.error.details).toMatchObject({ stato: 403, host: `127.0.0.1:${porta}` });
    expect(r.body.error.message).toMatch(/editor/);
    expect(prepared("SELECT created_at FROM immagine WHERE ambito = 'mappa' AND chiave = 'citta-kichijoji'").pluck().get()).toBe(prima);
    // lo stesso dalla rotta da indirizzo dell'utente
    const daUrl = await request(app).post('/api/immagini/altro/prova-fonte/da-url').send({ url: `http://127.0.0.1:${porta}/x.png` });
    expect([daUrl.status, daUrl.body.error.code]).toEqual([400, 'fonte-rifiuta']);
  });
});
