// ============================================================
// Test API suggerimenti del giorno — chiavi da evidenziare in oro, entità indirette comprese (12.4)
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { PercorsoGiornoDto, SuggerimentiOggiDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API suggerimenti del giorno', () => {
  let id = 0;
  beforeAll(async () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
    id = ((await request(app).post('/api/partite').send({ nome: 'Suggerimenti' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('una nuova partita parte dal primo giorno e suggerisce le entità delle azioni ancora da fare', async () => {
    const primo = (await request(app).get(`/api/partite/${id}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(primo.giorno).toBe('04-09');
    // il 9 aprile e il prologo: nessuna azione collegata a un'entita, quindi nessun alone
    expect(primo.motivi).toEqual([]);
    // dall'11 aprile ci sono azioni con riferimento: ogni motivo punta a una chiave della sua categoria
    await request(app).put(`/api/partite/${id}/giorno`).send({ data: '04-11' });
    const s = (await request(app).get(`/api/partite/${id}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(s.motivi.length).toBeGreaterThan(0);
    // ogni motivo punta a una chiave presente nella sua categoria
    for (const m of s.motivi) {
      const elenco = (s as unknown as Record<string, string[]>)[m.categoria];
      expect(elenco).toContain(m.chiave);
      expect(m.azione.length).toBeGreaterThan(0);
      expect(['giorno', 'sera']).toContain(m.fascia);
    }
  });

  it('un Palazzo suggerito accende la sua mappa e le sue aree; un’azione bloccata dai requisiti non viene suggerita', async () => {
    // 12 aprile: esplorazione del Palazzo di Kamoshida e cena con Ryuji (rango 1: apre proprio quel giorno)
    await request(app).put(`/api/partite/${id}/giorno`).send({ data: '04-12' });
    const s = (await request(app).get(`/api/partite/${id}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(s.giorno).toBe('04-12');
    expect(s.dungeon).toContain('kamoshida');
    expect(s.mappe).toContain('dungeon-kamoshida');
    expect(s.aree.length).toBeGreaterThan(0);
    expect(s.confidenti).toContain('ryuji');
    // 26 luglio: la guida propone di avviare Makoto, ma il rango 1 chiede Conoscenza 3 e la partita e a 1: azione bloccata, non suggerita
    await request(app).put(`/api/partite/${id}/giorno`).send({ data: '07-26' });
    const luglio = (await request(app).get(`/api/partite/${id}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(luglio.confidenti).not.toContain('makoto');
  });

  it('un Confidente suggerito accende il luogo dove si incontra, il quartiere e la mappa del quartiere', async () => {
    // 18 aprile (nuvoloso): primo incontro con Tae Takemi in clinica
    await request(app).put(`/api/partite/${id}/giorno`).send({ data: '04-18' });
    const s = (await request(app).get(`/api/partite/${id}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(s.confidenti).toContain('takemi');
    const luoghi = s.luoghi.filter((l) => l.includes('/'));
    expect(luoghi.length).toBeGreaterThan(0);
    for (const l of luoghi) expect(s.quartieri).toContain(l.split('/')[0]);
    for (const q of s.quartieri) expect(s.mappe).toContain(`citta-${q}`);
  });

  it('un libro suggerito accende il libro e la libreria dove si prende; spuntando l’azione il suggerimento sparisce', async () => {
    // 18 aprile: prendere in prestito «La leggenda dei pirati» in biblioteca
    await request(app).put(`/api/partite/${id}/giorno`).send({ data: '04-18' });
    const s = (await request(app).get(`/api/partite/${id}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(s.libri).toContain('la-leggenda-dei-pirati');
    expect(s.luoghi.some((l) => l.includes('bibliotec'))).toBe(true);
    // spunta dell'azione del libro: il libro non è più fra i suggerimenti
    const giorno = (await request(app).get(`/api/compendio/percorso/04-18?partita=${id}`)).body.data as PercorsoGiornoDto;
    const azione = giorno.azioni.find((a) => a.riferimento?.tipo === 'libro')!;
    expect((await request(app).put(`/api/partite/${id}/percorso`).send({ data: '04-18', indice: azione.indice, fatta: true })).status).toBe(200);
    const dopo = (await request(app).get(`/api/partite/${id}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(dopo.libri).not.toContain('la-leggenda-dei-pirati');
  });

  it('senza giorno corrente non ci sono suggerimenti; partita inesistente → 404', async () => {
    const altra = ((await request(app).post('/api/partite').send({ nome: 'Senza data', dataGioco: null })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${altra}`).send({ dataGioco: null });
    const s = (await request(app).get(`/api/partite/${altra}/suggerimenti`)).body.data as SuggerimentiOggiDto;
    expect(s.giorno).toBeNull();
    expect(s.motivi).toEqual([]);
    expect(s.confidenti).toEqual([]);
    expect((await request(app).get('/api/partite/999999/suggerimenti')).status).toBe(404);
  });
});
