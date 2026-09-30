// ============================================================
// Test API — spuntata l'ultima attività del giorno corrente, la partita passa al giorno dopo, di giorno
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «se completo tutte le attività di un giorno deve spostare automaticamente il
// giorno corrente al giorno successivo modalità giorno». Contano le voci del giorno che si spuntano (guida e voci aggiunte;
// eventi, scadenze e promemoria no); togliere una spunta non torna indietro; un giorno che non è quello corrente non fa avanzare.
// ============================================================

import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AzionePercorsoDto, PartitaDto, PercorsoGiornoDto } from '../../shared/types.js';

const app = createApp();

describe('Giorno completato → giorno dopo', () => {
  let id = 0;
  beforeAll(async () => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
    invalidaCacheTraduzioni();
    id = ((await request(app).post('/api/partite').send({ nome: 'Giornate' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  const giorno = async (data: string) => (await request(app).get(`/api/compendio/percorso/${data}?partita=${id}`)).body.data as PercorsoGiornoDto;
  const partita = async () => (await request(app).get(`/api/partite/${id}`)).body.data as PartitaDto;
  const spunta = async (uid: string, fatta: boolean) => (await request(app).put(`/api/partite/${id}/percorso`).send({ uid, fatta })).body.data as AzionePercorsoDto;
  const crea = async (data: string, corpo: object) => (await request(app).post(`/api/compendio/percorso/${data}/voci`).send(corpo)).body.data as AzionePercorsoDto;

  it('le attività una per una: solo l’ultima fa passare al giorno dopo, di giorno, e lo scrive nello storico', async () => {
    await request(app).put(`/api/partite/${id}`).send({ dataGioco: '04-09', fasciaGioco: 'sera' });
    const g = await giorno('04-09');
    expect(g.azioni.length).toBeGreaterThan(1);
    for (const a of g.azioni.slice(0, -1)) expect((await spunta(a.uid, true)).giornoAvanzato).toBeUndefined();
    expect((await partita()).dataGioco).toBe('04-09');
    const ultima = await spunta(g.azioni[g.azioni.length - 1].uid, true);
    expect(ultima.giornoAvanzato).toMatchObject({ da: '04-09', a: '04-10', partita: { dataGioco: '04-10', fasciaGioco: 'giorno' } });
    expect(await partita()).toMatchObject({ dataGioco: '04-10', fasciaGioco: 'giorno' });
    const storico = (await request(app).get(`/api/partite/${id}/storico`)).body.data as { eventi: Array<{ titolo: string }> };
    expect(storico.eventi.some((e) => e.titolo === 'Giornata del 04-09 completata')).toBe(true);
  });

  it('togliere una spunta del giorno passato non torna indietro; rispuntarla non fa avanzare di nuovo', async () => {
    const g = await giorno('04-09');
    expect((await spunta(g.azioni[0].uid, false)).giornoAvanzato).toBeUndefined();
    expect((await partita()).dataGioco).toBe('04-10');
    // il 04-09 non è più il giorno corrente: completarlo di nuovo non sposta niente
    expect((await spunta(g.azioni[0].uid, true)).giornoAvanzato).toBeUndefined();
    expect((await partita()).dataGioco).toBe('04-10');
  });

  it('le voci aggiunte contano, gli eventi no: con la guida tutta fatta, il giorno passa solo quando è fatta anche la voce aggiunta', async () => {
    const mia = await crea('04-10', { fascia: 'sera', azione: 'Comprare i Bionutrienti' });
    const evento = await crea('04-10', { genere: 'promemoria', fascia: 'sera', azione: 'Ricordarsi il pane' });
    const g = await giorno('04-10');
    for (const a of g.azioni.filter((x) => x.uid !== mia.uid && x.uid !== evento.uid)) expect((await spunta(a.uid, true)).giornoAvanzato).toBeUndefined();
    expect((await partita()).dataGioco).toBe('04-10');
    const esito = await spunta(mia.uid, true);
    expect(esito.giornoAvanzato).toMatchObject({ da: '04-10', a: '04-11' });
    expect((await partita()).dataGioco).toBe('04-11');
  });

  it('una voce eliminata dalla giornata non conta', async () => {
    const g = await giorno('04-11');
    // (quante voci ha il giorno dipende dal canone del pacchetto: se ne elimina l'ultima e si spuntano le altre)
    expect(g.azioni.length).toBeGreaterThanOrEqual(2);
    const [ultima, ...altre] = [g.azioni.at(-1)!, ...g.azioni.slice(0, -1)];
    await request(app).delete(`/api/compendio/percorso/voci/${ultima.uid}`).expect(204);
    for (const a of altre.slice(0, -1)) expect((await spunta(a.uid, true)).giornoAvanzato).toBeUndefined();
    const esito = await spunta(altre.at(-1)!.uid, true);
    expect(esito.giornoAvanzato).toMatchObject({ da: '04-11', a: '04-12' });
  });
});
