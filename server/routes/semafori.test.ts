// ============================================================
// Test API semafori dei Confidenti — requisiti valutati sullo stato della partita, conferma manuale (Fase 12.3)
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { ConfidentePartitaDto, PersonaRiassuntoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API semafori dei Confidenti', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('valuta i requisiti sullo stato della partita (Persona dell\'arcano, Doti, data) e accetta la conferma manuale', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Semafori' })).body.data as { id: number }).id;
    const conf = (await request(app).get(`/api/partite/${id}/confidenti`)).body.data as ConfidentePartitaDto[];
    // ogni Confidente espone i semafori dei ranghi superiori a quello attuale, in ordine
    for (const c of conf) for (let i = 1; i < c.semafori.length; i++) expect(c.semafori[i].rango).toBeGreaterThan(c.semafori[i - 1].rango);
    const yusuke = conf.find((c) => c.chiave === 'yusuke')!;
    const arcano = yusuke.semafori.flatMap((s) => s.requisiti).find((r) => r.tipo === 'persona-arcano');
    expect(arcano).toBeDefined();
    expect(arcano!.stato).toBe('rosso');
    // una Persona dell'Imperatore in scorta → verde
    const eligor = ((await request(app).get('/api/compendio/persona?q=Eligor')).body.data as PersonaRiassuntoDto[]).find((p) => p.nome === 'Eligor')!;
    await request(app).post(`/api/partite/${id}/persona`).send({ personaId: eligor.id });
    const dopo = ((await request(app).get(`/api/partite/${id}/confidenti`)).body.data as ConfidentePartitaDto[]).find((c) => c.chiave === 'yusuke')!;
    expect(dopo.semafori.flatMap((s) => s.requisiti).find((r) => r.tipo === 'persona-arcano')!.stato).toBe('verde');
    // Dote: rosso finché la Dote non raggiunge il rango richiesto
    const makoto = conf.find((c) => c.chiave === 'makoto')!;
    const dote = makoto.semafori.flatMap((s) => s.requisiti).find((r) => r.tipo === 'dote')!;
    expect(dote.stato).toBe('rosso');
    expect(dote.dettaglio).toMatch(/rango 1 di/);
    // requisito manuale: grigio, poi verde dopo la conferma, poi grigio revocando
    const conManuale = conf.find((c) => c.semafori.some((s) => s.requisiti.some((r) => r.manuale)))!;
    const sr = conManuale.semafori.find((s) => s.requisiti.some((r) => r.manuale))!;
    const req = sr.requisiti.find((r) => r.manuale)!;
    expect(req.stato).toBe('grigio');
    const confermato = (await request(app).put(`/api/partite/${id}/confidenti/${conManuale.chiave}/requisiti`).send({ rango: sr.rango, indice: req.indice, confermato: true })).body.data as ConfidentePartitaDto;
    const agg = confermato.semafori.find((s) => s.rango === sr.rango)!.requisiti.find((r) => r.indice === req.indice)!;
    expect(agg).toMatchObject({ stato: 'verde', confermato: true });
    const revocato = (await request(app).put(`/api/partite/${id}/confidenti/${conManuale.chiave}/requisiti`).send({ rango: sr.rango, indice: req.indice, confermato: false })).body.data as ConfidentePartitaDto;
    expect(revocato.semafori.find((s) => s.rango === sr.rango)!.requisiti.find((r) => r.indice === req.indice)!.stato).toBe('grigio');
    // requisito inesistente → 404; corpo non valido → 400
    expect((await request(app).put(`/api/partite/${id}/confidenti/ryuji/requisiti`).send({ rango: 9, indice: 40, confermato: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/confidenti/ryuji/requisiti`).send({ rango: 2, confermato: true })).status).toBe(400);
    // data: senza giorno corrente è grigio; con il giorno corrente diventa verde o rosso
    const conData = conf.find((c) => c.semafori.some((s) => s.requisiti.some((r) => r.tipo === 'data')));
    if (conData) {
      const rd = conData.semafori.flatMap((s) => s.requisiti).find((r) => r.tipo === 'data')!;
      expect(rd.stato).toBe('grigio');
      await request(app).put(`/api/partite/${id}/giorno`).send({ data: '12-24' });
      const aggData = ((await request(app).get(`/api/partite/${id}/confidenti`)).body.data as ConfidentePartitaDto[]).find((c) => c.chiave === conData.chiave)!;
      expect(['verde', 'rosso']).toContain(aggData.semafori.flatMap((s) => s.requisiti).find((r) => r.tipo === 'data')!.stato);
    }
  });
});
