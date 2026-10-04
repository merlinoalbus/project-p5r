// ============================================================
// Test della verifica completa del codice (2026-10-03), lotto API: F01 CORS, F02 messaggi interni, F04 salute, F06 chiavi
// riservate delle mappe, F07/F09 catalogo, F08 errori 4xx di Express, F11 profondità dei piani, F12 parametri, F14 busta.
// ============================================================

import os from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { closeDb, getDb } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { responseShapeMiddleware } from '../middleware/responseShape.js';
import { requestContextMiddleware } from '../middleware/requestContext.js';
import { CHIAVI_MAPPA_RISERVATE } from '../services/mappe/mappeService.js';
import { bodySalvaPiano, LIVELLI_MAX_PIANO } from '../schemas/partite.js';
import { datiNegozio } from '../schemas/catalogo.js';
import mappeRouter from './mappe.js';
import { dbDiProva } from '../../test/dbDiProva.js';

/** Un'app minima con la stessa catena di middleware, per provocare errori che le rotte vere non producono a comando. */
function appDiProva(): express.Express {
  const app = express();
  app.use(requestContextMiddleware);
  app.use(responseShapeMiddleware);
  app.get('/rotto', () => { throw new Error('SQLITE_CORRUPT: database disk image is malformed (C:\\segreto\\gioco.db)'); });
  app.get('/file-sparito', (_req, res, next) => res.sendFile(path.join(os.tmpdir(), 'p5r-file-che-non-esiste.bin'), (err) => { if (err) next(err); }));
  app.get('/dto-con-data', (_req, res) => { res.json({ id: 1, data: '04-12', tipo: 'classe' }); });
  app.get('/dto-con-error', (_req, res) => { res.json({ error: 'testo libero di un campo', ok: true }); });
  app.get('/nullo', (_req, res) => { res.json(null); });
  app.use(errorHandler);
  return app;
}

describe('verifica API — catena dei middleware', () => {
  it('F02: un errore non previsto risponde 500 con un messaggio fisso, senza il testo interno', async () => {
    const res = await request(appDiProva()).get('/rotto');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'internal-error', message: 'Errore interno del server.' }, requestId: expect.any(String) });
    expect(JSON.stringify(res.body)).not.toMatch(/SQLITE|segreto/);
  });

  it('F08: un file sparito sotto sendFile è un 404 not-found, non «richiesta non valida»', async () => {
    const res = await request(appDiProva()).get('/file-sparito');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not-found');
  });

  it('F14: un DTO con un campo `data` o `error` è avvolto come ogni altro payload', async () => {
    expect((await request(appDiProva()).get('/dto-con-data')).body).toEqual({ data: { id: 1, data: '04-12', tipo: 'classe' } });
    expect((await request(appDiProva()).get('/dto-con-error')).body).toEqual({ data: { error: 'testo libero di un campo', ok: true } });
    expect((await request(appDiProva()).get('/nullo')).body).toEqual({ data: null });
  });
});

