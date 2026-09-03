// ============================================================
// Test API fusione — fondi, ricette, con; contesto DLC da partita o esplicito; filtri e validazione
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { EsitoFusioneDto, PersonaRiassuntoDto, RicetteFusioneDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

async function idDi(nome: string): Promise<number> {
  const lista = (await request(app).get(`/api/compendio/persona?q=${encodeURIComponent(nome)}`)).body.data as PersonaRiassuntoDto[];
  const p = lista.find((x) => x.nome === nome);
  if (!p) throw new Error(`Persona ${nome} non trovata`);
  return p.id;
}

describe('API fusione', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('fondi: risultato con nomi italiani, costo e tipo; errori spiegati in italiano', async () => {
    const arsene = await idDi('Arsène');
    const pixie = await idDi('Pixie');
    const res = await request(app).get(`/api/fusione/fondi?a=${arsene}&b=${pixie}`);
    expect(res.status).toBe(200);
    const esito = res.body.data as EsitoFusioneDto;
    expect(esito.ricetta).not.toBeNull();
    expect(esito.ricetta!.tipo).toBe('normale');
    expect(esito.ricetta!.risultato.arcanaNome).toBeTruthy();
    expect(esito.ricetta!.costo).toBe(27 * 1 + 126 * 1 + 2147 + 27 * 4 + 126 * 2 + 2147);
    expect(esito.motivo).toBeNull();

    const stesso = (await request(app).get(`/api/fusione/fondi?a=${arsene}&b=${arsene}`)).body.data as EsitoFusioneDto;
    expect(stesso.ricetta).toBeNull();
    expect(stesso.motivo).toMatch(/sé stessa/);

    expect((await request(app).get('/api/fusione/fondi?a=1')).status).toBe(400);
    expect((await request(app).get('/api/fusione/fondi?a=1&b=999999')).status).toBe(404);
  });

  it('DLC: escluse senza contesto, incluse con dlc esplicito o con la partita che le possiede', async () => {
    const izanagi = await idDi('Izanagi');
    const arsene = await idDi('Arsène');
    const senza = (await request(app).get(`/api/fusione/fondi?a=${izanagi}&b=${arsene}`)).body.data as EsitoFusioneDto;
    expect(senza.ricetta).toBeNull();
    expect(senza.motivo).toMatch(/contenuto scaricabile/);
    const con = (await request(app).get(`/api/fusione/fondi?a=${izanagi}&b=${arsene}&dlc=1,2,3,4,5,6,7,8,9,10,11,12,13`)).body.data as EsitoFusioneDto;
    expect(con.ricetta).not.toBeNull();
    // partita con tutti i DLC
    const p = await request(app).post('/api/partite').send({ nome: 'Fusioni', dlcPosseduti: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], livelloProtagonista: 20 });
    expect(p.status).toBe(201);
    const daPartita = (await request(app).get(`/api/fusione/fondi?a=${izanagi}&b=${arsene}&partita=${p.body.data.id}`)).body.data as EsitoFusioneDto;
    expect(daPartita.ricetta).not.toBeNull();
    expect(daPartita.dlcPosseduti).toHaveLength(13);
    expect((await request(app).get(`/api/fusione/fondi?a=${izanagi}&b=${arsene}&partita=999`)).status).toBe(404);
  });

  it('ricette: totale, filtro livelloMax, limite, ordinamento per costo; speciale e rara', async () => {
    const jack = await idDi('Jack Frost');
    const tutte = (await request(app).get(`/api/fusione/ricette/${jack}`)).body.data as RicetteFusioneDto;
    expect(tutte.persona.nome).toBe('Jack Frost');
    expect(tutte.totale).toBeGreaterThan(0);
    expect(tutte.totale).toBe(tutte.totaleSenzaFiltri);
    expect(tutte.ricette.length).toBeLessThanOrEqual(500);
    for (let i = 1; i < tutte.ricette.length; i++) expect(tutte.ricette[i].costo).toBeGreaterThanOrEqual(tutte.ricette[i - 1].costo);
    const limitate = (await request(app).get(`/api/fusione/ricette/${jack}?limite=3&livelloMax=12`)).body.data as RicetteFusioneDto;
    expect(limitate.ricette).toHaveLength(Math.min(3, limitate.totale));
    expect(limitate.totale).toBeLessThanOrEqual(tutte.totale);
    expect(limitate.livelloMax).toBe(12);
    expect(limitate.ricette.every((r) => r.ingredienti.every((i) => i.livello <= 12))).toBe(true);
    const alice = await idDi('Alice');
    const speciale = (await request(app).get(`/api/fusione/ricette/${alice}`)).body.data as RicetteFusioneDto;
    expect(speciale.totale).toBe(1);
    expect(speciale.ricette[0].tipo).toBe('speciale');
    const regent = await idDi('Regent');
    expect(((await request(app).get(`/api/fusione/ricette/${regent}`)).body.data as RicetteFusioneDto).totale).toBe(0);
    expect((await request(app).get('/api/fusione/ricette/999999')).status).toBe(404);
    expect((await request(app).get(`/api/fusione/ricette/${jack}?livelloMax=0`)).status).toBe(400);
  });

  it('con: tutte le fusioni in cui la Persona è ingrediente', async () => {
    const arsene = await idDi('Arsène');
    const res = (await request(app).get(`/api/fusione/con/${arsene}?limite=10`)).body.data as RicetteFusioneDto;
    expect(res.totale).toBeGreaterThan(50);
    expect(res.ricette).toHaveLength(10);
    expect(res.ricette.every((r) => r.ingredienti[0].id === arsene)).toBe(true);
  });
});
