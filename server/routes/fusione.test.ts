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
import type { EreditaFusioneDto, EsitoFusioneDto, PersonaRiassuntoDto, PianiFusioneDto, RicercaSkillDto, RicetteFusioneDto, SkillRiassuntoDto } from '../../shared/types.js';

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

  it('piani: alberi ricorsivi con scorta e Registro della partita, opzioni e validazione', async () => {
    const jack = await idDi('Jack Frost');
    // senza partita: scorta e Registro vuoti, solo catture
    const base = (await request(app).get(`/api/fusione/piani/${jack}?profondita=2&alternative=2`)).body.data as PianiFusioneDto;
    expect(base.persona.nome).toBe('Jack Frost');
    expect(base.disponibilita).toEqual({ scorta: 0, registro: 0 });
    expect(base.opzioni).toMatchObject({ profondita: 2, alternative: 2, catture: true, livelloMax: null });
    expect(base.piani.length).toBeGreaterThan(0);
    expect(base.piani[0].radice.modo).toBe('cattura'); // Jack Frost stesso è catturabile
    // senza catture né disponibilità → nessun piano
    const nulla = (await request(app).get(`/api/fusione/piani/${jack}?catture=false`)).body.data as PianiFusioneDto;
    expect(nulla.piani).toEqual([]);
    // partita con scorta (Pixie, Arsène) e livello 12: piani con foglie in scorta, limite di livello dal protagonista
    const p = await request(app).post('/api/partite').send({ nome: 'Piani', livelloProtagonista: 12 });
    const partitaId = p.body.data.id as number;
    const pixie = await idDi('Pixie');
    const arsene = await idDi('Arsène');
    await request(app).post(`/api/partite/${partitaId}/persona`).send({ personaId: pixie.valueOf() });
    await request(app).post(`/api/partite/${partitaId}/persona`).send({ personaId: arsene });
    const conPartita = (await request(app).get(`/api/fusione/piani/${jack}?partita=${partitaId}&catture=false&limitaLivello=true&profondita=3&alternative=3`)).body.data as PianiFusioneDto;
    expect(conPartita.disponibilita.scorta).toBe(2);
    expect(conPartita.disponibilita.registro).toBe(2); // l'aggiunta alla scorta registra nel compendio personale
    expect(conPartita.opzioni.livelloMax).toBe(12);
    for (const piano of conPartita.piani) {
      expect(piano.costo).toBeGreaterThanOrEqual(0);
      const controlla = (n: PianiFusioneDto['piani'][number]['radice']) => {
        if (n.modo === 'fusione') expect(n.persona.livello).toBeLessThanOrEqual(12);
        expect(n.modo).not.toBe('cattura');
        n.figli.forEach(controlla);
      };
      controlla(piano.radice);
    }
    // propagazione delle skill: Tarukaja (supporto) su Jack Frost; Agi (fuoco) incompatibile col tipo Ghiaccio → nessuna fusione
    const tarukaja = ((await request(app).get('/api/compendio/skill?q=Tarukaja')).body.data as SkillRiassuntoDto[]).find((s) => s.nome === 'Tarukaja')!;
    const conSkill = (await request(app).get(`/api/fusione/piani/${jack}?profondita=2&alternative=3&skill=${tarukaja.id}`)).body.data as PianiFusioneDto;
    expect(conSkill.skillRichieste.map((s) => s.nome)).toEqual(['Tarukaja']);
    expect(conSkill.piani.length).toBeGreaterThan(0);
    expect(conSkill.piani.every((pi) => pi.radice.skillPortate.some((s) => s.nome === 'Tarukaja'))).toBe(true);
    const agi = ((await request(app).get('/api/compendio/skill?q=Agi')).body.data as SkillRiassuntoDto[]).find((s) => s.nome === 'Agi')!;
    const conAgi = (await request(app).get(`/api/fusione/piani/${jack}?profondita=2&alternative=3&skill=${agi.id}`)).body.data as PianiFusioneDto;
    expect(conAgi.piani.every((pi) => pi.radice.modo !== 'fusione')).toBe(true);
    // un tratto non si propaga come skill → 400
    const tratto = ((await request(app).get('/api/compendio/skill?q=Pinch%20Anchor')).body.data as SkillRiassuntoDto[]).find((s) => s.nome === 'Pinch Anchor')!;
    expect((await request(app).get(`/api/fusione/piani/${jack}?skill=${tratto.id}`)).status).toBe(400);
    // validazione
    expect((await request(app).get(`/api/fusione/piani/${jack}?profondita=9`)).status).toBe(400);
    expect((await request(app).get(`/api/fusione/piani/${jack}?catture=forse`)).status).toBe(400);
    expect((await request(app).get('/api/fusione/piani/999999')).status).toBe(404);
    await request(app).delete(`/api/partite/${partitaId}`);
  });

  it('eredita: slot, bacino per ingrediente (scorta o livello), compatibilità e tratti; errori', async () => {
    const arsene = await idDi('Arsène');
    const pixie = await idDi('Pixie');
    const e = (await request(app).get(`/api/fusione/eredita?a=${arsene}&b=${pixie}&livelloA=7`)).body.data as EreditaFusioneDto;
    expect(e.risultato.nomeIt).toBeTruthy();
    expect(e.tipoNome).toBeTruthy();
    expect(e.ingredienti[0]).toMatchObject({ livello: 7, daScorta: false });
    expect(e.ingredienti[0].skill.map((s) => s.nome)).toEqual(['Eiha', 'Cleave', 'Sukunda', 'Dream Needle', 'Adverse Resolve']);
    expect(e.totaleSkillGenitori).toBe(e.ingredienti[0].skill.length + e.ingredienti[1].skill.length);
    expect(e.slotScelti).toBe(Math.max(0, e.slot - 1));
    expect(e.candidate.every((c) => c.nomeIt && c.elementoNome)).toBe(true);
    expect(e.tratti[0].da).toBeNull();
    // ingrediente dalla scorta: le skill sono quelle possedute
    const p = await request(app).post('/api/partite').send({ nome: 'Eredità', livelloProtagonista: 30 });
    const partitaId = p.body.data.id as number;
    const bufu = ((await request(app).get('/api/compendio/skill?q=Bufu')).body.data as SkillRiassuntoDto[]).find((s) => s.nome === 'Bufu')!;
    await request(app).post(`/api/partite/${partitaId}/persona`).send({ personaId: arsene, livello: 10, skillIds: [bufu.id] });
    const conScorta = (await request(app).get(`/api/fusione/eredita?a=${arsene}&b=${pixie}&partita=${partitaId}`)).body.data as EreditaFusioneDto;
    expect(conScorta.ingredienti[0]).toMatchObject({ daScorta: true, livello: 10 });
    expect(conScorta.ingredienti[0].skill.map((s) => s.nome)).toEqual(['Bufu']);
    await request(app).delete(`/api/partite/${partitaId}`);
    // fusione impossibile → 400 in italiano; parametri mancanti → 400
    const regent = await idDi('Regent');
    const orlov = await idDi('Orlov');
    const imp = await request(app).get(`/api/fusione/eredita?a=${regent}&b=${regent}`);
    expect(imp.status).toBe(400);
    expect(imp.body.error.message).toMatch(/nessuna eredità/i);
    expect(orlov).toBeGreaterThan(0);
    expect((await request(app).get('/api/fusione/eredita?a=1')).status).toBe(400);
  });

  it('cerca-skill: ricette che consentono le skill desiderate, per risultato dato o per qualunque Persona', async () => {
    const skills = (await request(app).get('/api/compendio/skill?q=Tarukaja')).body.data as SkillRiassuntoDto[];
    const tarukaja = skills.find((s) => s.nome === 'Tarukaja')!;
    const tutte = (await request(app).get(`/api/fusione/cerca-skill?skill=${tarukaja.id}&limite=50`)).body.data as RicercaSkillDto;
    expect(tutte.skill[0]).toMatchObject({ nome: 'Tarukaja' });
    expect(tutte.totale).toBeGreaterThan(0);
    expect(tutte.ricette.length).toBeLessThanOrEqual(50);
    expect(tutte.perRisultato.length).toBeGreaterThan(0);
    for (const r of tutte.ricette) {
      expect(r.slotScelti).toBeGreaterThanOrEqual(r.daEreditare.length);
      expect(r.daEreditare.length + r.giaApprese.length).toBe(1);
    }
    for (let i = 1; i < tutte.ricette.length; i++) expect(tutte.ricette[i].ricetta.costo).toBeGreaterThanOrEqual(tutte.ricette[i - 1].ricetta.costo);
    const jack = await idDi('Jack Frost');
    const perJack = (await request(app).get(`/api/fusione/cerca-skill?skill=${tarukaja.id}&risultato=${jack}`)).body.data as RicercaSkillDto;
    expect(perJack.risultato?.nome).toBe('Jack Frost');
    expect(perJack.ricette.every((r) => r.ricetta.risultato.id === jack)).toBe(true);
    // skill di fuoco su un risultato di tipo Ghiaccio: impossibile per la matrice
    const agi = ((await request(app).get('/api/compendio/skill?q=Agi')).body.data as SkillRiassuntoDto[]).find((s) => s.nome === 'Agi')!;
    const perJackAgi = (await request(app).get(`/api/fusione/cerca-skill?skill=${agi.id}&risultato=${jack}`)).body.data as RicercaSkillDto;
    expect(perJackAgi.totale).toBe(0);
    expect((await request(app).get('/api/fusione/cerca-skill?skill=')).status).toBe(400);
    expect((await request(app).get('/api/fusione/cerca-skill?skill=1,2,3,4,5')).status).toBe(400);
    expect((await request(app).get('/api/fusione/cerca-skill?skill=999999')).status).toBe(404);
  });

  it('con: tutte le fusioni in cui la Persona è ingrediente', async () => {
    const arsene = await idDi('Arsène');
    const res = (await request(app).get(`/api/fusione/con/${arsene}?limite=10`)).body.data as RicetteFusioneDto;
    expect(res.totale).toBeGreaterThan(50);
    expect(res.ricette).toHaveLength(10);
    expect(res.ricette.every((r) => r.ingredienti[0].id === arsene)).toBe(true);
  });
});
