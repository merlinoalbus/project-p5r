// ============================================================
// API Film e DVD — catalogo, sessioni, rivisioni e isolamento partita
// ============================================================

import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { caricaPacchetto, ricaricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { statoDisponibilitaPartita, valutaRequisiti } from '../services/disponibilitaService.js';
import { createApp } from '../bootstrap.js';
import type { AttivitaTutteDto, FilmDto, FilmDvdDto, StoricoDto } from '../../shared/types.js';
import { migraTestiCondizioni } from '../../shared/migraCondizioni.js';

const app = createApp();

describe('API Film e DVD', () => {
  beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); });
  afterAll(() => closeDb());

  it('espone 18 film cinema e 12 DVD, 42 sessioni obiettivo e posizioni strutturate', async () => {
    const d = (await request(app).get('/api/compendio/film')).body.data as FilmDvdDto;
    expect(d.film).toHaveLength(30);
    expect(d.film.filter((f) => f.dove === 'cinema')).toHaveLength(18);
    expect(d.film.filter((f) => f.dove === 'dvd')).toHaveLength(12);
    expect(d).toMatchObject({ iniziati: 0, completati: 0, sessioniCompletamentoFatte: 0, sessioniObiettivo: 42, visioniRegistrate: 0 });
    expect(d.film.every((f) => f.posizioni.length >= 1)).toBe(true);
    expect(d.film.find((f) => f.chiave === 'dvd-wraith')?.posizioni).toEqual([
      { tipo: 'luogo', chiave: 'shibuya/scarlet', etichetta: 'Videonoleggio Scarlet', ruolo: 'noleggio' },
      { tipo: 'luogo', chiave: 'yongen-jaya/leblanc', etichetta: 'Mansarda del Café Leblanc', ruolo: 'visione' },
    ]);
    expect((getDb().prepare('SELECT COUNT(*) n FROM film_posizione').get() as { n: number }).n).toBe(42);
    expect((await request(app).get('/api/compendio/film?partita=99999')).status).toBe(404);
  });

  it('traccia un DVD 0→1→2 e lo considera iniziato prima di considerarlo completato', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'DVD' })).body.data as { id: number }).id;
    const url = `/api/partite/${id}/letture`;
    let f = (await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: 1 })).body.data as FilmDto;
    expect(f).toMatchObject({ progresso: 1, totaleSessioni: 2, iniziato: true, fatto: false });
    expect(getDb().prepare("SELECT chiave FROM lettura_partita WHERE partita_id=? AND tipo='film'").all(id)).toEqual([]);
    f = (await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: 2 })).body.data as FilmDto;
    expect(f).toMatchObject({ progresso: 2, iniziato: true, fatto: true });
    expect(getDb().prepare("SELECT chiave FROM lettura_partita WHERE partita_id=? AND tipo='film'").all(id)).toEqual([{ chiave: 'dvd-wraith' }]);
    const d = (await request(app).get(`/api/compendio/film?partita=${id}`)).body.data as FilmDvdDto;
    expect(d).toMatchObject({ iniziati: 1, completati: 1, sessioniCompletamentoFatte: 2, visioniRegistrate: 2 });
  });

  it('sblocca il requisito aggregato soltanto al completamento, senza esporre un fatto falsificabile', async () => {
    const requisito = { tipo: 'contatore', cosa: 'film-completati', almeno: 1 } as const;
    expect(migraTestiCondizioni(['dopo essere andati al cinema o aver visto un DVD almeno una volta'])).toEqual([requisito]);
    expect(JSON.parse((getDb().prepare("SELECT condizioni_json FROM articolo WHERE chiave='hinokuniya/anima-da-cineasta'").get() as { condizioni_json: string }).condizioni_json)).toEqual([requisito]);

    const id = ((await request(app).post('/api/partite').send({ nome: 'Prima visione' })).body.data as { id: number }).id;
    const valuta = () => valutaRequisiti([{ ...requisito, testo: 'Prima visione Film/DVD' }], statoDisponibilitaPartita(id)).stato;
    expect(valuta()).toBe('bloccato');
    // il contatore non si imposta a mano: si calcola dai progressi, e non esiste un endpoint per scriverlo
    expect((await request(app).put(`/api/condizioni/partite/${id}/eventi/film-completati`).send({ avvenuto: true })).status).toBe(404);

    const url = `/api/partite/${id}/letture`;
    await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: 1 });
    expect(valuta()).toBe('bloccato');
    await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: 2 });
    expect(valuta()).toBe('disponibile');
    await request(app).put(url).send({ tipo: 'film', chiave: 'cinema-le-sedici-domande', avanzamento: 1 });
    await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: 0 });
    expect(valuta()).toBe('disponibile');
    await request(app).put(url).send({ tipo: 'film', chiave: 'cinema-le-sedici-domande', avanzamento: 0 });
    expect(valuta()).toBe('bloccato');
  });

  it('conta rivisioni cinema oltre la prima senza alterare il completamento', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Cinema' })).body.data as { id: number }).id;
    const url = `/api/partite/${id}/letture`;
    const f = (await request(app).put(url).send({ tipo: 'film', chiave: 'cinema-le-sedici-domande', avanzamento: 4 })).body.data as FilmDto;
    expect(f).toMatchObject({ progresso: 4, totaleSessioni: 1, iniziato: true, fatto: true });
    const d = (await request(app).get(`/api/compendio/film?partita=${id}`)).body.data as FilmDvdDto;
    expect(d).toMatchObject({ iniziati: 1, completati: 1, sessioniCompletamentoFatte: 1, sessioniObiettivo: 42, visioniRegistrate: 4 });
    const vecchio = (await request(app).get(`/api/compendio/attivita?partita=${id}`)).body.data as AttivitaTutteDto;
    expect(vecchio.filmVisti).toBe(1);
  });

  it('mantiene compatibilità con fatto e non applica automaticamente punti alle Doti', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Compatibilità' })).body.data as { id: number }).id;
    const url = `/api/partite/${id}/letture`;
    const prima = getDb().prepare('SELECT COALESCE(SUM(punti),0) totale FROM dote_sociale_partita WHERE partita_id=?').get(id) as { totale: number };
    let f = (await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', fatto: true })).body.data as FilmDto;
    expect(f).toMatchObject({ progresso: 2, fatto: true });
    f = (await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', fatto: false })).body.data as FilmDto;
    expect(f).toMatchObject({ progresso: 0, iniziato: false, fatto: false });
    const dopo = getDb().prepare('SELECT COALESCE(SUM(punti),0) totale FROM dote_sociale_partita WHERE partita_id=?').get(id) as { totale: number };
    expect(dopo).toEqual(prima);
  });

  it('rifiuta avanzamenti DVD oltre il totale, negativi, frazionari e contratti ambigui', async () => {
    const id = ((await request(app).post('/api/partite').send({ nome: 'Validazione film' })).body.data as { id: number }).id;
    const url = `/api/partite/${id}/letture`;
    expect((await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: 3 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: -1 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: 1.5 })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'film', chiave: 'dvd-wraith', avanzamento: 1, fatto: false })).status).toBe(400);
    expect((await request(app).put(url).send({ tipo: 'film', chiave: 'inesistente', avanzamento: 1 })).status).toBe(404);
  });

  it('isola le partite, è idempotente e conserva il progresso al reseed', async () => {
    const id1 = ((await request(app).post('/api/partite').send({ nome: 'Uno' })).body.data as { id: number }).id;
    const id2 = ((await request(app).post('/api/partite').send({ nome: 'Due' })).body.data as { id: number }).id;
    const payload = { tipo: 'film', chiave: 'dvd-wraith', avanzamento: 2 };
    await request(app).put(`/api/partite/${id1}/letture`).send(payload);
    await request(app).put(`/api/partite/${id1}/letture`).send(payload);
    let storico = (await request(app).get(`/api/partite/${id1}/storico?tipi=lettura`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
    expect(((await request(app).get(`/api/compendio/film?partita=${id2}`)).body.data as FilmDvdDto).iniziati).toBe(0);
    ricaricaPacchetto(getDb());
    expect(((await request(app).get(`/api/compendio/film?partita=${id1}`)).body.data as FilmDvdDto).film.find((f) => f.chiave === 'dvd-wraith')?.progresso).toBe(2);
    await request(app).put(`/api/partite/${id1}/letture`).send({ ...payload, avanzamento: 0 });
    storico = (await request(app).get(`/api/partite/${id1}/storico?tipi=lettura`)).body.data as StoricoDto;
    expect(storico.totale).toBe(1);
  });
});
