// ============================================================
// Test API calendario (Fase 6.3) — seed, mesi, settimana della guida, oggi nella partita e prossime scadenze
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { indiceGiornoScolastico } from '../services/domandeService.js';
import type { CalendarioDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API calendario', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('calendario completo: 346 giorni in ordine, giorni della settimana coerenti, settimane della guida assegnate, eventi con fonte', async () => {
    const c = (await request(app).get('/api/compendio/calendario')).body.data as CalendarioDto;
    expect(c.giorni).toHaveLength(346);
    expect(c.giorni[0]).toMatchObject({ data: '04-09', giornoSettimana: 'Sabato' });
    expect(c.mesi).toEqual(['04', '05', '06', '07', '08', '09', '10', '11', '12', '01', '02', '03']);
    expect(c.settimane.length).toBe(42);
    for (let i = 1; i < c.giorni.length; i++) expect(indiceGiornoScolastico(c.giorni[i].data)).toBeGreaterThan(indiceGiornoScolastico(c.giorni[i - 1].data));
    const settimana = ['Sabato', 'Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì'];
    for (let i = 0; i < 14; i++) expect(c.giorni[i].giornoSettimana).toBe(settimana[i % 7]);
    expect(c.giorni.find((g) => g.data === '04-25')?.settimana).toBe(3);
    expect(c.giorni.find((g) => g.data === '04-09')?.settimana).toBe(0);
    const eventi = c.giorni.flatMap((g) => g.eventi);
    expect(eventi.length).toBeGreaterThan(150);
    expect(eventi.every((e) => e.titolo.length > 0 && e.fonte.startsWith('http'))).toBe(true);
    expect(c.giorni.filter((g) => g.meteo).length).toBeGreaterThan(280);
    expect(c.oggi).toBeNull();
    expect(c.prossimeScadenze).toEqual([]);
    // esami nel calendario coerenti con le sessioni d'esame
    expect(c.giorni.find((g) => g.data === '05-11')?.eventi.some((e) => e.tipo === 'esame')).toBe(true);
  });

  it('filtro per mese e validazione', async () => {
    const m = (await request(app).get('/api/compendio/calendario?mese=01')).body.data as CalendarioDto;
    expect(m.giorni.length).toBe(31);
    expect(m.giorni.every((g) => g.data.startsWith('01-'))).toBe(true);
    expect((await request(app).get('/api/compendio/calendario?mese=13')).status).toBe(400);
    expect((await request(app).get('/api/compendio/calendario?partita=99999')).status).toBe(404);
  });

  it('con la partita: oggi, settimana della guida e prossime scadenze con i giorni mancanti', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Calendario', dataGioco: '05-01' })).body.data as { id: number }).id;
    const c = (await request(app).get(`/api/compendio/calendario?partita=${id}&mese=05`)).body.data as CalendarioDto;
    expect(c.dataGioco).toBe('05-01');
    expect(c.oggi?.data).toBe('05-01');
    expect(c.oggi?.settimana).toBe(4);
    expect(c.prossimeScadenze.length).toBeGreaterThan(0);
    expect(c.prossimeScadenze[0].giorniMancanti).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < c.prossimeScadenze.length; i++) expect(c.prossimeScadenze[i].giorniMancanti).toBeGreaterThanOrEqual(c.prossimeScadenze[i - 1].giorniMancanti);
    expect(c.prossimeScadenze.some((s) => s.tipo === 'esame' && s.data === '05-11')).toBe(true);
    expect(c.prossimeScadenze.find((s) => s.data === '05-11')?.giorniMancanti).toBe(10);
  });
});
