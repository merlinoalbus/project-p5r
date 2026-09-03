// ============================================================
// Test API dettaglio Confidenti (Fase 6.1) — seed caricato, scheda completa, regali consegnati per partita
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { ConfidenteDettaglioDto, ConfidentePartitaDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API dettaglio Confidenti', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('ogni Confidente ha la scheda: abilità, dialoghi con scelte e punti normalizzati, disponibilità, fonti', async () => {
    const lista = (await request(app).get('/api/compendio/confidenti')).body.data as Array<{ chiave: string }>;
    expect(lista).toHaveLength(23);
    let dialoghi = 0;
    let scelte = 0;
    for (const c of lista) {
      const d = (await request(app).get(`/api/compendio/confidenti/${c.chiave}`)).body.data as ConfidenteDettaglioDto;
      expect(d.chiave).toBe(c.chiave);
      expect(d.abilita.length).toBeGreaterThan(0);
      expect(d.dialoghi.length).toBeGreaterThan(0);
      expect(d.fonti.length).toBeGreaterThan(0);
      expect(d.disponibilita.luogo.length).toBeGreaterThan(0);
      dialoghi += d.dialoghi.length;
      for (const x of d.dialoghi) {
        scelte += x.scelte.length;
        for (const s of x.scelte) {
          expect(s.testo.length).toBeGreaterThan(0);
          if (s.punti !== null) expect(s.punti).toBeGreaterThanOrEqual(0);
          if (s.punti !== null) expect(s.punti).toBeLessThanOrEqual(3);
        }
      }
    }
    expect(dialoghi).toBe(223);
    expect(scelte).toBe(812);
    const takemi = (await request(app).get('/api/compendio/confidenti/takemi')).body.data as ConfidenteDettaglioDto;
    expect(takemi.arcanaNome).toBe('Morte');
    expect(takemi.abilita[0]).toMatchObject({ rango: 1, nome: 'Rigenerazione' });
    expect(takemi.regali.some((g) => g.nome === 'Castella')).toBe(true);
    expect(takemi.dialoghi[0].scelte[0]).toMatchObject({ punti: 2, puntiTesto: '+2', romantica: false });
    const ann = (await request(app).get('/api/compendio/confidenti/ann')).body.data as ConfidenteDettaglioDto;
    expect(ann.dialoghi.some((d) => d.scelte.some((s) => s.romantica))).toBe(true);
    const igor = (await request(app).get('/api/compendio/confidenti/igor')).body.data as ConfidenteDettaglioDto;
    expect(igor.regali).toEqual([]);
    expect((await request(app).get('/api/compendio/confidenti/nessuno')).status).toBe(404);
  });

  it('regali consegnati per partita: spunta, ripetizione idempotente, rimozione, validazione', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Regali' })).body.data as { id: number }).id;
    let c = (await request(app).put(`/api/partite/${id}/confidenti/takemi/regali`).send({ regalo: 'Castella', fatto: true })).body.data as ConfidentePartitaDto;
    expect(c.regaliFatti).toEqual(['Castella']);
    c = (await request(app).put(`/api/partite/${id}/confidenti/takemi/regali`).send({ regalo: 'Castella', fatto: true })).body.data as ConfidentePartitaDto;
    expect(c.regaliFatti).toEqual(['Castella']);
    c = (await request(app).put(`/api/partite/${id}/confidenti/takemi/regali`).send({ regalo: 'Mini cactus', fatto: true })).body.data as ConfidentePartitaDto;
    expect(c.regaliFatti).toEqual(['Castella', 'Mini cactus']);
    const tutti = (await request(app).get(`/api/partite/${id}/confidenti`)).body.data as ConfidentePartitaDto[];
    expect(tutti.find((x) => x.chiave === 'takemi')?.regaliFatti).toEqual(['Castella', 'Mini cactus']);
    expect(tutti.find((x) => x.chiave === 'ann')?.regaliFatti).toEqual([]);
    c = (await request(app).put(`/api/partite/${id}/confidenti/takemi/regali`).send({ regalo: 'Castella', fatto: false })).body.data as ConfidentePartitaDto;
    expect(c.regaliFatti).toEqual(['Mini cactus']);
    expect((await request(app).put(`/api/partite/${id}/confidenti/takemi/regali`).send({ regalo: '', fatto: true })).status).toBe(400);
    expect((await request(app).put(`/api/partite/${id}/confidenti/nessuno/regali`).send({ regalo: 'X', fatto: true })).status).toBe(404);
    expect((await request(app).put('/api/partite/99999/confidenti/takemi/regali').send({ regalo: 'X', fatto: true })).status).toBe(404);
  });
});
