// ============================================================
// La sezione dei Palazzi non è più in sola lettura
// ============================================================
//
// Negozi, luoghi, libri e film avevano il loro modulo da un pezzo; dungeon, aree e punti si
// potevano solo guardare, e una trascrizione fatta a mano da un sito ha refusi e frasi tagliate.
// Qui si prova che si correggono davvero, e che quel che si scrive resta nei dati di gioco.
// ============================================================

import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import { creaMappa, aggiornaPresentazioneMappa } from '../services/mappe/mappeService.js';
import { dettaglioDungeon } from '../services/dungeonService.js';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto } from '../../shared/types.js';

const app = createApp();

describe('correzione dei testi della guida', () => {
  beforeAll(() => { caricaPacchetto(initDb(':memory:')); invalidaCacheTraduzioni(); });
  afterAll(() => closeDb());

  it('i testi del Palazzo si correggono e restano', async () => {
    const r = await request(app).put('/api/compendio/dungeon/kamoshida').send({ nome: 'Castello di Kamoshida', note: 'Nota mia.' });
    expect(r.status).toBe(200);
    expect((r.body.data as DungeonDettaglioDto).nome).toBe('Castello di Kamoshida');
    expect(dettaglioDungeon('kamoshida').note).toBe('Nota mia.');
    // un nome vuoto non cancella il nome
    await request(app).put('/api/compendio/dungeon/kamoshida').send({ nome: '   ' }).expect(400);
  });

  it('nome e descrizione di un’area si correggono dalla scheda', async () => {
    const area = dettaglioDungeon('kamoshida').aree[0];
    const r = await request(app).put(`/api/compendio/aree/${area.chiave}`).send({ nome: 'Cancello', descrizione: 'Si entra da qui.' });
    expect(r.status).toBe(200);
    expect(r.body.data as AreaDungeonDto).toMatchObject({ nome: 'Cancello', descrizione: 'Si entra da qui.' });
  });

  it('un punto della guida si aggiunge, si corregge e si toglie', async () => {
    const area = dettaglioDungeon('kamoshida').aree[0];
    const creato = (await request(app).post(`/api/compendio/aree/${area.chiave}/punti`).send({ nome: 'Sicura dietro la statua', tipo: 'sicura' }).expect(201)).body.data as PuntoInteresseDto;
    expect(creato.nome).toBe('Sicura dietro la statua');
    expect(dettaglioDungeon('kamoshida').aree[0].punti.some((p) => p.chiave === creato.chiave)).toBe(true);

    const corretto = (await request(app).put(`/api/compendio/punti/${creato.chiave}`).send({ descrizione: 'Dietro la statua a destra.', tipo: 'forziere', esauribile: true }).expect(200)).body.data as PuntoInteresseDto;
    expect(corretto).toMatchObject({ tipo: 'forziere', esauribile: true, descrizione: 'Dietro la statua a destra.' });

    await request(app).delete(`/api/compendio/punti/${creato.chiave}`).expect(204);
    expect(dettaglioDungeon('kamoshida').aree[0].punti.some((p) => p.chiave === creato.chiave)).toBe(false);
  });

  it('un punto inesistente non si corregge', async () => {
    await request(app).put('/api/compendio/punti/mai-esistito').send({ nome: 'X' }).expect(404);
  });
});

describe('raggruppamento delle planimetrie', () => {
  beforeAll(() => { caricaPacchetto(initDb(':memory:')); invalidaCacheTraduzioni(); });
  afterAll(() => closeDb());

  const gruppoDi = (chiave: string) => {
    const r = prepared('SELECT gruppo_immagini_json FROM mappa_presentazione WHERE mappa_chiave = ?').get(chiave) as { gruppo_immagini_json: string | null } | undefined;
    return r?.gruppo_immagini_json ? JSON.parse(r.gruppo_immagini_json) as { id: string; nome: string; etichetta?: string } : null;
  };

  it('due tavole si dichiarano la stessa stanza, e il nome vale per tutte', async () => {
    const una = creaMappa(undefined, { nome: 'Sala A', tipo: 'area', genitore: 'dungeon-kamoshida' });
    const altra = creaMappa(undefined, { nome: 'Sala A bis', tipo: 'area', genitore: 'dungeon-kamoshida' });
    aggiornaPresentazioneMappa(una.chiave, { gruppoNome: 'Sala del trono', etichetta: 'pianta completa' });
    const id = gruppoDi(una.chiave)!.id;
    await request(app).put(`/api/mappe/${altra.chiave}/presentazione`).send({ gruppoId: id, etichetta: 'porzione nord' }).expect(200);
    expect(gruppoDi(altra.chiave)).toMatchObject({ id, nome: 'Sala del trono', etichetta: 'porzione nord' });

    // rinominare la stanza da una tavola la rinomina su tutte
    await request(app).put(`/api/mappe/${altra.chiave}/presentazione`).send({ gruppoNome: 'Sala del trono — piano alto' }).expect(200);
    expect(gruppoDi(una.chiave)!.nome).toBe('Sala del trono — piano alto');
    expect(gruppoDi(altra.chiave)!.etichetta).toBe('porzione nord');
  });

  it('una tavola può uscire dal raggruppamento e tornare a stare da sola', async () => {
    const sola = creaMappa(undefined, { nome: 'Sala B', tipo: 'area', genitore: 'dungeon-kamoshida' });
    aggiornaPresentazioneMappa(sola.chiave, { gruppoNome: 'Un gruppo' });
    expect(gruppoDi(sola.chiave)).not.toBeNull();
    await request(app).put(`/api/mappe/${sola.chiave}/presentazione`).send({ gruppoId: null }).expect(200);
    expect(gruppoDi(sola.chiave)).toBeNull();
  });
});
