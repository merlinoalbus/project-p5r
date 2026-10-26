// ============================================================
// Test API — la Dote a ogni incontro con un Confidente, una volta per incontro, da qualunque parte
// ============================================================
//
// Segnalato dall'utente (2026-09-30): «Tae Takemi passando dal rango 1 al rango 2 ricevo 1 nota di coraggio che non viene
// valutata». Scelta dell'utente: la Dote arriva da ogni incontro registrato (spunta nella giornata, note di risposta o
// passaggio di rango in Partita → Confidenti), e il passaggio al rango R conta una volta sola. Poi (stesso giorno): le Doti
// si segnano solo a mano — l'incontro si registra e **dice** la Dote che dà (`doteIncontro`, `effetti.incontro.doti`), da
// segnare nella scheda Doti; le Doti della partita non si muovono. Qui si sorveglia che la nota si dica una volta sola,
// da qualunque parte, e che togliendo un incontro si dica di toglierla. Dal 2026-10-17 (scelta dell'utente: «Solo al passaggio
// di rango», dopo un'uscita con Sojiro che dava solo punti e ricordava Gentilezza +3) la Dote si dice solo per il passaggio.
// ============================================================

import request from 'supertest';
import { closeDb, getDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { orfaniPartite } from '../services/pacchettoGiocoService.js';
import type { AzionePercorsoDto, ConfidenteDettaglioDto, ConfidentePartitaDto, DoteSocialePartitaDto, PercorsoGiornoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

describe('API — gli incontri con un Confidente e la Dote del passaggio di rango', () => {
  beforeAll(() => {
    dbDiProva();
  });
  afterAll(() => closeDb());

  /** Crea una partita col nome dato, la porta al giorno `data` (MM-GG) e ne restituisce l'id. */
  const nuovaPartita = async (nome: string, data: string) => {
    const id = ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
    await request(app).put(`/api/partite/${id}/giorno`).send({ data }).expect(200);
    return id;
  };
  /** Restituisce i punti di Coraggio della partita `p`. */
  const coraggio = async (p: number) => ((await request(app).get(`/api/partite/${p}/doti`)).body.data as DoteSocialePartitaDto[]).find((d) => d.chiave === 'coraggio')!.punti;
  /** Aggiorna dalla pagina del Confidente (con `forza`) lo stato di Takemi nella partita `p`, pretende il 200 e restituisce il Confidente. */
  const pagina = async (p: number, corpo: object) => (await request(app).put(`/api/partite/${p}/confidenti/takemi`).send({ forza: true, ...corpo }).expect(200)).body.data as ConfidentePartitaDto;
  /** Spunta (o, con `fatta` falso, toglie la spunta) della voce `uid` nella partita `p`. */
  const spunta = (p: number, uid: string, fatta = true) => request(app).put(`/api/partite/${p}/percorso`).send({ uid, fatta });
  /** Gli incontri con i Confidenti registrati nella partita `p` (rango verso cui contano, se passaggio, origine), in ordine d'inserimento. */
  const incontri = (p: number) => prepared('SELECT verso_rango AS verso, passaggio, origine FROM incontro_confidente_partita WHERE partita_id = ? ORDER BY id').all(p);
  /** L'azione della guida del giorno `data` che riferisce Takemi. */
  const azioneTakemi = async (data: string) => ((await request(app).get(`/api/compendio/percorso/${data}`)).body.data as PercorsoGiornoDto).azioni.find((a) => a.riferimento?.chiave === 'takemi')!;
  const nota = [{ chiave: 'coraggio', nome: 'Coraggio', delta: 2 }];
  const menoNota = [{ chiave: 'coraggio', nome: 'Coraggio', delta: -2 }];

  it('la Dote degli incontri è un dato del Confidente per rango (088), e le azioni del passaggio non la danno più da sé', async () => {
    const takemi = (await request(app).get('/api/compendio/confidenti/takemi')).body.data as ConfidenteDettaglioDto;
    expect(takemi.dotiIncontro.find((r) => r.rango === 2)).toEqual({ rango: 2, doti: [{ dote: 'coraggio', note: 1 }], testo: 'Coraggio ♪' });
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
    const s = (await spunta(p, a.uid).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro).toMatchObject({ verso: 2, passaggio: true, giaContato: true, doti: [] });
    // abbassare il rango dalla pagina toglie il passaggio registrato lì, e dice di togliere la sua nota
    expect((await pagina(p, { rango: 1 })).doteIncontro).toEqual(menoNota);
    // le Doti si segnano a mano: nessuno di questi passaggi le ha toccate
    expect(await coraggio(p)).toBe(0);
  });

  it('prima la spunta dell\'azione del passaggio, poi il rango dalla pagina: una nota sola; R10-17: la spunta alza il rango e togliendola il rango torna indietro', async () => {
    const p = await nuovaPartita('Takemi spunta', '04-25');
    await pagina(p, { rango: 1 });
    const a = await azioneTakemi('04-25');
    const s = (await spunta(p, a.uid).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro).toMatchObject({ verso: 2, passaggio: true, giaContato: false, doti: [{ chiave: 'coraggio', delta: 2, note: 1 }], rango: { da: 1, a: 2 } });
    // R10-17: il passaggio spuntato nel Diario ha già portato Takemi al rango 2; la pagina non ha niente da aggiungere
    const rangoDi = () => (prepared("SELECT rango FROM confidente_partita WHERE partita_id = ? AND confidente_chiave = 'takemi'").get(p) as { rango: number }).rango;
    expect(rangoDi()).toBe(2);
    expect((await pagina(p, { rango: 2 })).doteIncontro).toEqual([]);
    await spunta(p, a.uid, false).expect(200);
    // togliendo la spunta il passaggio e il rango tornano com'erano; resta solo il rango 1 segnato dalla pagina
    expect(rangoDi()).toBe(1);
    expect(incontri(p)).toEqual([{ verso: 1, passaggio: 1, origine: 'pagina' }]);
    expect(await coraggio(p)).toBe(0);
  });

  it('la spunta senza passaggio di rango dalla pagina: togliendola l\'incontro se ne va, e le Doti restano come sono', async () => {
    const p = await nuovaPartita('Takemi solo spunta', '04-25');
    await pagina(p, { rango: 1 });
    const a = await azioneTakemi('04-25');
    const s = (await spunta(p, a.uid).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro?.doti).toEqual([{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }]);
    await spunta(p, a.uid, false).expect(200);
    expect(incontri(p)).toEqual([{ verso: 1, passaggio: 1, origine: 'pagina' }]);
    expect(await coraggio(p)).toBe(0);
  });

  it('le note di risposta sono un incontro per momento della giornata, senza Dote (dal 2026-10-17 la Dote è del passaggio di rango)', async () => {
    const p = await nuovaPartita('Takemi risposte', '04-27');
    await pagina(p, { rango: 2 });
    // un altro giorno: le risposte sono un incontro nuovo, non quello dei passaggi appena segnati
    await request(app).put(`/api/partite/${p}/giorno`).send({ data: '04-28' }).expect(200);
    const dette = [];
    for (let i = 0; i < 3; i++) dette.push((await pagina(p, { noteRisposta: 2 })).doteIncontro);
    // verso il rango 3 c'è Coraggio ♪, ma un incontro senza passaggio non lo dà
    expect(dette).toEqual([[], [], []]);
    expect(prepared("SELECT verso_rango AS verso, passaggio, doti_json FROM incontro_confidente_partita WHERE partita_id = ? AND data = '04-28'").all(p)).toEqual([{ verso: 3, passaggio: 0, doti_json: '[]' }]);
    prepared("UPDATE partita SET fascia_gioco = 'sera' WHERE id = ?").run(p);
    expect((await pagina(p, { noteRisposta: 3 })).doteIncontro).toEqual([]);
    // la risposta di sera era uno sbaglio: «Annulla ultimo» riporta i punti a prima e toglie l'incontro, che non dava niente
    // (una risposta da tre note vale 15 punti, senza bonus dell'arcano)
    expect((await pagina(p, { deltaPunti: -15 })).doteIncontro).toEqual([]);
    expect(prepared("SELECT COUNT(*) AS n FROM incontro_confidente_partita WHERE partita_id = ? AND fascia = 'sera'").get(p)).toEqual({ n: 0 });
    expect(await coraggio(p)).toBe(0);
  });

  it('le risposte e poi la spunta del passaggio nello stesso momento: lo stesso incontro diventa il passaggio e dà lì la Dote; togliendo la spunta torna semplice, senza', async () => {
    const p = await nuovaPartita('Takemi marcato', '04-24');
    await pagina(p, { rango: 1 });
    await request(app).put(`/api/partite/${p}/giorno`).send({ data: '04-25' }).expect(200);
    expect((await pagina(p, { noteRisposta: 2 })).doteIncontro).toEqual([]); // l'incontro semplice di 04-25 di giorno, verso il rango 2
    const a = await azioneTakemi('04-25');
    expect(a.fascia).toBe('giorno');
    const s = (await spunta(p, a.uid).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro).toMatchObject({ id: null, marcato: expect.any(Number), verso: 2, passaggio: true, giaContato: false, doti: [{ chiave: 'coraggio', delta: 2, note: 1 }] });
    const riga = "SELECT verso_rango AS verso, passaggio, origine, doti_json FROM incontro_confidente_partita WHERE partita_id = ? AND data = '04-25'";
    expect(prepared(riga).all(p)).toEqual([{ verso: 2, passaggio: 1, origine: 'pagina', doti_json: JSON.stringify([{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }]) }]);
    // R10-17: la spunta ha portato il rango a 2; togliendola il rango torna a 1, l'incontro resta (le risposte ci sono state), torna semplice e senza Dote
    await spunta(p, a.uid, false).expect(200);
    expect(prepared(riga).all(p)).toEqual([{ verso: 2, passaggio: 0, origine: 'pagina', doti_json: '[]' }]);
    expect(await coraggio(p)).toBe(0);
  });

  it('un incontro semplice registrato con la regola di prima (Dote già data) che diventa il passaggio non la ridà, e togliendo la spunta la tiene', async () => {
    const p = await nuovaPartita('Takemi regola di prima', '04-24');
    await pagina(p, { rango: 1 });
    await request(app).put(`/api/partite/${p}/giorno`).send({ data: '04-25' }).expect(200);
    await pagina(p, { noteRisposta: 2 });
    // com'era prima del 2026-10-17: l'incontro semplice aveva dato la Dote del rango verso cui valeva
    const dataPrima = JSON.stringify([{ chiave: 'coraggio', nome: 'Coraggio', delta: 2, note: 1 }]);
    prepared("UPDATE incontro_confidente_partita SET doti_json = ? WHERE partita_id = ? AND data = '04-25'").run(dataPrima, p);
    const a = await azioneTakemi('04-25');
    const s = (await spunta(p, a.uid).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro).toMatchObject({ id: null, marcato: expect.any(Number), verso: 2, passaggio: true, giaContato: true, doti: [] });
    const riga = "SELECT passaggio, doti_json FROM incontro_confidente_partita WHERE partita_id = ? AND data = '04-25'";
    expect(prepared(riga).all(p)).toEqual([{ passaggio: 1, doti_json: dataPrima }]);
    await spunta(p, a.uid, false).expect(200);
    expect(prepared(riga).all(p)).toEqual([{ passaggio: 0, doti_json: dataPrima }]);
  });

  it('un\'uscita che dà solo punti (Sojiro, rango 3, nessun aumento di rango) non dà la Dote del rango 4 (segnalato dall\'utente, 2026-10-17)', async () => {
    const p = await nuovaPartita('Sojiro punti', '05-21');
    await request(app).put(`/api/partite/${p}/confidenti/sojiro`).send({ forza: true, rango: 3 }).expect(200);
    // la voce del diario del 21/05 di sera con Sojiro, senza rango atteso
    const voce = ((await request(app).get('/api/compendio/percorso/05-21')).body.data as PercorsoGiornoDto).azioni.find((x) => x.riferimento?.chiave === 'sojiro')!;
    expect(voce.rangoAtteso).toBeNull();
    const s = (await request(app).put(`/api/partite/${p}/percorso`).send({ uid: voce.uid, fatta: true, noteRisposta: 2 }).expect(200)).body.data as AzionePercorsoDto;
    expect(s.effetti?.incontro).toMatchObject({ confidente: 'sojiro', verso: 4, passaggio: false, giaContato: false, doti: [] });
    // i punti delle risposte ci sono (la parte del Confidente), la Gentilezza no
    expect(s.effetti?.confidente).toMatchObject({ chiave: 'sojiro', noteRisposta: 2 });
    expect(s.effetti?.confidente?.punti).toBeGreaterThan(0);
  });

  it('anche una voce aggiunta dall\'utente è un incontro, con le stesse regole', async () => {
    const p = await nuovaPartita('Takemi mia', '05-02');
    await pagina(p, { rango: 2 });
    // di sera: un momento diverso da quello dei passaggi segnati dalla pagina (di giorno); senza rango atteso, nessuna Dote
    const a = (await request(app).post('/api/compendio/percorso/05-02/voci').send({ fascia: 'sera', azione: 'Clinica', tipo: 'confidente', riferimento: { tipo: 'confidente', chiave: 'takemi' } })).body.data as AzionePercorsoDto;
    const r = (await request(app).put(`/api/partite/${p}/percorso`).send({ uid: a.uid, fatta: true, noteRisposta: 2 }).expect(200)).body.data as AzionePercorsoDto;
    expect(r.effetti?.incontro).toMatchObject({ verso: 3, passaggio: false, giaContato: false, doti: [] });
    await request(app).put(`/api/partite/${p}/percorso`).send({ uid: a.uid, fatta: false }).expect(200);
    expect(prepared("SELECT COUNT(*) AS n FROM incontro_confidente_partita WHERE partita_id = ? AND fascia = 'sera'").get(p)).toEqual({ n: 0 });
    expect(await coraggio(p)).toBe(0);
  });

  it('la Dote a ogni incontro si modifica dalla scheda del Confidente (valida, rango esistente) e vale dai prossimi incontri', async () => {
    /** Salva col corpo dato la Dote a ogni incontro di Takemi (restituisce la richiesta, per controllarne l'esito). */
    const put = (corpo: object) => request(app).put('/api/compendio/confidenti/takemi/doti-incontro').send(corpo);
    expect((await put({ ranghi: [{ rango: 11, doti: [] }] })).status).toBe(400);
    expect((await put({ ranghi: [{ rango: 3, doti: [{ dote: 'boh', note: 1 }] }] })).status).toBe(400);
    expect((await put({ ranghi: [{ rango: 3, doti: [{ dote: 'coraggio', note: 4 }] }] })).status).toBe(400);
    const r = (await put({ ranghi: [{ rango: 3, doti: [{ dote: 'coraggio', note: 2 }, { dote: 'perizia', note: 1 }] }] }).expect(200)).body.data as ConfidenteDettaglioDto;
    expect(r.dotiIncontro.find((x) => x.rango === 3)).toEqual({ rango: 3, doti: [{ dote: 'coraggio', note: 2 }, { dote: 'perizia', note: 1 }], testo: 'Coraggio ♪♪ · Perizia ♪' });
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
