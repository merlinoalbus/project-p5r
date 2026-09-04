// ============================================================
// Test API piani di fusione — motivo esplicito quando non ci può essere alcun piano (Fase 14.3)
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { PersonaRiassuntoDto, PianiFusioneDto, SkillRiassuntoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API piani di fusione — motivo', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  const idDi = async (nome: string): Promise<number> => ((await request(app).get(`/api/compendio/persona?q=${encodeURIComponent(nome)}`)).body.data as PersonaRiassuntoDto[]).find((p) => p.nome === nome)!.id;

  it('Arsène si ottiene per fusione (stesso arcano): motivo null; con «Bagno di sangue» il motivo spiega che il suo tipo di eredità non ammette l’elemento', async () => {
    const arsene = await idDi('Arsène');
    const senza = (await request(app).get(`/api/fusione/piani/${arsene}`)).body.data as PianiFusioneDto;
    expect(senza.motivo).toBeNull();
    expect(senza.piani.length).toBeGreaterThan(0);
    const bloodbath = ((await request(app).get('/api/compendio/skill?q=Bloodbath')).body.data as SkillRiassuntoDto[]).find((s) => s.nome === 'Bloodbath')!;
    const con = (await request(app).get(`/api/fusione/piani/${arsene}?skill=${bloodbath.id}`)).body.data as PianiFusioneDto;
    expect(con.piani).toEqual([]);
    expect(con.motivo?.codice).toBe('skill-non-ereditabili');
    expect(con.motivo?.testo).toMatch(/Bagno di sangue/);
  });

  it('con un limite di livello sotto la prima Persona che conosce la skill dal livello base il motivo è «limite-livello»', async () => {
    const jack = await idDi('Jack Frost');
    const bufudyne = ((await request(app).get('/api/compendio/skill?q=Bufudyne')).body.data as SkillRiassuntoDto[]).find((s) => s.nome === 'Bufudyne')!;
    const limitato = (await request(app).get(`/api/fusione/piani/${jack}?skill=${bufudyne.id}&livelloMax=5`)).body.data as PianiFusioneDto;
    expect(limitato.piani).toEqual([]);
    expect(limitato.motivo?.codice).toBe('limite-livello');
    expect(limitato.motivo?.testo).toMatch(/livello più basso/);
  });

  it('un Demone del Tesoro non è fondibile; una Persona fondibile con skill di elemento non ereditabile ha il motivo «skill-non-ereditabili»; senza vincoli il motivo è null', async () => {
    const regent = await idDi('Regent');
    expect(((await request(app).get(`/api/fusione/piani/${regent}`)).body.data as PianiFusioneDto).motivo?.codice).toBe('non-fondibile');
    const jack = await idDi('Jack Frost');
    const libero = (await request(app).get(`/api/fusione/piani/${jack}`)).body.data as PianiFusioneDto;
    expect(libero.motivo).toBeNull();
    expect(libero.piani.length).toBeGreaterThan(0);
    // Jack Frost eredita ghiaccio: una skill di fuoco non è ereditabile
    const agi = ((await request(app).get('/api/compendio/skill?q=Agi')).body.data as SkillRiassuntoDto[]).find((s) => s.nome === 'Agi')!;
    const fuoco = (await request(app).get(`/api/fusione/piani/${jack}?skill=${agi.id}`)).body.data as PianiFusioneDto;
    expect(fuoco.motivo?.codice).toBe('skill-non-ereditabili');
    expect(fuoco.piani).toEqual([]);
  });
});
