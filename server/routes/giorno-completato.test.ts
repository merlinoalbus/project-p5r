// ============================================================
// Test API — spuntata l'ultima attività del giorno corrente, la partita passa al giorno dopo, di giorno
// ============================================================
//
// Richiesta dell'utente (2026-09-30): «se completo tutte le attività di un giorno deve spostare automaticamente il
// giorno corrente al giorno successivo modalità giorno». Contano la guida del giorno com'è (le rimosse no) e le cose
// da fare dell'utente; togliere una spunta non torna indietro; un giorno che non è quello corrente non fa avanzare.
// ============================================================

import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AzionePercorsoDto, AzioneUtenteDto, PartitaDto, PercorsoGiornoDto } from '../../shared/types.js';

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
  const spunta = async (data: string, indice: number, fatta: boolean) => (await request(app).put(`/api/partite/${id}/percorso`).send({ data, indice, fatta })).body.data as AzionePercorsoDto;

  it('le attività una per una: solo l’ultima fa passare al giorno dopo, di giorno, e lo scrive nello storico', async () => {
    await request(app).put(`/api/partite/${id}`).send({ dataGioco: '04-09', fasciaGioco: 'sera' });
    const g = await giorno('04-09');
    expect(g.azioni.length).toBeGreaterThan(1);
    for (const a of g.azioni.slice(0, -1)) expect((await spunta('04-09', a.indice, true)).giornoAvanzato).toBeUndefined();
    expect((await partita()).dataGioco).toBe('04-09');
    const ultima = await spunta('04-09', g.azioni[g.azioni.length - 1].indice, true);
    expect(ultima.giornoAvanzato).toMatchObject({ da: '04-09', a: '04-10', partita: { dataGioco: '04-10', fasciaGioco: 'giorno' } });
    expect(await partita()).toMatchObject({ dataGioco: '04-10', fasciaGioco: 'giorno' });
    const storico = (await request(app).get(`/api/partite/${id}/storico`)).body.data as { eventi: Array<{ titolo: string }> };
    expect(storico.eventi.some((e) => e.titolo === 'Giornata del 04-09 completata')).toBe(true);
  });

  it('togliere una spunta del giorno passato non torna indietro; rispuntarla non fa avanzare di nuovo', async () => {
    const g = await giorno('04-09');
    expect((await spunta('04-09', g.azioni[0].indice, false)).giornoAvanzato).toBeUndefined();
    expect((await partita()).dataGioco).toBe('04-10');
    // il 04-09 non è più il giorno corrente: completarlo di nuovo non sposta niente
    expect((await spunta('04-09', g.azioni[0].indice, true)).giornoAvanzato).toBeUndefined();
    expect((await partita()).dataGioco).toBe('04-10');
  });

  it('le mie cose da fare contano: con la guida tutta fatta, il giorno passa solo quando è fatta anche la mia', async () => {
    const mia = (await request(app).post('/api/catalogo/agenda/azioni').send({ data: '04-10', fascia: 'sera', azione: 'Comprare i Bionutrienti', partitaId: id })).body.data as AzioneUtenteDto;
    const g = await giorno('04-10');
    for (const a of g.azioni) expect((await spunta('04-10', a.indice, true)).giornoAvanzato).toBeUndefined();
    expect((await partita()).dataGioco).toBe('04-10');
    const esito = (await request(app).put(`/api/catalogo/agenda/azioni/${mia.id}/fatta`).send({ partita: id, fatta: true })).body.data as AzioneUtenteDto;
    expect(esito.giornoAvanzato).toMatchObject({ da: '04-10', a: '04-11' });
    expect((await partita()).dataGioco).toBe('04-11');
  });

  it('un’azione rimossa dalla giornata non conta', async () => {
    const g = await giorno('04-11');
    expect(g.azioni.length).toBe(2);
    await request(app).put(`/api/compendio/percorso/04-11/azioni/${g.azioni[1].indice}/rimossa`).send({ rimossa: true }).expect(200);
    const esito = await spunta('04-11', g.azioni[0].indice, true);
    expect(esito.giornoAvanzato).toMatchObject({ da: '04-11', a: '04-12' });
    // la rimozione vale per tutte le partite: si rimette com'era
    await request(app).put(`/api/compendio/percorso/04-11/azioni/${g.azioni[1].indice}/rimossa`).send({ rimossa: false }).expect(200);
  });
});
