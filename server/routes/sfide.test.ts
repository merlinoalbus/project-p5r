// ============================================================
// Test API sfide (Fase 9.2) — Battaglie Sfida, boss segreti, Magnate, tratti; quiz TV nelle domande
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { DomandeDto, SfideDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API sfide', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('7 Battaglie Sfida con regole, nemici e ricompense; 3 boss segreti; Magnate; 90 tratti con effetto', async () => {
    const res = await request(app).get('/api/compendio/sfide');
    expect(res.status).toBe(200);
    const d = res.body.data as SfideDto;
    expect(d.battaglieSfida.elenco).toHaveLength(7);
    expect(d.battaglieSfida.elenco.map((s) => s.chiave)).toEqual(expect.arrayContaining(['trial', 'chain', 'technical', 'survival', 'trickster', 'full-moon', 'foggy-day']));
    expect(d.battaglieSfida.elenco.every((s) => s.regole.length > 0 && s.nemici.length > 0 && s.fonte.startsWith('https://www.allgamestaff.it/'))).toBe(true);
    expect(d.bossSegreti.map((b) => b.chiave)).toEqual(['jose', 'gemelle-custodi', 'lavenza']);
    expect(d.bossSegreti[0].mosse.length).toBeGreaterThan(3);
    expect(d.bossSegreti[0].strategia.length).toBeGreaterThan(0);
    expect(d.magnate).not.toBeNull();
    expect(d.tratti.elenco).toHaveLength(90);
    expect(d.tratti.elenco[0]).toMatchObject({ nome: 'Stirpe ardente', effetto: expect.stringContaining('Fuoco') });
    expect(d.tratti.fonte.startsWith('https://www.allgamestaff.it/')).toBe(true);
  });

  it('le 11 domande del game show in TV sono tra le domande (tipo «altro»), ordinate per anno scolastico', async () => {
    const d = (await request(app).get('/api/compendio/domande')).body.data as DomandeDto;
    const quiz = d.domande.filter((x) => x.tipo === 'altro' && x.chi === 'Game show in TV');
    expect(quiz).toHaveLength(11);
    expect(d.totale).toBe(78);
    expect(quiz[0]).toMatchObject({ data: '05-19', risposte: [{ ordine: 1, testo: 'Produrre rumori molesti' }] });
    expect(quiz.every((x) => x.ricompensa.length > 0 && x.fonte.startsWith('https://www.allgamestaff.it/'))).toBe(true);
    const mesi = d.domande.map((x) => ((Number(x.data.slice(0, 2)) - 4 + 12) % 12) * 100 + Number(x.data.slice(3, 5)));
    expect([...mesi].sort((a, b) => a - b)).toEqual(mesi);
  });
});
