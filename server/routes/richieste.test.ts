// ============================================================
// Test API Richieste dei Mementos (Fase 7.2) — seed, Dedali nel dungeon Mementos, stato per partita con evento, Jose
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { DungeonDettaglioDto, RichiestaDto, RichiesteDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API Richieste dei Mementos', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('33 Richieste con bersaglio, area collegata ai Dedali e Jose con gli scambi; i Dedali sono aree del dungeon Mementos', async () => {
    const d = (await request(app).get('/api/compendio/richieste')).body.data as RichiesteDto;
    expect(d.totale).toBe(33);
    expect(d.richieste).toHaveLength(33);
    expect(d.richieste[0]).toMatchObject({ nome: 'Un ex piuttosto appiccicoso', stato: null });
    expect(d.richieste[0].bersaglio.debolezze).toEqual(['Tuono']);
    expect(d.richieste.every((r) => r.nome.length > 0 && r.bersaglio.nome.length > 0 && r.fonte.startsWith('http'))).toBe(true);
    expect(d.richieste.filter((r) => r.areaChiave !== null).length).toBe(33);
    expect(d.richieste.some((r) => r.confidente !== null)).toBe(true);
    expect(d.jose?.scambi.length).toBe(37);
    expect(d.jose?.bossSegreto?.nome).toContain('Jose');
    expect(d.completate).toBe(0);
    const m = (await request(app).get('/api/compendio/dungeon/mementos')).body.data as DungeonDettaglioDto;
    expect(m.tipo).toBe('mementos');
    expect(m.aree).toHaveLength(9);
    expect(m.aree[0].nome).toBe('Dedalo di Qimranut');
    expect(m.aree.flatMap((a) => a.punti).filter((p) => p.tipo === 'persona').length).toBeGreaterThan(100);
    expect(m.aree.some((a) => a.punti.some((p) => p.tipo === 'sicura'))).toBe(true);
    expect(d.richieste[0].areaChiave).toBe(m.aree[0].chiave);
    expect((await request(app).get('/api/compendio/richieste?partita=99999')).status).toBe(404);
  });

  it('stato per partita: accettata → completata con evento (una sola volta), riapertura, validazione', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Richieste' })).body.data as { id: number }).id;
    const prima = ((await request(app).get('/api/compendio/richieste')).body.data as RichiesteDto).richieste[0];
    let r = (await request(app).put(`/api/partite/${id}/richieste`).send({ richiesta: prima.chiave, stato: 'accettata' })).body.data as RichiestaDto;
    expect(r.stato).toBe('accettata');
    r = (await request(app).put(`/api/partite/${id}/richieste`).send({ richiesta: prima.chiave, stato: 'completata' })).body.data as RichiestaDto;
    expect(r.stato).toBe('completata');
    r = (await request(app).put(`/api/partite/${id}/richieste`).send({ richiesta: prima.chiave, stato: 'completata' })).body.data as RichiestaDto;
    const con = (await request(app).get(`/api/compendio/richieste?partita=${id}`)).body.data as RichiesteDto;
    expect(con.completate).toBe(1);
    expect(con.richieste[0].stato).toBe('completata');
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=richiesta-completata`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].titolo).toContain(prima.nome);
    r = (await request(app).put(`/api/partite/${id}/richieste`).send({ richiesta: prima.chiave, stato: null })).body.data as RichiestaDto;
    expect(r.stato).toBeNull();
    expect((await request(app).put(`/api/partite/${id}/richieste`).send({ richiesta: 'nessuna', stato: 'accettata' })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/richieste`).send({ richiesta: prima.chiave, stato: 'boh' })).status).toBe(400);
  });
});
