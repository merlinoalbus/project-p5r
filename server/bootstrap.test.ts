// ============================================================
// Test bootstrap — envelope, health, config, 404, JSON malformato
// ============================================================

import request from 'supertest';
import { closeDb, initDb } from './db/dbService.js';
import { createApp } from './bootstrap.js';

describe('createApp', () => {
  beforeAll(() => {
    initDb(':memory:');
  });

  afterAll(() => {
    closeDb();
  });

  it('GET /api/health risponde con envelope { data } e stato ok', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.db.ok).toBe(true);
    expect(res.body.data.db.userVersion).toBe(0);
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('GET /api/config espone versione e gioco', async () => {
    const res = await request(createApp()).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ appVersion: expect.any(String), gioco: 'Persona 5 Royal' });
  });

  it('non espone X-Powered-By', async () => {
    const res = await request(createApp()).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('propaga un X-Request-Id in ingresso', async () => {
    const res = await request(createApp()).get('/api/health').set('X-Request-Id', 'test-123');
    expect(res.headers['x-request-id']).toBe('test-123');
  });

  it('GET /api/inesistente → 404 JSON con codice not-found e requestId', async () => {
    const res = await request(createApp()).get('/api/inesistente');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not-found');
    expect(res.body.error.message).toContain('/api/inesistente');
    expect(res.body.requestId).toBeTruthy();
  });

  it('body JSON malformato → 400 json-malformato', async () => {
    const res = await request(createApp())
      .post('/api/qualsiasi')
      .set('Content-Type', 'application/json')
      .send('{"non": chiuso');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('json-malformato');
  });

  it('percorso con codifica non valida → 400 percorso-non-valido (non 500)', async () => {
    const res = await request(createApp()).get('/api/compendio/persona/%ZZ');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('percorso-non-valido');
  });

  it('preflight OPTIONS risponde con header CORS', async () => {
    const res = await request(createApp())
      .options('/api/health')
      .set('Origin', 'http://esempio.test')
      .set('Access-Control-Request-Method', 'GET');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
