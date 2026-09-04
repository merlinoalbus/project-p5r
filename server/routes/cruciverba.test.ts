// ============================================================
// Test API cruciverba (Fase 7.5) — seed, ordine di calendario, spunta per partita con evento, validazione
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { CruciverbaDto, CruciverbaTuttiDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API cruciverba', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('38 cruciverba in ordine di anno scolastico con indizio, risposta italiana e inglese, fonte allgamestaff', async () => {
    const d = (await request(app).get('/api/compendio/cruciverba')).body.data as CruciverbaTuttiDto;
    expect(d.totale).toBe(38);
    expect(d.cruciverba[0]).toMatchObject({ giorno: '04-18', risposta: 'Semestri', rispostaEn: 'Semesters', fatto: false });
    expect(d.cruciverba.every((c) => c.indizio.length > 0 && c.risposta.length > 0 && c.fonte.startsWith('https://www.allgamestaff.it/'))).toBe(true);
    const mesi = d.cruciverba.map((c) => Number(c.giorno.slice(0, 2)));
    const scolastico = mesi.map((m) => (m >= 4 ? m : m + 12));
    expect([...scolastico].sort((a, b) => a - b)).toEqual(scolastico);
    expect(new Set(d.cruciverba.map((c) => c.giorno)).size).toBe(38);
    expect((await request(app).get('/api/compendio/cruciverba?partita=99999')).status).toBe(404);
  });

  it('spunta per partita con evento (una sola volta), rimozione, validazione', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Cruciverba' })).body.data as { id: number }).id;
    let c = (await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: '04-18', fatto: true })).body.data as CruciverbaDto;
    expect(c.fatto).toBe(true);
    c = (await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: '04-18', fatto: true })).body.data as CruciverbaDto;
    const con = (await request(app).get(`/api/compendio/cruciverba?partita=${id}`)).body.data as CruciverbaTuttiDto;
    expect(con.risolti).toBe(1);
    expect(con.cruciverba[0].fatto).toBe(true);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=cruciverba`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].titolo).toContain('Semestri');
    c = (await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: '04-18', fatto: false })).body.data as CruciverbaDto;
    expect(c.fatto).toBe(false);
    expect((await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: '13-40', fatto: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: '04-18' })).status).toBe(400);
  });
});
