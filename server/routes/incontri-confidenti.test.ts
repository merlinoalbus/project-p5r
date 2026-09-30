// ============================================================
// Test API — la Dote a ogni incontro con un Confidente, una volta per incontro, da qualunque parte
// ============================================================
//
// Segnalato dall'utente (2026-09-30): «Tae Takemi passando dal rango 1 al rango 2 ricevo 1 nota di coraggio che non viene
// valutata». Scelta dell'utente: la Dote arriva da ogni incontro registrato (spunta nella giornata, note di risposta o
// passaggio di rango in Partita → Confidenti), e il passaggio al rango R conta una volta sola. Poi (stesso giorno): le Doti
// si segnano solo a mano — l'incontro si registra e **dice** la Dote che dà (`doteIncontro`, `effetti.incontro.doti`), da
// segnare nella scheda Doti; le Doti della partita non si muovono. Qui si sorveglia che la nota si dica una volta sola,
// da qualunque parte, e che togliendo un incontro si dica di toglierla.
// ============================================================

import request from 'supertest';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import { orfaniPartite } from '../services/pacchettoGiocoService.js';
import type { AzionePercorsoDto, AzioneUtenteDto, ConfidenteDettaglioDto, ConfidentePartitaDto, DoteSocialePartitaDto, PercorsoGiornoDto } from '../../shared/types.js';

const app = createApp();

