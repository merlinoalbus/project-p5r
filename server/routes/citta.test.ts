// ============================================================
// Test API città e attività (Fase 8.1) — quartieri, luoghi, attività/lavori/libri/film, letture per partita con evento, reseed stabile
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AttivitaTutteDto, LibroDto, QuartiereDettaglioDto, QuartiereRiassuntoDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API città e attività', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('quartieri con conteggi e scheda con luoghi (Confidenti risolti, piatti, flag verificato)', async () => {
    const q = (await request(app).get('/api/compendio/citta')).body.data as QuartiereRiassuntoDto[];
    expect(q.length).toBeGreaterThanOrEqual(20);
    expect(q[0]).toMatchObject({ chiave: 'yongen-jaya', nome: 'Yongen-Jaya' });
    expect(q.reduce((s, x) => s + x.luoghi, 0)).toBe(84);
    expect(q.every((x) => x.luoghi > 0 && x.verificati <= x.luoghi)).toBe(true);
    const s = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    expect(s.luoghi).toHaveLength(22);
    const u = s.luoghi.find((l) => l.nome === 'Untouchable')!;
    expect(u).toMatchObject({ chiave: 'shibuya/untouchable', tipo: 'negozio', quando: 'sera', verificato: true });
    expect(u.confidenti).toEqual([{ chiave: 'iwai', nome: expect.stringContaining('Iwai') }]);
    expect(u.fonte.startsWith('https://www.allgamestaff.it/')).toBe(true);
    const y = (await request(app).get('/api/compendio/citta/yongen-jaya')).body.data as QuartiereDettaglioDto;
    expect(y.luoghi.some((l) => l.piatti !== null && l.piatti.length > 0)).toBe(true);
    expect((await request(app).get('/api/compendio/citta/atlantide')).status).toBe(404);
  });

  it('attività, lavori, libri e film con Doti; letture per partita con evento, riapertura, validazione, reseed stabile', async () => {
    const a = (await request(app).get('/api/compendio/attivita')).body.data as AttivitaTutteDto;
    expect(a.attivita.length).toBeGreaterThanOrEqual(20);
    expect(a.lavori).toHaveLength(4);
    expect(a.libri).toHaveLength(46);
    expect(a.film).toHaveLength(21);
    expect(a.attivita.find((x) => x.chiave === 'freccette')).toMatchObject({ luogoChiave: 'kichijoji', fascia: 'sera', costo: 800, doti: [{ dote: 'perizia', note: 1, condizione: expect.any(String) }], verificato: true });
    expect(a.lavori.every((x) => x.tipo === 'lavoro' && x.doti.length > 0)).toBe(true);
    expect(a.libri.filter((l) => l.dote !== null).length).toBeGreaterThanOrEqual(20);
    expect(a.libri.every((l) => l.fonte.startsWith('http') && !l.fatto)).toBe(true);
    expect(a.film.filter((f) => f.dove === 'dvd')).toHaveLength(12);
    expect(a).toMatchObject({ libriLetti: 0, filmVisti: 0 });
    expect((await request(app).get('/api/compendio/attivita?partita=99999')).status).toBe(404);

    const id = ((await request(app).post('/api/partite').send({ nome: 'Letture' })).body.data as { id: number }).id;
    const libro = a.libri.find((l) => l.dote !== null)!;
    let r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: libro.chiave, fatto: true })).body.data as LibroDto;
    expect(r.fatto).toBe(true);
    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: libro.chiave, fatto: true })).body.data as LibroDto; // idempotente
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'film', chiave: a.film[0].chiave, fatto: true });
    const con = (await request(app).get(`/api/compendio/attivita?partita=${id}`)).body.data as AttivitaTutteDto;
    expect(con).toMatchObject({ libriLetti: 1, filmVisti: 1 });
    expect(con.libri.find((l) => l.chiave === libro.chiave)?.fatto).toBe(true);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=lettura`)).body.data as StoricoDto;
    expect(storico.totale).toBe(2);
    expect(storico.eventi.some((e) => e.titolo.includes(libro.nomeIt ?? libro.nome))).toBe(true);
    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: libro.chiave, fatto: false })).body.data as LibroDto;
    expect(r.fatto).toBe(false);
    expect((await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'nessuno', fatto: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'rivista', chiave: libro.chiave, fatto: true })).status).toBe(400);
    // reseed forzato: le letture restano
    caricaSeed(getDb(), DIR_SEED, true);
    const dopo = (await request(app).get(`/api/compendio/attivita?partita=${id}`)).body.data as AttivitaTutteDto;
    expect(dopo.filmVisti).toBe(1);
    expect(dopo.libri).toHaveLength(46);
  });
});
