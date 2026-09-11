import request from 'supertest';
import path from 'node:path';
import { createApp } from '../bootstrap.js';
import { initDb, closeDb, prepared } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { valutaRequisiti, statoDisponibilitaPartita } from '../services/disponibilitaService.js';
import { descriviRequisitoSpillo, normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
const app = createApp(); let partita: number;
beforeEach(async () => { const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, path.resolve(import.meta.dirname, '../../data/seed')); partita = (await request(app).post('/api/partite').send({ nome: 'Regole' })).body.data.id; });
afterEach(() => closeDb());
const valuta = (r: RequisitoSpillo[]) => valutaRequisiti(r.map((c) => ({ ...c, testo: descriviRequisitoSpillo(c) })), statoDisponibilitaPartita(partita));

it('gli elenchi dell\'editor sono chiusi e completi: niente stati a nome libero', async () => {
  const e = (await request(app).get('/api/condizioni/elenchi')).body.data;
  expect(e.stati).toBeUndefined();
  expect(e.eventi.map((x: { chiave: string }) => x.chiave)).toContain('mansarda-pulita');
  expect(e.contatori.map((x: { chiave: string }) => x.chiave)).toEqual(['film-completati', 'videogiochi-completati', 'libri-letti']);
  expect(e.attivita.some((a: { chiave: string }) => a.chiave === 'biliardo')).toBe(true);
  expect(e.negozi.some((n: { chiave: string }) => n.chiave === 'tanaka-affari-loschi')).toBe(true);
  expect(e.squadra.length).toBeGreaterThan(5);
  expect((await request(app).post('/api/condizioni/stati').send({ nome: 'Pesca effettuata', categoria: 'attivita' })).status).toBe(404);
});

it('eventi, attività svolte e punti negozio: segnati per partita, letti dalle condizioni, isolati fra partite', async () => {
  const evento: RequisitoSpillo = { tipo: 'evento', evento: 'mansarda-pulita' };
  const biliardo: RequisitoSpillo = { tipo: 'attivita', attivita: 'biliardo', volte: 2 };
  const punti: RequisitoSpillo = { tipo: 'punti-negozio', negozio: 'vestiti-usati-kichijoji', punti: 50 };
  expect(valuta([evento]).stato).toBe('bloccato');
  expect(valuta([{ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'dote', dote: 'coraggio', rango: 1 }, evento] }]).stato).toBe('disponibile');
  expect(valuta([{ tipo: 'non', condizione: evento }]).stato).toBe('disponibile');
  const p1 = await request(app).put(`/api/condizioni/partite/${partita}/eventi/mansarda-pulita`).send({ avvenuto: true });
  expect(p1.status).toBe(200);
  expect(p1.body.data.eventi.find((x: { chiave: string }) => x.chiave === 'mansarda-pulita').avvenuto).toBe(true);
  expect(valuta([evento]).stato).toBe('disponibile');
  expect(valuta([{ tipo: 'non', condizione: evento }]).stato).toBe('bloccato');
  expect((await request(app).put(`/api/condizioni/partite/${partita}/eventi/inesistente`).send({ avvenuto: true })).status).toBe(404);

  expect(valuta([biliardo]).stato).toBe('bloccato');
  await request(app).put(`/api/condizioni/partite/${partita}/attivita/biliardo`).send({ volte: 1 });
  expect(valuta([biliardo]).stato).toBe('bloccato');
  await request(app).put(`/api/condizioni/partite/${partita}/attivita/biliardo`).send({ volte: 2 });
  expect(valuta([biliardo]).stato).toBe('disponibile');
  expect((await request(app).put(`/api/condizioni/partite/${partita}/attivita/biliardo`).send({ volte: -1 })).status).toBe(400);

  expect(valuta([punti]).stato).toBe('bloccato');
  await request(app).put(`/api/condizioni/partite/${partita}/punti-negozio/vestiti-usati-kichijoji`).send({ punti: 60 });
  expect(valuta([punti]).stato).toBe('disponibile');

  const altra = (await request(app).post('/api/partite').send({ nome: 'Altra' })).body.data.id;
  const progressi = (await request(app).get(`/api/condizioni/partite/${altra}/progressi`)).body.data;
  expect(progressi.eventi.every((x: { avvenuto: boolean }) => !x.avvenuto)).toBe(true);
  expect(progressi.attivita.find((x: { chiave: string }) => x.chiave === 'biliardo').volte).toBe(0);
});

