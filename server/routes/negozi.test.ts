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

  it('47 negozi con conteggi, quartiere e Confidente; scheda Untouchable con 218 articoli e fonti', async () => {
    const n = (await request(app).get('/api/compendio/negozi')).body.data as NegozioRiassuntoDto[];
    expect(n).toHaveLength(47);
    expect(n.reduce((s, x) => s + x.articoli, 0)).toBe(499);
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
    expect(r.totale).toBe(68);
    expect(r.articoli.every((a) => a.categoria === 'consumabile')).toBe(true);
    r = (await request(app).get('/api/compendio/articoli?per=Ann&categoria=arma')).body.data as RicercaArticoliDto;
    expect(r.totale).toBeGreaterThan(0);
    expect(r.articoli.every((a) => a.per === 'Ann' || a.per === 'tutti')).toBe(true);
    expect((await request(app).get('/api/compendio/articoli?categoria=astronave')).status).toBe(400);

    const id = ((await request(app).post('/api/partite').send({ nome: 'Acquisti' })).body.data as { id: number }).id;
    let a = (await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: 'untouchable/kogatana-nera', fatto: true })).body.data as ArticoloDto;
    expect(a.acquistato).toBe(true);
    a = (await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: 'untouchable/kogatana-nera', fatto: true })).body.data as ArticoloDto; // idempotente
    const d = (await request(app).get(`/api/compendio/negozi/untouchable?partita=${id}`)).body.data as NegozioDettaglioDto;
    expect(d.acquistati).toBe(1);
    expect(d.articoliElenco[0].acquistato).toBe(true);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=acquisto`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(storico.eventi[0].titolo).toContain('Kogatana nera');
    a = (await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: 'untouchable/kogatana-nera', fatto: false })).body.data as ArticoloDto;
    expect(a.acquistato).toBe(false);
    expect((await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: 'x/y', fatto: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: 'untouchable/kogatana-nera' })).status).toBe(400);
    await request(app).put(`/api/partite/${id}/acquisti`).send({ articolo: 'clinica-takemi/' + ((await request(app).get('/api/compendio/negozi/clinica-takemi')).body.data as NegozioDettaglioDto).articoliElenco[0].chiave.split('/')[1], fatto: true });
    caricaSeed(getDb(), DIR_SEED, true);
    const dopo = (await request(app).get(`/api/compendio/negozi/clinica-takemi?partita=${id}`)).body.data as NegozioDettaglioDto;
    expect(dopo.acquistati).toBe(1);
    expect(dopo.articoliElenco).toHaveLength(18);
  });

  it('disponibilità con la partita: ricerca e scheda valutano allo stesso modo «Rango Confidente N» (Confidente del negozio)', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Disponibilità' })).body.data as { id: number }).id;
    const scheda = (await request(app).get(`/api/compendio/negozi/clinica-takemi?partita=${id}`)).body.data as NegozioDettaglioDto;
    const conRango = scheda.articoliElenco.filter((a) => /^Rango Confidente \d+$/.test(a.condizione ?? ''));
    expect(conRango.length).toBeGreaterThan(0);
    for (const a of conRango) expect(a.disponibilita).toMatchObject({ stato: 'bloccato', requisiti: [expect.objectContaining({ tipo: 'confidente', stato: 'rosso' })] });
    const ricerca = (await request(app).get(`/api/compendio/articoli?q=Takemedic&partita=${id}`)).body.data as RicercaArticoliDto;
    const trovato = ricerca.articoli.find((a) => a.chiave === conRango.find((c) => c.nome === 'Takemedic')?.chiave) ?? ricerca.articoli.find((a) => a.negozioChiave === 'clinica-takemi');
    expect(trovato).toBeDefined();
    expect(trovato!.disponibilita).toEqual(scheda.articoliElenco.find((a) => a.chiave === trovato!.chiave)!.disponibilita);
    // senza partita nessuna disponibilità; l'elenco dei negozi con la partita la porta
    expect(((await request(app).get('/api/compendio/negozi/clinica-takemi')).body.data as NegozioDettaglioDto).articoliElenco[0].disponibilita).toBeUndefined();
    const elenco = (await request(app).get(`/api/compendio/negozi?partita=${id}`)).body.data as NegozioRiassuntoDto[];
    expect(elenco.every((n) => n.disponibilita !== undefined)).toBe(true);
    expect(elenco.find((n) => n.chiave === 'untouchable')?.disponibilita?.stato).toBe('disponibile');
  });
});
