// ============================================================
// Copiare o spostare voci del diario in un altro giorno e fascia (2026-10-12)
// ============================================================
//
// Richiesta dell'utente: «vorrei anche poter copiare elementi del diario (giorno/notte testi e riferimenti e poterli inserire in un
// altro giorno o nella parte giorno o nella parte notte a scelta)». Scelte: «Una o più insieme» e «Sì, anche spostare».
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import type { AzionePercorsoDto, VociTrasferiteDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();
const URL = '/api/compendio/percorso/voci/trasferisci';

describe('copiare o spostare voci del diario', () => {
  let partita: number;
  /** Le righe di una fascia di un giorno, nel loro ordine. */
  const fascia = (data: string, f: string) => prepared('SELECT * FROM voce_giornata WHERE data = ? AND fascia = ? ORDER BY ordine').all(data, f) as Array<Record<string, unknown>>;
  /** Il contenuto di una voce, senza quel che la identifica o la colloca. */
  const contenuto = (r: Record<string, unknown>) => ({ genere: r.genere, azione: r.azione, note: r.note, tipo: r.tipo, riferimento_tipo: r.riferimento_tipo, riferimento_chiave: r.riferimento_chiave, riferimento_testo: r.riferimento_testo, rango_atteso: r.rango_atteso, produce_json: r.produce_json });
  /** Aggiunge una voce (azione) al giorno e alla fascia dati e la restituisce. */
  const nuova = async (data: string, f: 'giorno' | 'sera', azione: string, extra: Record<string, unknown> = {}) =>
    (await request(app).post(`/api/compendio/percorso/${data}/voci`).send({ azione, fascia: f, ...extra }).expect(201)).body.data as AzionePercorsoDto;

  beforeAll(async () => {
    dbDiProva();
    partita = ((await request(app).post('/api/partite').send({ nome: 'Diario' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('copia: voci nuove con lo stesso contenuto, in fondo alla fascia scelta e nel loro ordine (giorno prima di sera); niente spunte; le originali restano', async () => {
    const giorno = fascia('04-12', 'giorno');
    const sera = fascia('04-12', 'sera');
    // una spuntata nella partita: la copia nasce senza spunta
    await request(app).put(`/api/partite/${partita}/percorso`).send({ uid: giorno[0].uid, fatta: true }).expect(200);
    const prima = fascia('04-14', 'sera').length;
    // chieste in disordine: arrivano nell'ordine che avevano (la voce di giorno prima di quella di sera)
    const r = await request(app).post(`${URL}?partita=${partita}`).send({ uid: [sera[1].uid, giorno[0].uid], giorno: '04-14', fascia: 'sera', modo: 'copia' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    const esito = r.body.data as VociTrasferiteDto;
    expect(esito).toMatchObject({ giorno: '04-14', fascia: 'sera' });
    expect(esito.uid).toHaveLength(2);
    expect(esito.uid).not.toContain(giorno[0].uid);
    const dopo = fascia('04-14', 'sera');
    expect(dopo).toHaveLength(prima + 2);
    expect(dopo.slice(-2).map((x) => x.uid)).toEqual(esito.uid);
    expect(dopo.slice(-2).map(contenuto)).toEqual([contenuto(giorno[0]), contenuto(sera[1])]);
    expect(dopo.map((x) => x.ordine)).toEqual(dopo.map((_, i) => i));
    expect(dopo.slice(-2).every((x) => x.indice_guida === null)).toBe(true);
    // la risposta porta il giorno con lo stato nella partita: la copia non è spuntata, l'originale sì
    expect(esito.voci.find((v) => v.uid === esito.uid[0])).toMatchObject({ fatta: false, fascia: 'sera' });
    expect(prepared('SELECT COUNT(*) FROM spunta_voce_partita WHERE voce_uid IN (?, ?)').pluck().get(esito.uid[0], esito.uid[1])).toBe(0);
    expect(fascia('04-12', 'giorno').map((x) => x.uid)).toEqual(giorno.map((x) => x.uid));
    expect(fascia('04-12', 'sera').map((x) => x.uid)).toEqual(sera.map((x) => x.uid));
  });

  it('sposta: le stesse voci (uid e spunte) cambiano giorno e fascia, in fondo; le fasce lasciate si ricompattano', async () => {
    const a = await nuova('04-15', 'giorno', 'Prima da spostare');
    const b = await nuova('04-15', 'giorno', 'Seconda da spostare');
    // una voce dopo le due: spostandole resta un buco, che la ricompattazione deve chiudere
    await nuova('04-15', 'giorno', 'Resta dopo le due');
    const c = await nuova('04-15', 'sera', 'Resta di sera');
    await request(app).put(`/api/partite/${partita}/percorso`).send({ uid: b.uid, fatta: true }).expect(200);
    const restoGiorno = fascia('04-15', 'giorno').filter((x) => x.uid !== a.uid && x.uid !== b.uid).map((x) => x.uid);
    const r = await request(app).post(URL).send({ uid: [b.uid, a.uid], giorno: '04-16', fascia: 'sera', modo: 'sposta' }).expect(200);
    expect((r.body.data as VociTrasferiteDto).uid).toEqual([a.uid, b.uid]);
    expect(fascia('04-16', 'sera').slice(-2).map((x) => x.uid)).toEqual([a.uid, b.uid]);
    expect(fascia('04-15', 'giorno').map((x) => x.uid)).toEqual(restoGiorno);
    expect(fascia('04-15', 'giorno').map((x) => x.ordine)).toEqual(restoGiorno.map((_, i) => i));
    expect(fascia('04-15', 'sera').some((x) => x.uid === c.uid)).toBe(true);
    // la spunta segue la voce
    const g = (await request(app).get(`/api/compendio/percorso/04-16?partita=${partita}`).expect(200)).body.data as { azioni: AzionePercorsoDto[] };
    expect(g.azioni.find((v) => v.uid === b.uid)).toMatchObject({ fatta: true, fascia: 'sera' });
    // nella stessa fascia dello stesso giorno: va in fondo
    await request(app).post(URL).send({ uid: [a.uid], giorno: '04-16', fascia: 'sera', modo: 'sposta' }).expect(200);
    expect(fascia('04-16', 'sera').at(-1)!.uid).toBe(a.uid);
  });

  it('sposta una voce della guida d\'origine in un giorno che ha una voce della guida con lo stesso indice: niente vincolo violato, l\'indice si perde cambiando data e resta nella stessa data', async () => {
    const indice = (uid: unknown) => prepared('SELECT indice_guida FROM voce_giornata WHERE uid = ?').pluck().get(uid);
    // la prima voce della guida del 18 aprile e un altro giorno che ha anche lui una voce della guida con quell'indice
    const origine = prepared('SELECT * FROM voce_giornata WHERE data = ? AND indice_guida IS NOT NULL ORDER BY indice_guida LIMIT 1').get('04-18') as Record<string, unknown>;
    expect(origine).toBeDefined();
    const arrivo = prepared('SELECT data FROM voce_giornata WHERE data <> ? AND indice_guida = ? ORDER BY data LIMIT 1').pluck().get('04-18', origine.indice_guida) as string;
    expect(arrivo).toBeDefined();
    await request(app).put(`/api/partite/${partita}/percorso`).send({ uid: origine.uid, fatta: true }).expect(200);
    // nella stessa data cambia solo fascia: l'indice resta, è ancora quello di quel giorno
    const altra = origine.fascia === 'sera' ? 'giorno' : 'sera';
    const stesso = await request(app).post(URL).send({ uid: [origine.uid], giorno: '04-18', fascia: altra, modo: 'sposta' });
    expect(stesso.status, JSON.stringify(stesso.body)).toBe(200);
    expect(indice(origine.uid)).toBe(origine.indice_guida);
    const r = await request(app).post(`${URL}?partita=${partita}`).send({ uid: [origine.uid], giorno: arrivo, fascia: 'sera', modo: 'sposta' });
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(indice(origine.uid)).toBeNull();
    expect(prepared('SELECT data FROM voce_giornata WHERE uid = ?').pluck().get(origine.uid)).toBe(arrivo);
    expect((r.body.data as VociTrasferiteDto).voci.find((v) => v.uid === origine.uid)).toMatchObject({ fatta: true, fascia: 'sera' });
    // la voce della guida del giorno d'arrivo con quell'indice resta lei
    expect(prepared('SELECT COUNT(*) FROM voce_giornata WHERE data = ? AND indice_guida = ?').pluck().get(arrivo, origine.indice_guida)).toBe(1);
  });

  it('una voce che non c\'è fa fallire tutto senza scrivere; ripetizioni, giorni e modi sbagliati si rifiutano', async () => {
    const v = fascia('04-12', 'giorno')[1];
    const quante = prepared('SELECT COUNT(*) FROM voce_giornata').pluck().get();
    const nessuna = await request(app).post(URL).send({ uid: [v.uid, 'f'.repeat(32)], giorno: '04-20', fascia: 'giorno', modo: 'copia' });
    expect([nessuna.status, nessuna.body.error.code]).toEqual([404, 'voce-non-trovata']);
    expect(prepared('SELECT COUNT(*) FROM voce_giornata').pluck().get()).toBe(quante);
    expect((await request(app).post(URL).send({ uid: [v.uid, v.uid], giorno: '04-20', fascia: 'giorno', modo: 'copia' })).status).toBe(400);
    expect((await request(app).post(URL).send({ uid: [v.uid], giorno: '1340', fascia: 'giorno', modo: 'copia' })).status).toBe(400);
    expect((await request(app).post(URL).send({ uid: [v.uid], giorno: '13-40', fascia: 'giorno', modo: 'copia' })).body.error.code).toBe('giorno-non-trovato');
    expect((await request(app).post(URL).send({ uid: [], giorno: '04-20', fascia: 'giorno', modo: 'copia' })).status).toBe(400);
    expect((await request(app).post(URL).send({ uid: [v.uid], giorno: '04-20', fascia: 'notte', modo: 'copia' })).status).toBe(400);
    expect((await request(app).post(URL).send({ uid: [v.uid], giorno: '04-20', fascia: 'giorno', modo: 'clona' })).status).toBe(400);
    const fuori = await request(app).post(URL).send({ uid: [v.uid], giorno: '04-01', fascia: 'giorno', modo: 'copia' });
    expect([fuori.status, fuori.body.error.code]).toEqual([404, 'giorno-non-trovato']);
    expect((await request(app).post(`${URL}?partita=99999`).send({ uid: [v.uid], giorno: '04-20', fascia: 'giorno', modo: 'copia' })).status).toBe(404);
    expect(prepared('SELECT COUNT(*) FROM voce_giornata').pluck().get()).toBe(quante);
  });
});
