// ============================================================
// Test API negozi e inventario (Fase 8.2) — seed, schede, ricerca articoli, acquisti per partita con evento, reseed stabile
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { ArticoloDto, NegozioDettaglioDto, NegozioRiassuntoDto, RicercaArticoliDto, StoricoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API negozi e inventario', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('60 negozi con conteggi, quartiere e Confidente; scheda Untouchable con 218 articoli e fonti', async () => {
    const n = (await request(app).get('/api/compendio/negozi')).body.data as NegozioRiassuntoDto[];
    expect(n).toHaveLength(60);
    expect(n.reduce((s, x) => s + x.articoli, 0)).toBe(575);
    const u = n.find((x) => x.chiave === 'untouchable')!;
    expect(u).toMatchObject({ nome: 'Untouchable', luogoChiave: 'shibuya', quartiereNome: 'Shibuya', articoli: 218 });
    expect(u.confidente).toEqual({ chiave: 'iwai', nome: expect.stringContaining('Iwai') });
    expect(n.find((x) => x.chiave === 'clinica-takemi')?.confidente?.chiave).toBe('takemi');
    expect(n.find((x) => x.chiave === 'tanaka-affari-loschi')?.luogoChiave).toBeNull();
    const d = (await request(app).get('/api/compendio/negozi/untouchable')).body.data as NegozioDettaglioDto;
    expect(d.articoliElenco).toHaveLength(218);
    expect(d.articoliElenco[0]).toMatchObject({ chiave: 'untouchable/kogatana-nera', nome: 'Kogatana nera', categoria: 'arma', per: 'Joker', prezzo: 1000, acquistato: false, verificato: true });
    expect(d.articoliElenco.every((a) => a.fonte.startsWith('http') && a.chiave.startsWith('untouchable/'))).toBe(true);
    expect(new Set(d.articoliElenco.map((a) => a.chiave)).size).toBe(218);
    expect((await request(app).get('/api/compendio/negozi/emporio-fantasma')).status).toBe(404);
    expect((await request(app).get('/api/compendio/negozi/untouchable?partita=99999')).status).toBe(404);
  });

  it('ricerca articoli per testo, categoria e destinatario; acquisti per partita con evento; reseed stabile', async () => {
    let r = (await request(app).get('/api/compendio/articoli?q=Kogatana')).body.data as RicercaArticoliDto;
    expect(r.totale).toBeGreaterThanOrEqual(1);
    expect(r.articoli[0].negozioNome).toBe('Untouchable');
    r = (await request(app).get('/api/compendio/articoli?categoria=consumabile')).body.data as RicercaArticoliDto;
    expect(r.totale).toBe(101);
    expect(r.articoli.every((a) => a.categoria === 'consumabile')).toBe(true);
    r = (await request(app).get('/api/compendio/articoli?per=Ann&categoria=arma')).body.data as RicercaArticoliDto;
    expect(r.totale).toBeGreaterThan(0);
    expect(r.articoli.every((a) => a.per === 'Ann' || a.per === 'tutti')).toBe(true);
    expect((await request(app).get('/api/compendio/articoli?categoria=astronave')).status).toBe(400);

    const id = ((await request(app).post('/api/partite').send({ nome: 'Acquisti' })).body.data as { id: number }).id;
    const acquistabile = ((await request(app).get(`/api/compendio/negozi/untouchable?partita=${id}`)).body.data as NegozioDettaglioDto).articoliElenco.find((x) => x.disponibilita?.stato !== 'bloccato')!;
    expect(acquistabile).toBeDefined();
    let a = (await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: acquistabile.chiave, fatto: true })).body.data as ArticoloDto;
    expect(a.acquistato).toBe(true);
    a = (await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: acquistabile.chiave, fatto: true })).body.data as ArticoloDto; // idempotente
    const d = (await request(app).get(`/api/compendio/negozi/untouchable?partita=${id}`)).body.data as NegozioDettaglioDto;
    expect(d.acquistati).toBe(1);
    expect(d.articoliElenco.find((x) => x.chiave === acquistabile.chiave)?.acquistato).toBe(true);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=acquisto`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].titolo).toContain(acquistabile.nomeIt ?? acquistabile.nome);
    a = (await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: acquistabile.chiave, fatto: false })).body.data as ArticoloDto;
    expect(a.acquistato).toBe(false);
    expect((await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: 'x/y', fatto: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: 'untouchable/kogatana-nera' })).status).toBe(400);
    const schedaTakemiPrima = (await request(app).get(`/api/compendio/negozi/clinica-takemi?partita=${id}`)).body.data as NegozioDettaglioDto;
    const medicinaDisponibile = schedaTakemiPrima.articoliElenco[0];
    await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: medicinaDisponibile.chiave, fatto: true });
    caricaSeed(getDb(), DIR_SEED, true);
    const dopo = (await request(app).get(`/api/compendio/negozi/clinica-takemi?partita=${id}`)).body.data as NegozioDettaglioDto;
    expect(dopo.acquistati).toBe(1);
    expect(dopo.articoliElenco).toHaveLength(schedaTakemiPrima.articoliElenco.length);
  });

  it('con una partita il catalogo resta completo e distingue gli articoli non ancora acquistabili', async () => {
    const db = getDb();
    db.exec(`CREATE TEMP TABLE backup_condizioni_articoli_negozi_test AS
      SELECT chiave, condizioni_json FROM articolo WHERE negozio_chiave = 'untouchable'`);
    try {
      const futura = JSON.stringify([{ tipo: 'data', dal: '12-31' }]);
      db.prepare("UPDATE articolo SET condizioni_json = ? WHERE negozio_chiave = 'untouchable'").run(futura);
      db.prepare("UPDATE articolo SET condizioni_json = '[]' WHERE chiave = 'untouchable/kogatana-nera'").run();

      const id = ((await request(app).post('/api/partite').send({ nome: 'Visibilità inventario' })).body.data as { id: number }).id;
      const elenco = (await request(app).get(`/api/compendio/negozi?partita=${id}`)).body.data as NegozioRiassuntoDto[];
      const untouchable = elenco.find((n) => n.chiave === 'untouchable');
      expect(untouchable).toMatchObject({ articoli: 218, verificati: 212, disponibilita: { stato: 'disponibile' } });

      const scheda = (await request(app).get(`/api/compendio/negozi/untouchable?partita=${id}`)).body.data as NegozioDettaglioDto;
      expect(scheda).toMatchObject({ articoli: 218, verificati: 212 });
      expect(scheda.articoliElenco).toHaveLength(218);
      expect(scheda.articoliElenco.find((a) => a.chiave === 'untouchable/kogatana-nera')?.disponibilita?.stato).toBe('disponibile');
      expect(scheda.articoliElenco.filter((a) => a.disponibilita?.stato === 'bloccato')).toHaveLength(217);

      const ricerca = (await request(app).get(`/api/compendio/articoli?q=Untouchable&partita=${id}`)).body.data as RicercaArticoliDto;
      expect(ricerca.totale).toBe(218);
      expect(ricerca.articoli).toHaveLength(218);
      expect(ricerca.articoli.filter((a) => a.disponibilita?.stato === 'bloccato')).toHaveLength(217);

      const bloccato = ricerca.articoli.find((a) => a.disponibilita?.stato === 'bloccato')!;
      const risposta = await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: bloccato.chiave, fatto: true });
      expect(risposta.status).toBe(409);
      expect(risposta.body.error?.code).toBe('articolo-non-disponibile');
    } finally {
      db.exec(`UPDATE articolo SET condizioni_json = (
        SELECT b.condizioni_json FROM backup_condizioni_articoli_negozi_test b WHERE b.chiave = articolo.chiave
      ) WHERE negozio_chiave = 'untouchable';
      DROP TABLE backup_condizioni_articoli_negozi_test`);
    }
  });

  it('calcola il totale disponibile prima di applicare il limite di 300 risultati', async () => {
    const db = getDb();
    db.exec(`CREATE TEMP TABLE backup_tutte_condizioni_articoli_negozi_test AS SELECT chiave, condizioni_json FROM articolo;
      CREATE TEMP TABLE backup_tutte_condizioni_negozi_test AS SELECT chiave, condizioni_json FROM negozio`);
    try {
      db.exec("UPDATE articolo SET condizioni_json = '[]'; UPDATE negozio SET condizioni_json = '[]'");
      const id = ((await request(app).post('/api/partite').send({ nome: 'Catalogo completo' })).body.data as { id: number }).id;
      const ricerca = (await request(app).get(`/api/compendio/articoli?partita=${id}`)).body.data as RicercaArticoliDto;
      expect(ricerca.totale).toBe(575);
      expect(ricerca.totale).toBeGreaterThan(300);
      expect(ricerca.articoli).toHaveLength(300);
      expect(ricerca.articoli.every((a) => a.disponibilita?.stato === 'disponibile')).toBe(true);
    } finally {
      db.exec(`UPDATE articolo SET condizioni_json = (
        SELECT b.condizioni_json FROM backup_tutte_condizioni_articoli_negozi_test b WHERE b.chiave = articolo.chiave
      );
      UPDATE negozio SET condizioni_json = (
        SELECT b.condizioni_json FROM backup_tutte_condizioni_negozi_test b WHERE b.chiave = negozio.chiave
      );
      DROP TABLE backup_tutte_condizioni_articoli_negozi_test;
      DROP TABLE backup_tutte_condizioni_negozi_test`);
    }
  });

  it('disponibilità con la partita: i requisiti del Confidente marcano ma non nascondono gli articoli', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Disponibilità' })).body.data as { id: number }).id;
    const scheda = (await request(app).get(`/api/compendio/negozi/clinica-takemi?partita=${id}`)).body.data as NegozioDettaglioDto;
    const catalogo = ((await request(app).get('/api/compendio/negozi/clinica-takemi')).body.data as NegozioDettaglioDto).articoliElenco;
    const conRango = catalogo.filter((a) => /^Rango Confidente \d+$/.test(a.condizione ?? ''));
    expect(conRango.length).toBeGreaterThan(0);
    expect(scheda.articoliElenco.some((a) => conRango.some((c) => c.chiave === a.chiave && a.disponibilita?.stato === 'bloccato'))).toBe(true);
    const ricerca = (await request(app).get(`/api/compendio/articoli?q=Takemedic&partita=${id}`)).body.data as RicercaArticoliDto;
    expect(ricerca.articoli.some((a) => conRango.some((c) => c.chiave === a.chiave && a.disponibilita?.stato === 'bloccato'))).toBe(true);
    // senza partita nessuna disponibilità; l'elenco dei negozi con la partita la porta
    expect(catalogo[0].disponibilita).toBeUndefined();
    const elenco = (await request(app).get(`/api/compendio/negozi?partita=${id}`)).body.data as NegozioRiassuntoDto[];
    expect(elenco.every((n) => n.disponibilita !== undefined)).toBe(true);
    expect(elenco.find((n) => n.chiave === 'untouchable')?.disponibilita?.stato).toBe('disponibile');
  });
});