describe('API — Dote a ogni incontro con un Confidente', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
  });
  afterAll(() => closeDb());

  const nuovaPartita = async (nome: string, data: string) => {
    const id = ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${id}/giorno`).send({ data }).expect(200);
    return id;
  };
  const coraggio = async (p: number) => ((await request(app).get(`/api/partite/${p}/doti`)).body.data as DoteSocialePartitaDto[]).find((d) => d.chiave === 'coraggio')!.punti;
  const pagina = async (p: number, corpo: object) => (await request(app).put(`/api/partite/${p}/confidenti/takemi`).send({ forza: true, ...corpo }).expect(200)).body.data as ConfidentePartitaDto;
  const spunta = (p: number, data: string, indice: number, fatta = true) => request(app).put(`/api/partite/${p}/percorso`).send({ data, indice, fatta });
  const incontri = (p: number) => prepared('SELECT verso_rango AS verso, passaggio, origine FROM incontro_confidente_partita WHERE partita_id = ? ORDER BY id').all(p);
  const azioneTakemi = async (data: string) => ((await request(app).get(`/api/compendio/percorso/${data}`)).body.data as PercorsoGiornoDto).azioni.find((a) => a.riferimento?.chiave === 'takemi')!;
  const nota = [{ chiave: 'coraggio', nome: 'Coraggio', delta: 2 }];
  const menoNota = [{ chiave: 'coraggio', nome: 'Coraggio', delta: -2 }];

  it('la Dote degli incontri è un dato del Confidente per rango (088), e le azioni del passaggio non la danno più da sé', async () => {
    const takemi = (await request(app).get('/api/compendio/confidenti/takemi')).body.data as ConfidenteDettaglioDto;
    expect(takemi.dotiIncontro.find((r) => r.rango === 2)).toEqual({ rango: 2, doti: [{ dote: 'coraggio', note: 1 }], testo: 'Coraggio, 1 nota' });
    expect(takemi.dotiIncontro.find((r) => r.rango === 8)?.doti).toEqual([]);
    expect(takemi.dotiIncontro.map((r) => r.rango)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    // l'ultimo incontro di Yoshida vale verso il rango 10: la sua Dote non va persa
    const yoshida = (await request(app).get('/api/compendio/confidenti/yoshida')).body.data as ConfidenteDettaglioDto;
    expect(yoshida.dotiIncontro.find((r) => r.rango === 10)?.doti).toEqual([{ dote: 'fascino', note: 3 }]);
    const ultimo = ((await request(app).get('/api/compendio/percorso/08-25')).body.data as PercorsoGiornoDto).azioni.find((x) => x.riferimento?.chiave === 'yoshida')!;
    expect(ultimo.produce.filter((e) => e.tipo === 'dote')).toEqual([]);
    const a = await azioneTakemi('04-25');
    expect(a.rangoAtteso).toBe(2);
    expect(a.produce.filter((e) => e.tipo === 'dote')).toEqual([]);
    // lo studio con Makoto (nessun rango atteso) resta un effetto della sua azione
    const makoto = ((await request(app).get('/api/compendio/percorso/10-14')).body.data as PercorsoGiornoDto).azioni.find((x) => x.riferimento?.chiave === 'makoto')!;
    expect(makoto.produce).toEqual([{ tipo: 'dote', dote: 'conoscenza', note: 3 }]);
  });

  it('Takemi dal rango 1 al 2 dalla pagina Confidenti: la nota di Coraggio si dice; spuntare poi l\'azione del rango 2 non la ridice', async () => {
    const p = await nuovaPartita('Takemi pagina', '04-25');
    expect((await pagina(p, { rango: 1 })).doteIncontro).toEqual(nota); // il primo incontro (verso il rango 1): Coraggio ♪
    expect((await pagina(p, { rango: 2 })).doteIncontro).toEqual(nota);
    const a = await azioneTakemi('04-25');
    const s = (await spunta(p, '04-25', a.indice).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro).toMatchObject({ verso: 2, passaggio: true, giaContato: true, doti: [] });
    // abbassare il rango dalla pagina toglie il passaggio registrato lì, e dice di togliere la sua nota
    expect((await pagina(p, { rango: 1 })).doteIncontro).toEqual(menoNota);
    // le Doti si segnano a mano: nessuno di questi passaggi le ha toccate
    expect(await coraggio(p)).toBe(0);
  });

  it('prima la spunta dell\'azione del passaggio, poi il rango dalla pagina: una nota sola; togliere la spunta a rango raggiunto non la toglie', async () => {
    const p = await nuovaPartita('Takemi spunta', '04-25');
    await pagina(p, { rango: 1 });
    const a = await azioneTakemi('04-25');
    const s = (await spunta(p, '04-25', a.indice).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro).toMatchObject({ verso: 2, passaggio: true, giaContato: false, doti: [{ chiave: 'coraggio', delta: 2, note: 1 }] });
    expect((await pagina(p, { rango: 2 })).doteIncontro).toEqual([]);
    await spunta(p, '04-25', a.indice, false).expect(200);
    expect(incontri(p)).toEqual([{ verso: 1, passaggio: 1, origine: 'pagina' }, { verso: 2, passaggio: 1, origine: 'pagina' }]);
    expect(await coraggio(p)).toBe(0);
  });

  it('la spunta senza passaggio di rango dalla pagina: togliendola l\'incontro se ne va, e le Doti restano come sono', async () => {
    const p = await nuovaPartita('Takemi solo spunta', '04-25');
    await pagina(p, { rango: 1 });
    const a = await azioneTakemi('04-25');
    const s = (await spunta(p, '04-25', a.indice).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro?.doti).toEqual([{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }]);
    await spunta(p, '04-25', a.indice, false).expect(200);
    expect(incontri(p)).toEqual([{ verso: 1, passaggio: 1, origine: 'pagina' }]);
    expect(await coraggio(p)).toBe(0);
  });

  it('le note di risposta sono un incontro per momento della giornata: tre risposte, una nota; di sera un altro incontro', async () => {
    const p = await nuovaPartita('Takemi risposte', '04-27');
    await pagina(p, { rango: 2 });
    // un altro giorno: le risposte sono un incontro nuovo, non quello dei passaggi appena segnati
    await request(app).put(`/api/partite/${p}/giorno`).send({ data: '04-28' }).expect(200);
    const dette = [];
    for (let i = 0; i < 3; i++) dette.push((await pagina(p, { noteRisposta: 2 })).doteIncontro);
    expect(dette).toEqual([nota, [], []]); // verso il rango 3: Coraggio ♪, una volta
    prepared("UPDATE partita SET fascia_gioco = 'sera' WHERE id = ?").run(p);
    expect((await pagina(p, { noteRisposta: 3 })).doteIncontro).toEqual(nota);
    // la risposta di sera era uno sbaglio: «Annulla ultimo» riporta i punti a prima e toglie l'incontro, e dice di togliere la nota
    // (una risposta da tre note vale 15 punti, senza bonus dell'arcano)
    expect((await pagina(p, { deltaPunti: -15 })).doteIncontro).toEqual(menoNota);
    expect(await coraggio(p)).toBe(0);
  });

  it('le risposte e poi la spunta del passaggio nello stesso momento: lo stesso incontro diventa il passaggio, e togliendo la spunta torna semplice', async () => {
    const p = await nuovaPartita('Takemi marcato', '04-24');
    await pagina(p, { rango: 1 });
    await request(app).put(`/api/partite/${p}/giorno`).send({ data: '04-25' }).expect(200);
    expect((await pagina(p, { noteRisposta: 2 })).doteIncontro).toEqual(nota); // l'incontro semplice di 04-25 di giorno, verso il rango 2
    const a = await azioneTakemi('04-25');
    expect(a.fascia).toBe('giorno');
    const s = (await spunta(p, '04-25', a.indice).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro).toMatchObject({ id: null, marcato: expect.any(Number), verso: 2, passaggio: true, giaContato: true, doti: [] });
    expect(prepared("SELECT verso_rango AS verso, passaggio, origine FROM incontro_confidente_partita WHERE partita_id = ? AND data = '04-25'").all(p)).toEqual([{ verso: 2, passaggio: 1, origine: 'pagina' }]);
    // il rango nella partita è ancora 1: togliendo la spunta l'incontro resta (le risposte ci sono state) e torna semplice
    await spunta(p, '04-25', a.indice, false).expect(200);
    expect(prepared("SELECT passaggio FROM incontro_confidente_partita WHERE partita_id = ? AND data = '04-25'").all(p)).toEqual([{ passaggio: 0 }]);
    expect(await coraggio(p)).toBe(0);
  });

  it('anche una cosa da fare dell\'utente è un incontro, con le stesse regole', async () => {
    const p = await nuovaPartita('Takemi mia', '05-02');
    await pagina(p, { rango: 2 });
    // di sera: un momento diverso da quello dei passaggi segnati dalla pagina (di giorno)
    const a = (await request(app).post('/api/catalogo/agenda/azioni').send({ data: '05-02', fascia: 'sera', azione: 'Clinica', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' }, partitaId: p })).body.data as AzioneUtenteDto;
    const r = (await request(app).put(`/api/catalogo/agenda/azioni/${a.id}/fatta`).send({ partita: p, fatta: true, noteRisposta: 2 }).expect(200)).body.data as AzioneUtenteDto;
    expect(r.effetti?.incontro).toMatchObject({ verso: 3, passaggio: false, giaContato: false, doti: [{ chiave: 'coraggio', delta: 2 }] });
    await request(app).put(`/api/catalogo/agenda/azioni/${a.id}/fatta`).send({ partita: p, fatta: false }).expect(200);
    expect(prepared("SELECT COUNT(*) AS n FROM incontro_confidente_partita WHERE partita_id = ? AND fascia = 'sera'").get(p)).toEqual({ n: 0 });
    expect(await coraggio(p)).toBe(0);
  });

  it('la Dote a ogni incontro si modifica dalla scheda del Confidente (valida, rango esistente) e vale dai prossimi incontri', async () => {
    const put = (corpo: object) => request(app).put('/api/compendio/confidenti/takemi/doti-incontro').send(corpo);
    expect((await put({ ranghi: [{ rango: 11, doti: [] }] })).status).toBe(400);
    expect((await put({ ranghi: [{ rango: 3, doti: [{ dote: 'boh', note: 1 }] }] })).status).toBe(400);
    expect((await put({ ranghi: [{ rango: 3, doti: [{ dote: 'coraggio', note: 4 }] }] })).status).toBe(400);
    const r = (await put({ ranghi: [{ rango: 3, doti: [{ dote: 'coraggio', note: 2 }, { dote: 'perizia', note: 1 }] }] }).expect(200)).body.data as ConfidenteDettaglioDto;
    expect(r.dotiIncontro.find((x) => x.rango === 3)).toEqual({ rango: 3, doti: [{ dote: 'coraggio', note: 2 }, { dote: 'perizia', note: 1 }], testo: 'Coraggio, 2 note · Perizia, 1 nota' });
    const p = await nuovaPartita('Takemi modificata', '04-29');
    await pagina(p, { rango: 2 });
    expect((await pagina(p, { rango: 3 })).doteIncontro).toEqual([{ chiave: 'coraggio', nome: 'Coraggio', delta: 3 }, { chiave: 'perizia', nome: 'Perizia', delta: 2 }]);
    await put({ ranghi: [{ rango: 3, doti: [{ dote: 'coraggio', note: 1 }] }] }).expect(200);
  });

  it('gli incontri di un Confidente che il pacchetto non ha più sono orfani segnalati', async () => {
    const p = await nuovaPartita('Orfani incontri', '04-25');
    prepared("INSERT INTO incontro_confidente_partita (partita_id, confidente_chiave, data, fascia, verso_rango, passaggio, origine, doti_json, created_at) VALUES (?, 'nessuno', '04-25', 'giorno', 1, 0, 'pagina', '[]', 'x')").run(p);
    expect(orfaniPartite(getDb())).toEqual(expect.arrayContaining([expect.objectContaining({ tabella: 'incontro_confidente_partita', colonna: 'confidente_chiave', esempi: ['nessuno'] })]));
    prepared("DELETE FROM incontro_confidente_partita WHERE confidente_chiave = 'nessuno'").run();
  });
});