it('il grado cliente si calcola dalla spesa segnata nel negozio', () => {
  const oscuro: RequisitoSpillo = { tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'oscuro' };
  expect(valuta([oscuro]).stato).toBe('bloccato');
  // Magic Rosary ¥50.000: da solo porta al grado Oscuro
  prepared('INSERT INTO acquisto_partita VALUES(?,?,?)').run(partita, 'tanaka-affari-loschi/magic-rosary', 'oggi');
  expect(valuta([oscuro]).stato).toBe('disponibile');
  expect(valuta([{ tipo: 'rango-cliente', negozio: 'tanaka-affari-loschi', rango: 'caos' }]).stato).toBe('bloccato');
});

it('un negozio bloccato resta consultabile ma non permette acquisti', async () => {
  const n = (await request(app).post('/api/catalogo/negozio').send({ nome: 'Negozio test', condizioni_json: [{ tipo: 'dote', dote: 'coraggio', rango: 5 }] })).body.data;
  const a = (await request(app).post('/api/catalogo/articolo').send({ nome: 'Prodotto test', negozio_chiave: n.chiave, condizioni_json: [] })).body.data;
  const elenco = (await request(app).get(`/api/compendio/negozi?partita=${partita}`)).body.data;
  const scheda = await request(app).get(`/api/compendio/negozi/${n.chiave}?partita=${partita}`);
  const ricerca = (await request(app).get(`/api/compendio/articoli?q=Prodotto%20test&partita=${partita}`)).body.data;
  expect(elenco.find((x: { chiave: string }) => x.chiave === n.chiave)).toMatchObject({ disponibilita: { stato: 'bloccato' } });
  expect(scheda.status).toBe(200);
  expect(scheda.body.data).toMatchObject({ chiave: n.chiave, disponibilita: { stato: 'bloccato' } });
  expect(ricerca).toMatchObject({ totale: 1, articoli: [{ chiave: a.chiave, disponibilita: { stato: 'bloccato' } }] });
  const acquisto = await request(app).put(`/api/partite/${partita}/acquisti`).send({ articolo: a.chiave, fatto: true });
  expect(acquisto.status).toBe(409);
  expect(acquisto.body.error?.code).toBe('articolo-non-disponibile');
  // una condizione che cita una chiave assente dalla Guida non si salva
  expect((await request(app).put(`/api/catalogo/articolo/${encodeURIComponent(a.chiave)}`).send({ condizioni_json: [{ tipo: 'attivita', attivita: 'inesistente', volte: 1 }] })).status).toBe(404);
  expect((await request(app).put(`/api/catalogo/articolo/${encodeURIComponent(a.chiave)}`).send({ condizioni_json: [{ tipo: 'gruppo', modo: 'tutte', condizioni: [] }] })).status).toBe(400);
});

it('articoli ottenuti e letture usano dati reali della partita', () => {
  const a = prepared('SELECT chiave FROM articolo LIMIT 1').get() as { chiave: string };
  expect(valuta([{ tipo: 'articolo', articolo: a.chiave }]).stato).toBe('bloccato');
  prepared('INSERT INTO acquisto_partita VALUES(?,?,?)').run(partita, a.chiave, 'oggi');
  expect(valuta([{ tipo: 'articolo', articolo: a.chiave }]).stato).toBe('disponibile');
  prepared('INSERT INTO lettura_partita VALUES(?,?,?,?)').run(partita, 'libro', 'un-libro', 'oggi');
  expect(valuta([{ tipo: 'lettura', categoria: 'libro', chiave: 'un-libro' }]).stato).toBe('disponibile');
});

