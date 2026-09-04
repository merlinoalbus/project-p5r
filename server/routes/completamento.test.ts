// ============================================================
// Test API completamento (Fase 9.1) — trofei con stato per partita ed evento, finali, Covo dei Ladri, DLC, meteo, Nuova Partita+, tempo
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { CompletamentoDto, StoricoDto, TrofeoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API completamento', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('53 trofei (44 bronzo, 7 argento, 1 oro, 1 platino), 6 finali con condizioni, Covo con 52 sfide e 36 premi, 12 DLC, 11 voci meteo, Nuova Partita+, tempo', async () => {
    const d = (await request(app).get('/api/compendio/completamento')).body.data as CompletamentoDto;
    expect(d.trofei).toHaveLength(53);
    const tipi = d.trofei.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t.tipo]: (acc[t.tipo] ?? 0) + 1 }), {});
    expect(tipi).toEqual({ bronzo: 44, argento: 7, oro: 1, platino: 1 });
    expect(d.trofei[0]).toMatchObject({ chiave: 'assedio-al-castello-della-lussuria', nome: 'Assedio al castello della lussuria', nomeEn: 'Castle of Lust: Seized', tipo: 'bronzo', ottenuto: false, verificato: true });
    expect(d.trofei.every((t) => t.fonte.startsWith('https://www.allgamestaff.it/') && t.descrizione.length > 0)).toBe(true);
    expect(d.ottenuti).toBe(0);
    expect(d.finali).toHaveLength(6);
    expect(d.finali[0].condizioni.some((c) => c.includes('Maruki') && c.includes('17 novembre'))).toBe(true);
    expect(d.covo.sfide).toHaveLength(52);
    expect(d.covo.premi).toHaveLength(36);
    expect(d.dlc).toHaveLength(12);
    expect(d.meteo).toHaveLength(11);
    expect(d.nuovaPartitaPlus.trasferito.length).toBeGreaterThanOrEqual(15);
    expect(d.differenzeRoyal.length).toBeGreaterThanOrEqual(20);
    expect(d.tempo.fasce.length).toBeGreaterThanOrEqual(4);
    expect((await request(app).get('/api/compendio/completamento?partita=99999')).status).toBe(404);
  });

  it('trofeo ottenuto per partita con evento (una sola volta), rimozione, validazione, reseed stabile', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Trofei' })).body.data as { id: number }).id;
    let t = (await request(app).put(`/api/partite/${id}/trofei`).send({ trofeo: 'assedio-al-castello-della-lussuria', ottenuto: true })).body.data as TrofeoDto;
    expect(t.ottenuto).toBe(true);
    t = (await request(app).put(`/api/partite/${id}/trofei`).send({ trofeo: 'assedio-al-castello-della-lussuria', ottenuto: true })).body.data as TrofeoDto;
    const con = (await request(app).get(`/api/compendio/completamento?partita=${id}`)).body.data as CompletamentoDto;
    expect(con.ottenuti).toBe(1);
    expect(con.trofei[0].ottenuto).toBe(true);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=trofeo`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].titolo).toContain('Assedio al castello della lussuria');
    t = (await request(app).put(`/api/partite/${id}/trofei`).send({ trofeo: 'assedio-al-castello-della-lussuria', ottenuto: false })).body.data as TrofeoDto;
    expect(t.ottenuto).toBe(false);
    expect((await request(app).put(`/api/partite/${id}/trofei`).send({ trofeo: 'inesistente', ottenuto: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/trofei`).send({ trofeo: 'assedio-al-castello-della-lussuria' })).status).toBe(400);
    await request(app).put(`/api/partite/${id}/trofei`).send({ trofeo: con.trofei[1].chiave, ottenuto: true });
    caricaSeed(getDb(), DIR_SEED, true);
    const dopo = (await request(app).get(`/api/compendio/completamento?partita=${id}`)).body.data as CompletamentoDto;
    expect(dopo.ottenuti).toBe(1);
    expect(dopo.trofei).toHaveLength(53);
  });
});
