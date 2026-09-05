// ============================================================
// Test API catalogo e agenda (Fase 16.1): righe aggiunte o corrette dall'utente che sopravvivono al reseed, eventi e cose da fare del giorno
// ============================================================

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AgendaGiornoDto, ElementoCatalogoDto, NegozioDettaglioDto, NegozioRiassuntoDto, RiepilogoCatalogoDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

describe('API catalogo e agenda (Fase 16.1)', () => {
  let partitaId = 0;
  beforeAll(async () => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
    invalidaCacheTraduzioni();
    partitaId = ((await request(app).post('/api/partite').send({ nome: 'Catalogo' })).body.data as { id: number }).id;
  });
  afterAll(() => closeDb());

  it('crea un negozio e un suo articolo: compaiono nelle pagine della Guida e sopravvivono a un nuovo caricamento del seed', async () => {
    const creato = await request(app).post('/api/catalogo/negozio').send({
      nome: 'Negozio di retrogaming Super Baron', luogo: 'Akihabara', luogo_chiave: 'akihabara', tipo: 'oggetti',
      sblocco: 'dal 1 settembre', fonte: 'https://www.allgamestaff.it/persona-5-royal/videogiochi/',
    });
    expect(creato.status).toBe(201);
    const negozio = creato.body.data as ElementoCatalogoDto;
    expect(negozio).toMatchObject({ tipo: 'negozio', origine: 'utente', modificata: false, nascosta: false });
    expect(negozio.chiave).toBe('u-negozio-di-retrogaming-super-baron');

    const articolo = (await request(app).post('/api/catalogo/articolo').send({
      negozio_chiave: negozio.chiave, nome: 'Featherman Seeker', categoria: 'altro', prezzo: 5000,
      effetto: 'Videogioco: aumenta Conoscenza', disponibile_dal: 'dal 1 settembre',
    })).body.data as ElementoCatalogoDto;
    expect(articolo.chiave).toBe(`${negozio.chiave}/u-featherman-seeker`);

    // il negozio è nell'elenco della Guida con il suo articolo
    const elenco = (await request(app).get('/api/compendio/negozi')).body.data as NegozioRiassuntoDto[];
    const nostro = elenco.find((n) => n.chiave === negozio.chiave)!;
    expect(nostro).toMatchObject({ nome: 'Negozio di retrogaming Super Baron', quartiereNome: 'Akihabara', articoli: 1 });
    const scheda = (await request(app).get(`/api/compendio/negozi/${negozio.chiave}`)).body.data as NegozioDettaglioDto;
    expect(scheda.articoliElenco.map((a) => a.nome)).toEqual(['Featherman Seeker']);

    // reseed forzato: le righe dell'utente restano, quelle del seed vengono comunque aggiornate
    caricaSeed(initDb(), DIR_SEED, true);
    expect((prepared('SELECT COUNT(*) AS n FROM negozio WHERE chiave = ?').get(negozio.chiave) as { n: number }).n).toBe(1);
    expect((prepared('SELECT COUNT(*) AS n FROM articolo WHERE chiave = ?').get(articolo.chiave) as { n: number }).n).toBe(1);
    expect((prepared("SELECT COUNT(*) AS n FROM negozio WHERE origine = 'seed'").get() as { n: number }).n).toBeGreaterThan(40);
  });

  it('corregge una riga del seed conservando l’originale, la nasconde e la ripristina', async () => {
    const prima = (await request(app).get('/api/catalogo/negozio/untouchable')).body.data as ElementoCatalogoDto;
    expect(prima).toMatchObject({ origine: 'seed', modificata: false });
    const nomeSeed = prima.dati.nome as string;

    const corretto = (await request(app).put('/api/catalogo/negozio/untouchable').send({ nome: 'Untouchable (armeria di Iwai)', note: 'Corretto da me' })).body.data as ElementoCatalogoDto;
    expect(corretto).toMatchObject({ origine: 'utente', modificata: true });
    expect(corretto.dati.nome).toBe('Untouchable (armeria di Iwai)');
    // il reseed non riporta indietro la correzione
    caricaSeed(initDb(), DIR_SEED, true);
    expect((prepared('SELECT nome FROM negozio WHERE chiave = ?').get('untouchable') as { nome: string }).nome).toBe('Untouchable (armeria di Iwai)');

    const nascosto = (await request(app).put('/api/catalogo/negozio/untouchable/nascosta').send({ nascosta: true })).body.data as ElementoCatalogoDto;
    expect(nascosto.nascosta).toBe(true);

    const esito = (await request(app).delete('/api/catalogo/negozio/untouchable')).body.data as { esito: string; elemento: ElementoCatalogoDto };
    expect(esito.esito).toBe('ripristinata');
    expect(esito.elemento).toMatchObject({ origine: 'seed', modificata: false, nascosta: false });
    expect(esito.elemento.dati.nome).toBe(nomeSeed);
  });

  it('rifiuta riferimenti inesistenti e riporta il riepilogo per tipo', async () => {
    expect((await request(app).post('/api/catalogo/negozio').send({ nome: 'Fantasma', luogo_chiave: 'quartiere-che-non-esiste' })).status).toBe(400);
    expect((await request(app).post('/api/catalogo/articolo').send({ negozio_chiave: 'negozio-che-non-esiste', nome: 'Nulla' })).status).toBe(400);
    expect((await request(app).post('/api/catalogo/negozio').send({ nome: '' })).status).toBe(400);
    const riepilogo = (await request(app).get('/api/catalogo')).body.data as RiepilogoCatalogoDto;
    const negozi = riepilogo.perTipo.find((t) => t.tipo === 'negozio')!;
    expect(negozi.creati).toBe(1);
    expect(negozi.totale).toBeGreaterThan(40);
  });

  it('elimina davvero una riga creata dall’utente, con i suoi articoli', async () => {
    const n = (await request(app).post('/api/catalogo/negozio').send({ nome: 'Bancarella di prova' })).body.data as ElementoCatalogoDto;
    const a = (await request(app).post('/api/catalogo/articolo').send({ negozio_chiave: n.chiave, nome: 'Oggetto di prova' })).body.data as ElementoCatalogoDto;
    expect((await request(app).delete(`/api/catalogo/negozio/${n.chiave}`)).body.data).toMatchObject({ esito: 'eliminata' });
    expect((await request(app).get(`/api/catalogo/negozio/${n.chiave}`)).status).toBe(404);
    // gli articoli se ne vanno con il negozio (chiave esterna a cascata)
    expect((prepared('SELECT COUNT(*) AS n FROM articolo WHERE chiave = ?').get(a.chiave) as { n: number }).n).toBe(0);
  });

  it('agenda: eventi e cose da fare di un giorno, globali o della sola partita, con la spunta', async () => {
    const evento = (await request(app).post('/api/catalogo/agenda/eventi').send({ data: '05-19', tipo: 'promemoria', titolo: 'Quiz televisivo al Leblanc', dettaglio: 'Risposta: Produrre rumori molesti' })).body.data as { id: number; partitaId: number | null };
    expect(evento.partitaId).toBeNull();
    const azione = (await request(app).post('/api/catalogo/agenda/azioni').send({ data: '05-19', fascia: 'sera', tipo: 'attivita', azione: 'Guardare il quiz in TV', partitaId, note: 'Conoscenza +1' })).body.data as { id: number; fatta: boolean };
    expect(azione.fatta).toBe(false);

    const agenda = (await request(app).get(`/api/catalogo/agenda/05-19?partita=${partitaId}`)).body.data as AgendaGiornoDto;
    expect(agenda.eventi.map((e) => e.titolo)).toEqual(['Quiz televisivo al Leblanc']);
    expect(agenda.azioni.map((a) => a.azione)).toEqual(['Guardare il quiz in TV']);
    // senza partita si vedono solo le voci globali
    expect(((await request(app).get('/api/catalogo/agenda/05-19')).body.data as AgendaGiornoDto).azioni).toHaveLength(0);

    const fatta = (await request(app).put(`/api/catalogo/agenda/azioni/${azione.id}/fatta`).send({ partita: partitaId, fatta: true })).body.data as { fatta: boolean };
    expect(fatta.fatta).toBe(true);
    expect(((await request(app).get(`/api/catalogo/agenda/05-19?partita=${partitaId}`)).body.data as AgendaGiornoDto).azioni[0].fatta).toBe(true);
    expect(((await request(app).get(`/api/catalogo/agenda?partita=${partitaId}`)).body.data as { giorni: string[] }).giorni).toContain('05-19');

    // modifica e cancellazione
    expect(((await request(app).put(`/api/catalogo/agenda/eventi/${evento.id}`).send({ titolo: 'Quiz TV' })).body.data as { titolo: string }).titolo).toBe('Quiz TV');
    expect((await request(app).delete(`/api/catalogo/agenda/eventi/${evento.id}`)).status).toBe(204);
    expect((await request(app).delete(`/api/catalogo/agenda/azioni/${azione.id}`)).status).toBe(204);
    expect(((await request(app).get(`/api/catalogo/agenda/05-19?partita=${partitaId}`)).body.data as AgendaGiornoDto).eventi).toHaveLength(0);
  });

  it('agenda: rifiuta date fuori dal calendario e partite inesistenti', async () => {
    expect((await request(app).post('/api/catalogo/agenda/eventi').send({ data: '02-31', titolo: 'Mai' })).status).toBe(400);
    expect((await request(app).post('/api/catalogo/agenda/eventi').send({ data: '13-01', titolo: 'Mai' })).status).toBe(400);
    expect((await request(app).post('/api/catalogo/agenda/azioni').send({ data: '05-19', azione: 'Mai', partitaId: 9999 })).status).toBe(404);
  });
});
