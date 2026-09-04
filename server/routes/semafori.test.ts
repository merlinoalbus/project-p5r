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
    // bloccato: il rango 1 non è raggiungibile (né lo sblocco) finché i requisiti non sono verdi; il server rifiuta con 409
    expect(yusuke.bloccato).toMatchObject({ rango: 1 });
    expect(yusuke.bloccato!.motivi.length).toBeGreaterThan(0);
    const rifiuto = await request(app).put(`/api/partite/${id}/confidenti/yusuke`).send({ rango: 1 });
    expect(rifiuto.status).toBe(409);
    expect(rifiuto.body.error.code).toBe('confidente-bloccato');
    expect((await request(app).put(`/api/partite/${id}/confidenti/yusuke`).send({ sbloccato: true })).status).toBe(409);
    // via d'uscita esplicita: `forza` passa e resta nello storico
    const forzato = await request(app).put(`/api/partite/${id}/confidenti/yusuke`).send({ forza: true, rango: 1 });
    expect(forzato.status).toBe(200);
    expect((forzato.body.data as ConfidentePartitaDto).rango).toBe(1);
    const eventi = (await request(app).get(`/api/partite/${id}/storico`)).body.data as { eventi: Array<{ titolo: string }> };
    expect(eventi.eventi.some((e) => e.titolo.includes('nonostante i requisiti'))).toBe(true);
    // un Confidente senza requisiti per il rango successivo non è bloccato e sale liberamente
    const libero = conf.find((c) => c.bloccato === null && c.rango < 10)!;
    expect((await request(app).put(`/api/partite/${id}/confidenti/${libero.chiave}`).send({ rango: libero.rango + 1 })).status).toBe(200);
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
    // data: la nuova partita parte dal primo giorno del gioco (04-09), quindi il requisito è già verde o rosso; cambiando il giorno resta valutato
    expect(((await request(app).get(`/api/partite/${id}`)).body.data as { dataGioco: string | null }).dataGioco).toBe('04-09');
    const conData = conf.find((c) => c.semafori.some((s) => s.requisiti.some((r) => r.tipo === 'data')));
    if (conData) {
      const rd = conData.semafori.flatMap((s) => s.requisiti).find((r) => r.tipo === 'data')!;
      expect(['verde', 'rosso']).toContain(rd.stato);
      await request(app).put(`/api/partite/${id}/giorno`).send({ data: '12-24' });
      const aggData = ((await request(app).get(`/api/partite/${id}/confidenti`)).body.data as ConfidentePartitaDto[]).find((c) => c.chiave === conData.chiave)!;
      expect(['verde', 'rosso']).toContain(aggData.semafori.flatMap((s) => s.requisiti).find((r) => r.tipo === 'data')!.stato);
    }
  });
});
