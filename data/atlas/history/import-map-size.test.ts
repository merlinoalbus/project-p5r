import request from 'supertest';
import { createApp } from '../bootstrap.js';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';

const app = createApp();
const countMaps = () => (getDb().prepare('SELECT COUNT(*) AS n FROM mappa').get() as { n: number }).n;

describe('dimensione dei pacchetti mappe HTTP', () => {
  beforeAll(() => { runMigrations(initDb(':memory:')); });
  afterAll(() => { closeDb(); });

  it('importa un JSON valido oltre 5 MB sulla route dedicata', async () => {
    const before = countMaps();
    const body = ' '.repeat(6 * 1024 * 1024) + JSON.stringify({ pacchetto: {
      versione: 1, mappe: [{ chiave: 'dimensione-import', nome: 'Importazione dimensione', tipo: 'generica', spilli: [] }], immagini: {},
    } });
    const response = await request(app).post('/api/mappe/importa').set('Content-Type', 'application/json').send(body);
    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ mappe: 1, saltate: [], condizioniScartate: 0 });
    expect(countMaps()).toBe(before + 1);
  });

  it('mantiene 5 MB sulle altre route e sugli altri metodi', async () => {
    const body = ' '.repeat(6 * 1024 * 1024) + '{}';
    for (const endpoint of ['/api/partite', '/api/mappe/importa/extra']) {
      const response = await request(app).post(endpoint).set('Content-Type', 'application/json').send(body);
      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe('corpo-troppo-grande');
    }
    const response = await request(app).put('/api/mappe/importa').set('Content-Type', 'application/json').send(body);
    expect(response.status).toBe(413);
  });

  it('rifiuta JSON malformato senza inserire mappe', async () => {
    const before = countMaps();
    const response = await request(app).post('/api/mappe/importa').set('Content-Type', 'application/json').send('{"pacchetto":');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('json-malformato');
    expect(countMaps()).toBe(before);
  });

  it('rifiuta oltre 64 MB senza inserire mappe', async () => {
    const before = countMaps();
    const response = await request(app).post('/api/mappe/importa').set('Content-Type', 'application/json')
      .send(' '.repeat(64 * 1024 * 1024) + '{}');
    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe('corpo-troppo-grande');
    expect(countMaps()).toBe(before);
  });
});