it('la normalizzazione accetta NON a qualsiasi profondità e rifiuta i tipi che non esistono più', () => {
  expect(normalizzaRequisitoSpillo({ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'non', condizione: { tipo: 'piove' } }, { tipo: 'dote', dote: 'coraggio', rango: 1 }] })).toEqual({ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'non', condizione: { tipo: 'piove' } }, { tipo: 'dote', dote: 'coraggio', rango: 1 }] });
  expect(normalizzaRequisitoSpillo({ tipo: 'gruppo', modo: 'almeno-una', condizioni: [{ tipo: 'dote', dote: 'coraggio', rango: 3 }, { tipo: 'sbagliato' }] })).toBeNull();
  expect(normalizzaRequisitoSpillo({ tipo: 'da-configurare', nota: 'qualcosa' })).toBeNull();
  expect(normalizzaRequisitoSpillo({ tipo: 'stato', chiave: 'x', confronto: 'almeno', valore: 1 })).toBeNull();
});

it('le richieste dentro gruppi usano la chiave stabile e i dati della partita', () => {
  const r = prepared('SELECT chiave,nome FROM richiesta LIMIT 1').get() as { chiave: string; nome: string };
  const st = statoDisponibilitaPartita(partita); st.richiesteCompletate.add(r.nome);
  const c: RequisitoSpillo = { tipo: 'gruppo', modo: 'tutte', condizioni: [{ tipo: 'richiesta', richiesta: r.chiave }] };
  expect(valutaRequisiti([{ ...c, testo: descriviRequisitoSpillo(c) }], st).stato).toBe('disponibile');
});

it('una condizione importata con riferimento mancante sparisce (contata), e lo spillo resta disponibile', async () => {
  const m = (await request(app).post('/api/mappe').send({ chiave: 'vincolo-mancante', nome: 'Vincolo mancante', tipo: 'area' })).body.data;
  const p = (await request(app).get(`/api/mappe/esporta?radice=${m.chiave}`)).body.data;
  expect(p.stati).toBeUndefined();
  p.mappe[0].spilli = [{ tipo: 'nota', nome: 'Vincolo', x: 1, y: 1, condizioni: [{ tipo: 'attivita', attivita: 'non-esiste', volte: 1 }, { tipo: 'piove' }] }];
  const esito = await request(app).post('/api/mappe/importa').send({ pacchetto: p, sovrascrivi: true });
  expect(esito.status).toBe(200);
  expect(esito.body.data.condizioniScartate).toBe(1);
  const s = (await request(app).get(`/api/mappe/${m.chiave}?partita=${partita}`)).body.data.spilli[0];
  expect(s.condizioni.map((c: { tipo: string }) => c.tipo)).toEqual(['piove']);
});

it('il valutatore dei quartieri usa il dato materializzato anche se il testo cambia', () => {
  prepared("UPDATE quartiere SET sblocco_data='04-01',sblocco='31 dicembre' WHERE chiave='akihabara'").run();
  expect(valuta([{ tipo: 'quartiere', quartiere: 'akihabara' }]).stato).toBe('disponibile');
});

it('un pacchetto oltre 20 condizioni viene scartato per intero, senza lasciare testo', async () => {
  const m = (await request(app).post('/api/mappe').send({ chiave: 'troppi-vincoli', nome: 'Troppi vincoli', tipo: 'area' })).body.data;
  const p = (await request(app).get('/api/mappe/esporta?radice=' + m.chiave)).body.data;
  const condizioni: RequisitoSpillo[] = Array.from({ length: 20 }, (_, i) => ({ tipo: 'data', dal: '04-' + String(i + 1).padStart(2, '0') }));
  condizioni.push({ tipo: 'non', condizione: { tipo: 'dote', dote: 'coraggio', rango: 1 } });
  p.mappe[0].spilli = [{ tipo: 'nota', nome: 'Vincolo', x: 1, y: 1, condizioni }];
  expect((await request(app).post('/api/mappe/importa').send({ pacchetto: p, sovrascrivi: true })).status).toBe(200);
  const s = (await request(app).get('/api/mappe/' + m.chiave + '?partita=' + partita)).body.data.spilli[0];
  expect(s.condizioni).toEqual([]);
  expect(s.disponibilita).toEqual({ stato: 'disponibile', requisiti: [] });
});
