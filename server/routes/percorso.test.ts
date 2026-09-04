// ============================================================
// Test API percorso giorno per giorno (Fase 7.5b) — seed, indice, scheda del giorno con riferimenti, azioni fatte per partita con evento, giorno corrente
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AzionePercorsoDto, PercorsoGiornoDto, PercorsoIndiceDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API percorso giorno per giorno', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('indice: 346 giorni dal 9 aprile al 20 marzo in ordine, conteggi; scheda del 12 aprile con azioni, riferimenti risolti e collegamenti', async () => {
    const i = (await request(app).get('/api/compendio/percorso')).body.data as PercorsoIndiceDto;
    expect(i.totaleGiorni).toBe(346);
    expect(i.giorni[0]).toMatchObject({ giorno: '04-09', giornoSettimana: 'sab' });
    expect(i.giorni[i.giorni.length - 1].giorno).toBe('03-20');
    expect(i.giorniCoperti).toBeGreaterThanOrEqual(290);
    expect(i.dataCorrente).toBeNull();
    const g = (await request(app).get('/api/compendio/percorso/04-12')).body.data as PercorsoGiornoDto;
    expect(g).toMatchObject({ giorno: '04-12', giornoSettimana: 'mar', fase: 'Palazzo di Kamoshida', precedente: '04-11', successivo: '04-13', coperto: true });
    expect(g.trama.length).toBeGreaterThan(20);
    expect(g.azioni.length).toBeGreaterThanOrEqual(3);
    expect(g.azioni.map((a) => a.indice)).toEqual(g.azioni.map((_, k) => k));
    expect(g.azioni.find((a) => a.tipo === 'palazzo')?.riferimento).toEqual({ tipo: 'dungeon', chiave: 'kamoshida' });
    expect(g.azioni.find((a) => a.fascia === 'sera' && a.tipo === 'confidente')?.riferimento).toEqual({ tipo: 'confidente', chiave: 'ryuji' });
    expect(g.avvisi.length).toBeGreaterThan(0);
    expect(g.fonte.startsWith('https://www.allgamestaff.it/')).toBe(true);
    expect((await request(app).get('/api/compendio/percorso/13-40')).status).toBe(404);
    expect((await request(app).get('/api/compendio/percorso?partita=99999')).status).toBe(404);
  });

  it('azioni fatte per partita con evento (una sola volta), riapertura, validazione; giorno corrente; reseed stabile', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Percorso' })).body.data as { id: number }).id;
    let a = (await request(app).put(`/api/partite/${id}/percorso`).send({ data: '04-12', indice: 0, fatta: true })).body.data as AzionePercorsoDto;
    expect(a).toMatchObject({ indice: 0, fatta: true });
    a = (await request(app).put(`/api/partite/${id}/percorso`).send({ data: '04-12', indice: 0, fatta: true })).body.data as AzionePercorsoDto; // idempotente
    const g = (await request(app).get(`/api/compendio/percorso/04-12?partita=${id}`)).body.data as PercorsoGiornoDto;
    expect(g.fatte).toBe(1);
    expect(g.azioni[0].fatta).toBe(true);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=percorso`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].titolo).toContain('04-12');
    a = (await request(app).put(`/api/partite/${id}/percorso`).send({ data: '04-12', indice: 0, fatta: false })).body.data as AzionePercorsoDto;
    expect(a.fatta).toBe(false);
    expect((await request(app).put(`/api/partite/${id}/percorso`).send({ data: '04-12', indice: 99, fatta: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/percorso`).send({ data: '2016-04-12', indice: 0, fatta: true })).status).toBe(400);
    const gc = (await request(app).put(`/api/partite/${id}/giorno`).send({ data: '05-19' })).body.data as { dataCorrente: string };
    expect(gc.dataCorrente).toBe('05-19');
    const i = (await request(app).get(`/api/compendio/percorso?partita=${id}`)).body.data as PercorsoIndiceDto;
    expect(i.dataCorrente).toBe('05-19');
    expect((await request(app).put(`/api/partite/${id}/giorno`).send({ data: '13-40' })).status).toBe(404);
    await request(app).put(`/api/partite/${id}/percorso`).send({ data: '05-19', indice: 0, fatta: true });
    caricaSeed(getDb(), DIR_SEED, true);
    const dopo = (await request(app).get(`/api/compendio/percorso/05-19?partita=${id}`)).body.data as PercorsoGiornoDto;
    expect(dopo.azioni[0].fatta).toBe(true);
    expect(dopo.dataCorrente).toBe('05-19');
  });
});
