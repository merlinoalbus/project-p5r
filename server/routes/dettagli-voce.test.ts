// ============================================================
// I dettagli di una voce della guida si correggono (2026-10-18)
// ============================================================
//
// Segnalazione dell'utente: «ci sono elementi non modificabili come questo Contenuto...»; scelta «Renderli modificabili».
// `PUT /api/compendio/punti/:chiave` con `dettagli` li sostituisce tutti; la `maschera` di una Persona resta quella di prima.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import type { PuntoInteresseDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const INGRESSO = 'kamoshida-01-cancello-del-castello-ingresso';
const URL = (chiave: string) => `/api/compendio/punti/${encodeURIComponent(chiave)}`;
const dettagliDi = (chiave: string) => JSON.parse(prepared('SELECT dettagli_json FROM punto_interesse WHERE chiave = ?').pluck().get(chiave) as string) as Record<string, unknown>;

describe('i dettagli di una voce della guida', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('si sostituiscono tutti: testo, numero, elenco e tabella; il resto della voce non cambia', async () => {
    const v = (await request(app).post(`/api/compendio/aree/${INGRESSO}/punti`).send({ nome: 'Ombra di prova', tipo: 'miniboss' }).expect(201)).body.data as PuntoInteresseDto;
    const tabella = [{ ombra: 'Pixie', debole_a: 'Fuoco' }];
    const r = await request(app).put(URL(v.chiave)).send({ dettagli: { contenuto: 'Potenziare Ryuji', hp: 120, debolezze: ['Fuoco', 'Vento'], tabella } });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect((r.body.data as PuntoInteresseDto).dettagli).toEqual({ contenuto: 'Potenziare Ryuji', hp: 120, debolezze: ['Fuoco', 'Vento'], tabella });
    expect((r.body.data as PuntoInteresseDto).nome).toBe('Ombra di prova');
    // tolti tutti
    await request(app).put(URL(v.chiave)).send({ dettagli: {} }).expect(200);
    expect(dettagliDi(v.chiave)).toEqual({});
    // senza `dettagli` restano com'erano
    await request(app).put(URL(v.chiave)).send({ dettagli: { note: 'una nota' } }).expect(200);
    await request(app).put(URL(v.chiave)).send({ descrizione: 'altro testo' }).expect(200);
    expect(dettagliDi(v.chiave)).toEqual({ note: 'una nota' });
  });

  it('la maschera di una Persona resta quella di prima, anche se il corpo ne porta un\'altra', async () => {
    const persona = prepared("SELECT chiave FROM punto_interesse WHERE dettagli_json LIKE '%\"maschera\"%' LIMIT 1").pluck().get() as string;
    const prima = dettagliDi(persona);
    await request(app).put(URL(persona)).send({ dettagli: { maschera: 'Altra', personalita: 'Cupa' } }).expect(200);
    expect(dettagliDi(persona)).toEqual({ maschera: prima.maschera, personalita: 'Cupa' });
  });

  it('rifiuta valori fuori forma o troppi dettagli', async () => {
    const v = (await request(app).post(`/api/compendio/aree/${INGRESSO}/punti`).send({ nome: 'Ombra rifiutata', tipo: 'miniboss' }).expect(201)).body.data as PuntoInteresseDto;
    await request(app).put(URL(v.chiave)).send({ dettagli: { x: { annidato: true } } }).expect(400);
    await request(app).put(URL(v.chiave)).send({ dettagli: Object.fromEntries(Array.from({ length: 41 }, (_, i) => [`k${i}`, 'v'])) }).expect(400);
    // creando una voce i dettagli non si scrivono (come ogni campo che lo schema non ha): si aggiungono correggendola
    const nuova = (await request(app).post(`/api/compendio/aree/${INGRESSO}/punti`).send({ nome: 'Nuova', tipo: 'miniboss', dettagli: { a: 'b' } }).expect(201)).body.data as PuntoInteresseDto;
    expect(nuova.dettagli).toEqual({});
  });
});