describe('verifica API — rotte vere', () => {
  const app = createApp();
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('F01: nessun header CORS, né sul preflight né su una GET con Origin', async () => {
    const pre = await request(app).options('/api/health').set('Origin', 'http://sito-esterno.test').set('Access-Control-Request-Method', 'DELETE');
    expect(pre.headers['access-control-allow-origin']).toBeUndefined();
    const get = await request(app).get('/api/config').set('Origin', 'http://sito-esterno.test');
    expect(get.status).toBe(200);
    expect(get.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('F06: una mappa radice il cui nome dà una chiave riservata è rifiutata; le chiavi riservate coprono il router', async () => {
    const res = await request(app).post('/api/mappe').send({ nome: 'Albero', tipo: 'luogo' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('chiave-riservata');
    // ogni primo segmento letterale di /api/mappe deve essere riservato, altrimenti una mappa con quel nome verrebbe oscurata
    const letterali = new Set<string>();
    for (const strato of (mappeRouter as unknown as { stack: Array<{ route?: { path: string } }> }).stack) {
      const primo = strato.route?.path.split('/')[1];
      if (primo && !primo.startsWith(':')) letterali.add(primo);
    }
    expect(letterali.size).toBeGreaterThan(5);
    for (const l of letterali) expect(CHIAVI_MAPPA_RISERVATE.has(l), `«${l}» non è fra le chiavi riservate`).toBe(true);
  });

  it('F06: l\'importazione salta le mappe con una chiave riservata', async () => {
    const res = await request(app).post('/api/mappe/importa').send({ pacchetto: { versione: 1, mappe: [{ chiave: 'esporta', nome: 'Esporta', tipo: 'luogo', spilli: [] }] } });
    expect(res.status).toBe(200);
    expect(res.body.data.saltate).toContain('esporta');
    expect(res.body.data.mappe).toBe(0);
    // `GET /api/mappe/esporta` resta l'esportazione, non una mappa
    const esporta = await request(app).get('/api/mappe/esporta');
    expect(esporta.status).toBe(200);
    expect(esporta.body.data.mappe).toBeDefined();
  });

  it('F07: lo schema del negozio non accetta più `condizioni_json`', () => {
    expect(Object.keys(datiNegozio.shape)).not.toContain('condizioni_json');
  });

  it('F09: un corpo non valido del catalogo risponde validation-error come il resto dell\'API', async () => {
    const res = await request(app).post('/api/catalogo/negozio').send({ nome: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('validation-error');
  });

  it('B9": il catalogo rifiuta un effetto senza i campi della sua famiglia e salva quelli validi normalizzati', async () => {
    const rotto = await request(app).post('/api/catalogo/libro').send({ nome: 'Libro B9', effetti_json: [{ effetto: { famiglia: 'regalo' } }] });
    expect(rotto.status).toBe(400);
    expect(rotto.body.error.code).toBe('validation-error');
    const buono = await request(app).post('/api/catalogo/libro').send({ nome: 'Libro B9 buono', effetti_json: [{ effetto: { famiglia: 'regalo', graditoA: ['Ann'], estraneo: true } }] });
    expect(buono.status).toBe(201);
    const salvato = getDb().prepare('SELECT effetti_json FROM libro WHERE chiave = ?').pluck().get(buono.body.data.chiave) as string;
    expect(JSON.parse(salvato)).toEqual([{ effetto: { famiglia: 'regalo', graditoA: ['Ann'] } }]);
  });

  it('F12: i parametri prima liberi sono validati (chiave oltre i 200 caratteri → 400)', async () => {
    const lunga = 'a'.repeat(201);
    for (const p of [`/api/compendio/confidenti/${lunga}`, `/api/compendio/dungeon/${lunga}`, `/api/catalogo/oggetti-di/${'b'.repeat(81)}`, `/api/mappe/risolvi/${lunga}`, `/api/mappe/contenuti/${lunga}`]) {
      const res = await request(app).get(p);
      expect(res.status, p).toBe(400);
      expect(res.body.error.code, p).toBe('validation-error');
    }
    // una chiave plausibile che non esiste resta un 404
    expect((await request(app).get('/api/mappe/risolvi/Non_Esiste')).status).toBe(404);
  });

  it('F10: evento di storia e punti negozio si scrivono insieme alla data della partita, o per niente', async () => {
    const id = (await request(app).post('/api/partite').send({ nome: 'Transazioni' })).body.data.id as number;
    // l'aggiornamento della partita fallisce: la scrittura che lo precede deve essere annullata
    getDb().exec("CREATE TEMP TRIGGER blocca_partita BEFORE UPDATE OF updated_at ON utente.partita BEGIN SELECT RAISE(ABORT, 'bloccato dal test'); END;");
    try {
      expect((await request(app).put(`/api/condizioni/partite/${id}/eventi/mansarda-pulita`).send({ avvenuto: true })).status).toBe(500);
      expect((await request(app).put(`/api/condizioni/partite/${id}/punti-negozio/vestiti-usati-kichijoji`).send({ punti: 40 })).status).toBe(500);
    } finally {
      getDb().exec('DROP TRIGGER temp.blocca_partita');
    }
    expect(getDb().prepare('SELECT COUNT(*) FROM evento_storia_partita WHERE partita_id = ?').pluck().get(id)).toBe(0);
    expect(getDb().prepare('SELECT COUNT(*) FROM punti_negozio_partita WHERE partita_id = ?').pluck().get(id)).toBe(0);
    // senza il blocco le stesse richieste riescono
    expect((await request(app).put(`/api/condizioni/partite/${id}/eventi/mansarda-pulita`).send({ avvenuto: true })).status).toBe(200);
    expect((await request(app).put(`/api/condizioni/partite/${id}/punti-negozio/vestiti-usati-kichijoji`).send({ punti: 40 })).status).toBe(200);
  });

  it('F04: /api/health risponde 503 quando il database non risponde, senza il messaggio interno', async () => {
    closeDb();
    try {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(503);
      expect(res.body.data.status).toBe('degraded');
      expect(res.body.data.db).toEqual({ ok: false, error: 'Il database non risponde.' });
    } finally {
      dbDiProva();
    }
    expect((await request(app).get('/api/health')).status).toBe(200);
  });
});

describe('F11: profondità di un piano salvato', () => {
  const nodo = (livelli: number): Record<string, unknown> => ({ persona: { id: 1 }, modo: 'fusione', costo: 0, figli: livelli > 1 ? [nodo(livelli - 1)] : [] });
  const piano = (livelli: number) => ({ personaId: 1, piano: { radice: nodo(livelli), costo: 0, profondita: 0, catture: 0, evocazioni: 0, fusioni: 0 } });

  it(`un piano di ${LIVELLI_MAX_PIANO} livelli passa, uno di ${LIVELLI_MAX_PIANO + 1} no`, () => {
    expect(bodySalvaPiano.safeParse(piano(LIVELLI_MAX_PIANO)).success).toBe(true);
    expect(bodySalvaPiano.safeParse(piano(LIVELLI_MAX_PIANO + 1)).success).toBe(false);
  });

  it('un corpo annidato migliaia di volte si ferma con un errore di validazione, non con lo stack esaurito', () => {
    let radice: Record<string, unknown> = { persona: { id: 1 }, modo: 'scorta', costo: 0, figli: [] };
    for (let i = 0; i < 20000; i++) radice = { persona: { id: 1 }, modo: 'fusione', costo: 0, figli: [radice] };
    const esito = bodySalvaPiano.safeParse({ personaId: 1, piano: { radice, costo: 0, profondita: 0, catture: 0, evocazioni: 0, fusioni: 0 } });
    expect(esito.success).toBe(false);
  });
});
