// ============================================================
// Test API catalogo (Fase 16.1): righe aggiunte o corrette dall'utente che sopravvivono al reseed (l'agenda del giorno è ora nella giornata)
// ============================================================

import request from 'supertest';
import { closeDb, initDb, prepared } from '../db/dbService.js';
import { ricaricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import type { ElementoCatalogoDto, NegozioDettaglioDto, NegozioRiassuntoDto, RiepilogoCatalogoDto } from '../../shared/types.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

describe('API catalogo (Fase 16.1)', () => {
  /** Il pacchetto è la fotografia dell'istanza: porta già i negozi creati dall'app, e i conteggi partono da lì. */
  let creatiNelPacchetto = 0;
  beforeAll(() => {
    dbDiProva();
    creatiNelPacchetto = (prepared("SELECT COUNT(*) AS n FROM negozio WHERE origine = 'utente' AND seed_json IS NULL").get() as { n: number }).n;
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
    ricaricaPacchetto(initDb());
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
    ricaricaPacchetto(initDb());
    expect((prepared('SELECT nome FROM negozio WHERE chiave = ?').get('untouchable') as { nome: string }).nome).toBe('Untouchable (armeria di Iwai)');

    const nascosto = (await request(app).put('/api/catalogo/negozio/untouchable/nascosta').send({ nascosta: true })).body.data as ElementoCatalogoDto;
    expect(nascosto.nascosta).toBe(true);

    const risposta = await request(app).delete('/api/catalogo/negozio/untouchable');
    if (!risposta.body.data) throw new Error(`ripristino fallito: ${risposta.status} ${JSON.stringify(risposta.body)}`);
    const esito = risposta.body.data as { esito: string; elemento: ElementoCatalogoDto };
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
    // quelli del pacchetto più quello creato dal primo test
    expect(negozi.creati).toBe(creatiNelPacchetto + 1);
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

  it('corregge una domanda in classe e una riga del cruciverba: restano dopo un nuovo caricamento del seed', async () => {
    // È il caso per cui serve: hai risposto come diceva l'app e il gioco ti ha dato torto.
    const prima = (await request(app).get('/api/catalogo/domanda/04-12')).body.data as ElementoCatalogoDto;
    expect(prima).toMatchObject({ tipo: 'domanda', origine: 'seed', modificata: false });

    const corretta = await request(app).put('/api/catalogo/domanda/04-12').send({
      data: '04-12', tipo: 'classe', chi: 'Prof. Ushimaru', domanda: prima.dati.domanda as string,
      risposte_json: [{ ordine: 1, testo: 'Nemici' }, { ordine: 2, testo: 'Secondo passaggio' }],
      ricompensa: 'Conoscenza +1 nota', note: '', fonte: '',
    });
    expect(corretta.status).toBe(200);
    expect((corretta.body.data as ElementoCatalogoDto)).toMatchObject({ origine: 'utente', modificata: true });

    const cruci = await request(app).put('/api/catalogo/cruciverba/04-18-0').send({
      data: '04-18', indizio: 'Gli anni scolastici sono suddivisi in…?', risposta: 'Trimestri', fonte: '',
    });
    expect(cruci.status).toBe(200);

    // La pagina le mostra corrette, con la loro chiave per poterle correggere ancora.
    const domande = (await request(app).get('/api/compendio/domande')).body.data as { domande: Array<{ chiave: string | null; risposte: Array<{ testo: string }> }> };
    const nostra = domande.domande.find((d) => d.chiave === '04-12')!;
    expect(nostra.risposte.map((r) => r.testo)).toEqual(['Nemici', 'Secondo passaggio']);
    const tuttiCruci = (await request(app).get('/api/compendio/cruciverba')).body.data as { cruciverba: Array<{ chiave: string | null; risposta: string }> };
    expect(tuttiCruci.cruciverba.find((c) => c.chiave === '04-18-0')?.risposta).toBe('Trimestri');

    // Un nuovo caricamento del seed non le riporta indietro: è la garanzia del catalogo.
    ricaricaPacchetto(initDb());
    const dopo = (await request(app).get('/api/catalogo/domanda/04-12')).body.data as ElementoCatalogoDto;
    expect(dopo).toMatchObject({ origine: 'utente', modificata: true });
    expect(JSON.parse(String(dopo.dati.risposte_json)) as unknown[]).toHaveLength(2);
    expect(((await request(app).get('/api/catalogo/cruciverba/04-18-0')).body.data as ElementoCatalogoDto).dati.risposta).toBe('Trimestri');

    // E «Ripristina» rimette quel che diceva la guida.
    await request(app).delete('/api/catalogo/domanda/04-12');
    await request(app).delete('/api/catalogo/cruciverba/04-18-0');
    expect(((await request(app).get('/api/catalogo/domanda/04-12')).body.data as ElementoCatalogoDto).origine).toBe('seed');
  });

  it('l\'agenda del catalogo non c\'è più: eventi e cose da fare sono voci della giornata (`/api/compendio/percorso`)', async () => {
    // «agenda» non è un tipo del catalogo: le rotte generiche la rifiutano
    expect((await request(app).get('/api/catalogo/agenda/05-19')).status).toBe(400);
    expect((await request(app).post('/api/catalogo/agenda').send({ data: '05-19', azione: 'Mai' })).status).toBe(400);
  });
});
