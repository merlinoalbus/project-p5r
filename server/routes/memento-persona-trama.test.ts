// ============================================================
// Nei Memento le voci sono Persona (con la loro immagine, fuori dal conto) e Trama (2026-10-11)
// ============================================================
//
// Richiesta dell'utente: «nel memento le persona disponibili devono essere visualizzate con le loro immagini e cliccabili...
// Le persone catturate o meno non influiscono sulla percentuale di completamento del memento. A seguire le richieste e poi gli
// elementi Trama... unico tipo visto che nei memento è tutto random». Scelte: il tocco segna «catturata»; le voci di oggi che non
// sono Persona «tutte Trama» (migrazione 100).
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { dbDiProva } from '../../test/dbDiProva.js';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto } from '../../shared/types.js';

const app = createApp();
const QIMRANUT = 'mementos-01-qimranut';
const AREA = `${QIMRANUT}-area-1`;

/** La scheda del Memento (con la partita, se data). */
const scheda = async (partita?: number) => (await request(app).get(`/api/compendio/dungeon/mementos${partita ? `?partita=${partita}` : ''}`).expect(200)).body.data as DungeonDettaglioDto;
/** Il dedalo di Qimranut, dalla scheda. */
const qimranut = async (partita?: number) => (await scheda(partita)).aree.find((a) => a.chiave === QIMRANUT)! as AreaDungeonDto & { dedalo: NonNullable<AreaDungeonDto['dedalo']> };
/** Una nuova partita, per cominciare da zero. */
const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
/** L'id di una Persona del compendio dal nome canonico. */
const idPersona = (nome: string) => prepared('SELECT id FROM persona WHERE nome = ?').pluck().get(nome) as number;

