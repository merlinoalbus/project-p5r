// ============================================================
// Test API domande in classe ed esami (Fase 6.2) — seed, prossime dalla data di gioco, spunta con Conoscenza, idempotenza
// ============================================================

import request from 'supertest';
import { closeDb } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { indiceGiornoScolastico } from '../services/domandeService.js';
import type { DomandeDto, DoteSocialePartitaDto, StoricoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

describe('API domande', () => {
  beforeAll(() => {
    dbDiProva();
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
    expect(d.totale).toBe(78);
    expect(d.domande).toHaveLength(78);
    expect(d.esami).toHaveLength(4);
    expect(d.esami[0]).toMatchObject({ nome: 'Esame di metà semestre 1', date: ['05-11', '05-12', '05-13'], dataRisultati: '05-20' });
    expect(d.esami[0].domande.length).toBe(8);
    // L13 (ondata 7, O7-2): i premi per piazzamento e il requisito stanno nelle colonne dell'esame (migrazione 311); in `premi` le sole note
    expect(d.esami[0].premi.map((p) => [p.piazzamento, p.doti.map((x) => `${x.dote}:${x.note}`)])).toEqual([['primo', ['fascino:3']], ['primi-10', ['fascino:3']], ['sopra-media', ['fascino:2']]]);
    expect(d.esami[0].premi[0]!.trofeo?.chiave).toBe('un-travestimento-sapiente');
    expect(d.esami[0].requisitoConoscenza).toEqual({ rango: 4, tutteCorrette: false });
    expect(d.esami[3]!.requisitoConoscenza).toEqual({ rango: 5, tutteCorrette: true });
    expect(Object.keys(d.premi ?? {}).sort()).toEqual(['fonte', 'noteGenerali']);
    // il moltiplicatore descritto dalla regola del codice: primo ×1,5, primi 10 ×1,2 (sopra la media e altro non moltiplicano)
    expect(d.moltiplicatore.piazzamenti).toEqual([{ piazzamento: 'primo', nome: 'Primo', valore: 1.5 }, { piazzamento: 'primi-10', nome: 'Primi 10', valore: 1.2 }]);
    expect(d.moltiplicatore.confidenti.map((c) => c.chiave)).toContain('ryuji');
    // la ricompensa dalle voci del Diario: la prima domanda in classe dà Conoscenza ♪ (testo della guida svuotato dalla 311), la prima riga
    // d'esame nessuna Dote (conta per il piazzamento). Nel pacchetto iniziale la voce del 24 ottobre non si converte (la 311 gira prima dello
    // schema delle partite: spunte non verificabili) e la domanda 50 tiene il suo testo
    expect(d.domande[0]).toMatchObject({ ricompensa: '', premioVoce: { doti: [{ dote: 'conoscenza', nome: 'Conoscenza', note: 1 }], esameAllaSpunta: false } });
    expect(d.domande.find((x) => x.tipo === 'esame-medio')).toMatchObject({ ricompensa: '', premioVoce: { doti: [], esameAllaSpunta: false } });
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
    expect(d.prossime.length).toBeGreaterThanOrEqual(1);
    expect(d.prossime.length).toBeLessThanOrEqual(2);
    expect(new Set(d.prossime.map((x) => x.data)).size).toBe(1);
    expect(d.prossime.every((x) => indiceGiornoScolastico(x.data) >= indiceGiornoScolastico('05-10') && !x.fatta)).toBe(true);
    const prima = d.prossime[0];
    const dotiPrima = (await request(app).get(`/api/partite/${id}/doti`)).body.data as DoteSocialePartitaDto[];
    const conPrima = dotiPrima.find((x) => x.chiave === 'conoscenza')!.punti;
    d = (await request(app).put(`/api/partite/${id}/domande/${prima.id}`).send({ fatta: true, conoscenza: true })).body.data as DomandeDto;
    expect(d.fatte).toBe(1);
    expect(d.domande.find((x) => x.id === prima.id)?.fatta).toBe(true);
    expect(d.prossime.some((x) => x.id === prima.id)).toBe(false);
    // la nota di Conoscenza si ricorda (una nota = 2 punti), ma le Doti si segnano a mano: non si toccano
    expect(d.daSegnare).toEqual([{ chiave: 'conoscenza', nome: 'Conoscenza', delta: 2, note: 1 }]);
    let doti = (await request(app).get(`/api/partite/${id}/doti`)).body.data as DoteSocialePartitaDto[];
    expect(doti.find((x) => x.chiave === 'conoscenza')!.punti).toBe(conPrima);
    // seconda spunta: nessun doppio promemoria
    d = (await request(app).put(`/api/partite/${id}/domande/${prima.id}`).send({ fatta: true, conoscenza: true })).body.data as DomandeDto;
    expect(d.daSegnare).toBeUndefined();
    doti = (await request(app).get(`/api/partite/${id}/doti`)).body.data as DoteSocialePartitaDto[];
    expect(doti.find((x) => x.chiave === 'conoscenza')!.punti).toBe(conPrima);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=domanda-risposta`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].dettaglio).toContain('il gioco dà Conoscenza ♪ · 2 punti (da segnare nelle Doti)');
    // rimozione della spunta (le Doti restano come l'utente le ha segnate)
    d = (await request(app).put(`/api/partite/${id}/domande/${prima.id}`).send({ fatta: false })).body.data as DomandeDto;
    expect(d.fatte).toBe(0);
    expect((await request(app).put(`/api/partite/${id}/domande/999999`).send({ fatta: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/domande/${prima.id}`).send({})).status).toBe(400);
  });
});
