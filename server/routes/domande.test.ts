// ============================================================
// Test API domande in classe ed esami (Fase 6.2) — seed, prossime dalla data di gioco, spunta con Conoscenza, idempotenza
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { indiceGiornoScolastico } from '../services/domandeService.js';
import type { DomandeDto, DoteSocialePartitaDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API domande', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('indice del giorno scolastico: aprile prima di marzo', () => {
    expect(indiceGiornoScolastico('04-09')).toBeLessThan(indiceGiornoScolastico('05-11'));
    expect(indiceGiornoScolastico('12-24')).toBeLessThan(indiceGiornoScolastico('01-12'));
    expect(indiceGiornoScolastico('02-03')).toBeLessThan(indiceGiornoScolastico('03-20'));
    expect(indiceGiornoScolastico('x')).toBe(-1);
  });

  it('elenco completo ordinato per data, esami con premi; senza partita nessuna spunta né prossime', async () => {
    const d = (await request(app).get('/api/compendio/domande')).body.data as DomandeDto;
    expect(d.totale).toBe(67);
    expect(d.domande).toHaveLength(67);
    expect(d.esami).toHaveLength(4);
    expect(d.esami[0]).toMatchObject({ nome: 'Esame di metà semestre 1', date: ['05-11', '05-12', '05-13'], dataRisultati: '05-20' });
    expect(d.esami[0].domande.length).toBe(8);
    expect(d.premi?.fascinoPerPiazzamento).toBeDefined();
    expect(d.prossime).toEqual([]);
    expect(d.fatte).toBe(0);
    expect(d.dataGioco).toBeNull();
    for (let i = 1; i < d.domande.length; i++) expect(indiceGiornoScolastico(d.domande[i].data)).toBeGreaterThanOrEqual(indiceGiornoScolastico(d.domande[i - 1].data));
    expect(d.domande[0]).toMatchObject({ data: '04-12', tipo: 'classe', fatta: false });
    expect(d.domande[0].risposte[0].testo.length).toBeGreaterThan(0);
    expect(d.domande.every((x) => x.risposte.length > 0 && x.domanda.length > 0)).toBe(true);
    expect((await request(app).get('/api/compendio/domande?partita=99999')).status).toBe(404);
  });

  it('con la partita: prossime dalla data di gioco, spunta con nota di Conoscenza una sola volta, evento, rimozione', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Scuola', dataGioco: '05-10' })).body.data as { id: number }).id;
    let d = (await request(app).get(`/api/compendio/domande?partita=${id}`)).body.data as DomandeDto;
    expect(d.dataGioco).toBe('05-10');
    expect(d.prossime.length).toBe(5);
    expect(d.prossime.every((x) => indiceGiornoScolastico(x.data) >= indiceGiornoScolastico('05-10') && !x.fatta)).toBe(true);
    const prima = d.prossime[0];
    const dotiPrima = (await request(app).get(`/api/partite/${id}/doti`)).body.data as DoteSocialePartitaDto[];
    const conPrima = dotiPrima.find((x) => x.chiave === 'conoscenza')!.punti;
    d = (await request(app).put(`/api/partite/${id}/domande/${prima.id}`).send({ fatta: true, conoscenza: true })).body.data as DomandeDto;
    expect(d.fatte).toBe(1);
    expect(d.domande.find((x) => x.id === prima.id)?.fatta).toBe(true);
    expect(d.prossime.some((x) => x.id === prima.id)).toBe(false);
    let doti = (await request(app).get(`/api/partite/${id}/doti`)).body.data as DoteSocialePartitaDto[];
    expect(doti.find((x) => x.chiave === 'conoscenza')!.punti).toBe(conPrima + 2); // una nota = 2 punti
    // seconda spunta: nessun doppio conteggio
    await request(app).put(`/api/partite/${id}/domande/${prima.id}`).send({ fatta: true, conoscenza: true });
    doti = (await request(app).get(`/api/partite/${id}/doti`)).body.data as DoteSocialePartitaDto[];
    expect(doti.find((x) => x.chiave === 'conoscenza')!.punti).toBe(conPrima + 2);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=domanda-risposta`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].dettaglio).toContain('Conoscenza +1 nota');
    // rimozione della spunta (i punti restano: registrati nelle Doti)
    d = (await request(app).put(`/api/partite/${id}/domande/${prima.id}`).send({ fatta: false })).body.data as DomandeDto;
    expect(d.fatte).toBe(0);
    expect((await request(app).put(`/api/partite/${id}/domande/999999`).send({ fatta: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/domande/${prima.id}`).send({})).status).toBe(400);
  });
});