describe('Persona e Trama nei Memento', () => {
  beforeEach(() => { dbDiProva(); });
  afterEach(() => closeDb());

  it('ogni voce Persona porta la Persona del compendio della sua maschera (anche scritta in italiano); le altre voci no', async () => {
    const d = await qimranut();
    const pixie = d.punti.find((p) => p.dettagli.maschera === 'Pixie')!;
    expect(pixie).toMatchObject({ tipo: 'persona', persona: { id: idPersona('Pixie'), nome: 'Pixie', nomeIt: 'Pixie' } });
    const bicorno = d.punti.find((p) => p.dettagli.maschera === 'Bicorno')!;
    expect(bicorno.persona).toEqual({ id: idPersona('Bicorn'), nome: 'Bicorn', nomeIt: 'Bicorno' });
    expect(d.punti.filter((p) => p.tipo !== 'persona').every((p) => p.persona === null)).toBe(true);
    // in tutto il Memento solo Persona e Trama, e ogni Persona con una maschera nota ha la sua scheda
    const memento = await scheda();
    const voci = memento.aree.flatMap((a) => a.punti);
    expect([...new Set(voci.map((p) => p.tipo))].sort()).toEqual(['persona', 'trama']);
    // «Straziato re dei desideri» (maschera «-», non reclutabile) è Trama per scelta dell'utente: ogni Persona ha la sua scheda
    expect(voci.filter((p) => p.tipo === 'persona' && p.persona === null)).toEqual([]);
    expect(voci.find((p) => p.nome === 'Straziato re dei desideri')).toMatchObject({ tipo: 'trama', persona: null });
  });

  it('catturare una Persona non cambia il conto dell\'area né l\'anello del Memento; una Trama sì', async () => {
    const partita = await nuovaPartita('Persona fuori dal conto');
    const prima = await qimranut(partita);
    const area = prima.dedalo.aree[0];
    const persone = prima.punti.filter((p) => p.tipo === 'persona');
    const trama = prima.punti.filter((p) => p.tipo === 'trama');
    // il totale è fatto di Trama, Richieste e timbri: le Persona non ci sono
    expect(area.elementi.totale).toBe(trama.length + area.richieste.length + (area.timbri?.totale ?? 0));
    const anello = (await scheda(partita)).raccolta;
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: persone[0].chiave, stato: 'ottenuto' }).expect(200);
    const dopo = await qimranut(partita);
    expect(dopo.punti.find((p) => p.chiave === persone[0].chiave)?.stato).toBe('ottenuto');
    expect(dopo.dedalo.aree[0].elementi).toEqual(area.elementi);
    expect((await scheda(partita)).raccolta).toEqual(anello);
    await request(app).put(`/api/partite/${partita}/punti`).send({ punto: trama[0].chiave, stato: 'ottenuto' }).expect(200);
    expect((await qimranut(partita)).dedalo.aree[0].elementi.fatti).toBe((area.elementi.fatti ?? 0) + 1);
  });

  it('nei dedali una voce nuova o corretta è Persona o Trama, e Trama solo nei Memento', async () => {
    const trama = (await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'Jose alla banchina', tipo: 'trama', areaDedalo: AREA }).expect(201)).body.data as PuntoInteresseDto;
    expect(trama).toMatchObject({ tipo: 'trama', areaDedalo: AREA, persona: null });
    for (const tipo of ['altro', 'boss', 'sicura', 'forziere', 'storia']) {
      expect((await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'No', tipo, areaDedalo: AREA })).body.error.code).toBe('tipo-non-del-dedalo');
    }
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(trama.chiave)}`).send({ tipo: 'boss' })).body.error.code).toBe('tipo-non-del-dedalo');
    // Trama nei Palazzi no; il resto sì
    const ingresso = prepared("SELECT chiave FROM dungeon_area WHERE dungeon_chiave = 'kamoshida' ORDER BY ordine LIMIT 1").pluck().get() as string;
    expect((await request(app).post(`/api/compendio/aree/${ingresso}/punti`).send({ nome: 'No', tipo: 'trama' })).body.error.code).toBe('trama-solo-nei-memento');
    const voce = (await request(app).post(`/api/compendio/aree/${ingresso}/punti`).send({ nome: 'Una storia', tipo: 'storia' }).expect(201)).body.data as PuntoInteresseDto;
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(voce.chiave)}`).send({ tipo: 'trama' })).body.error.code).toBe('trama-solo-nei-memento');
    // cambiare solo il nome di una voce non tocca il tipo
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(trama.chiave)}`).send({ nome: 'Jose' }).expect(200)).body.data).toMatchObject({ nome: 'Jose', tipo: 'trama' });
  });

  it('una Persona si aggiunge o si corregge scegliendola dal compendio: la maschera è il suo nome italiano', async () => {
    const nuova = (await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'Ombra del bicorno', tipo: 'persona', areaDedalo: AREA, persona: idPersona('Bicorn') }).expect(201)).body.data as PuntoInteresseDto;
    expect(nuova).toMatchObject({ tipo: 'persona', dettagli: { maschera: 'Bicorno' }, persona: { id: idPersona('Bicorn'), nome: 'Bicorn', nomeIt: 'Bicorno' } });
    // un'altra Persona: la maschera cambia e i dettagli dell'Ombra di prima (resistenze, debolezze) se ne vanno
    const pixie = (await qimranut()).punti.find((p) => p.dettagli.maschera === 'Pixie')!;
    expect(pixie.dettagli).toHaveProperty('deboleA');
    const corretta = (await request(app).put(`/api/compendio/punti/${encodeURIComponent(pixie.chiave)}`).send({ persona: idPersona('Jack Frost') }).expect(200)).body.data as PuntoInteresseDto;
    expect(corretta).toMatchObject({ nome: pixie.nome, dettagli: { maschera: 'Jack Frost' }, persona: { nome: 'Jack Frost' } });
    expect(corretta.dettagli).not.toHaveProperty('deboleA');
    // la stessa Persona rimandata (un modulo che salva tutto) non tocca i dettagli dell'Ombra
    const bicornoGuida = (await qimranut()).punti.find((p) => p.dettagli.maschera === 'Bicorno' && p.chiave !== nuova.chiave)!;
    expect(bicornoGuida.dettagli).toHaveProperty('deboleA');
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(bicornoGuida.chiave)}`).send({ persona: idPersona('Bicorn') }).expect(200)).body.data.dettagli).toEqual(bicornoGuida.dettagli);
    // senza Persona la correzione non tocca i dettagli
    const bicorno = (await qimranut()).punti.find((p) => p.dettagli.maschera === 'Bicorno' && p.chiave !== nuova.chiave)!;
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(bicorno.chiave)}`).send({ nome: 'Ombra rinominata' }).expect(200)).body.data.dettagli).toEqual(bicorno.dettagli);
    // gli errori: Persona per una voce che non è Persona, Persona che non c'è
    expect((await request(app).post(`/api/compendio/aree/${QIMRANUT}/punti`).send({ nome: 'No', tipo: 'trama', areaDedalo: AREA, persona: idPersona('Pixie') })).body.error.code).toBe('persona-solo-per-persona');
    expect((await request(app).put(`/api/compendio/punti/${encodeURIComponent(pixie.chiave)}`).send({ persona: 999999 })).body.error.code).toBe('persona-non-trovata');
  });
});
