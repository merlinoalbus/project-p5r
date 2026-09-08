// ============================================================
// Test API — leggere, vedere e giocare alzano davvero le Doti
// ============================================================
//
// Segnalato usando l'app: cinque visioni registrate di un film che dà «Coraggio ♪♪♪» hanno lasciato
// Coraggio a zero. I punti li toccavano soltanto tre posti — i pulsanti della scheda Doti, la
// risposta giusta in classe, e la spunta di un'azione nella guida del giorno — mentre
// `impostaLettura` scriveva l'avanzamento e nient'altro. La scheda prometteva un effetto che il
// tracciamento non applicava mai.
//
// Il trigger è il **conseguimento**, e qui si sorveglia che dia quel che deve e che lo restituisca
// identico. Le tre cose che si rompono facilmente:
//
//  1. **il bonus del libro** — tre note lette in un libro valgono il quarto scalino (7 punti invece
//     di 5). `puntiDaNote` lo sapeva già fare e nessuno glielo chiedeva, perché nessuno chiamava da
//     qui;
//  2. **prima volta contro volte successive** — al cinema un film si rivede, e la guida dichiara
//     riga per riga quanto vale rivederlo. Chi disfa una visione deve riavere indietro **l'ultima**,
//     non la prima: restituire 5 quando si toglie la terza visione sarebbe un regalo;
//  3. **niente di retroattivo e niente di dedotto** — un film che non dichiara le visioni successive
//     non ne dà, e questo è esattamente ciò che l'app faceva prima: nessuna partita esistente
//     cambia da sola.

import path from 'node:path';
import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { createApp } from '../bootstrap.js';
import type { DoteSocialePartitaDto, LibriDto, FilmDvdDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();

const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
const punti = async (id: number, dote: string) =>
  ((await request(app).get(`/api/partite/${id}/doti`)).body.data as DoteSocialePartitaDto[]).find((d) => d.chiave === dote)!.punti;
const segna = (id: number, tipo: string, chiave: string, avanzamento: number) =>
  request(app).put(`/api/partite/${id}/letture`).send({ tipo, chiave, avanzamento });

describe('API — le Doti salgono al conseguimento', () => {
  beforeAll(() => { const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, DIR_SEED); });
  afterAll(() => closeDb());

  it('un libro finito dà i suoi punti, col bonus del libro sulle tre note', async () => {
    const id = await nuovaPartita('Effetti libro');
    const libri = (await request(app).get('/api/compendio/libri')).body.data as LibriDto;
    const l = libri.libri.find((x) => x.dote === 'conoscenza' && x.note === 3)!;
    expect(await punti(id, 'conoscenza')).toBe(0);

    // A metà non è ancora un conseguimento: i punti arrivano quando il libro è finito.
    if (l.totaleSessioni > 1) {
      await segna(id, 'libro', l.chiave, l.totaleSessioni - 1);
      expect(await punti(id, 'conoscenza')).toBe(0);
    }
    await segna(id, 'libro', l.chiave, l.totaleSessioni);
    // Tre note lette in un libro sono il quarto scalino: 7, non 5.
    expect(await punti(id, 'conoscenza')).toBe(7);

    // Disfare restituisce esattamente quel che aveva dato.
    await segna(id, 'libro', l.chiave, 0);
    expect(await punti(id, 'conoscenza')).toBe(0);
  });

  it('al cinema la prima visione vale più delle successive, e si disfa l’ultima', async () => {
    const id = await nuovaPartita('Effetti cinema');
    const film = (await request(app).get('/api/compendio/film')).body.data as FilmDvdDto;
    const f = film.film.find((x) => x.dove === 'cinema' && x.dote && x.note === 3 && x.noteSuccessive === 1)!;
    expect(f, 'serve almeno un film al cinema con le visioni successive dichiarate').toBeTruthy();

    await segna(id, 'film', f.chiave, 3);
    // 3 note = 5 punti la prima volta; 1 nota = 2 punti ognuna delle due dopo.
    expect(await punti(id, f.dote!)).toBe(9);

    await segna(id, 'film', f.chiave, 1);
    // Tolte due visioni successive: restano i 5 della prima, non una media né la prima restituita.
    expect(await punti(id, f.dote!)).toBe(5);

    await segna(id, 'film', f.chiave, 0);
    expect(await punti(id, f.dote!)).toBe(0);
  });

  it('un film che non dichiara le visioni successive non ne dà: nessuna partita cambia da sola', async () => {
    const id = await nuovaPartita('Effetti senza successive');
    const film = (await request(app).get('/api/compendio/film')).body.data as FilmDvdDto;
    const f = film.film.find((x) => x.dove === 'cinema' && x.dote && x.note && !x.noteSuccessive);
    if (!f) return; // se un giorno tutti li dichiarano, questa prova non ha più un caso da coprire
    await segna(id, 'film', f.chiave, 1);
    const dopoUna = await punti(id, f.dote!);
    await segna(id, 'film', f.chiave, 4);
    expect(await punti(id, f.dote!)).toBe(dopoUna);
  });

  it('i punti dati restano quelli anche se il mondo cambia in mezzo', async () => {
    const id = await nuovaPartita('Effetti stabili');
    const film = (await request(app).get('/api/compendio/film')).body.data as FilmDvdDto;
    const f = film.film.find((x) => x.dove === 'dvd' && x.dote && x.note)!;
    await segna(id, 'film', f.chiave, f.totaleSessioni);
    const dati = await punti(id, f.dote!);

    // «Anima da cineasta» alza di uno scalino i punti di film e DVD: da qui in avanti, non
    // all'indietro. Se il ritorno fosse un ricalcolo, disfare restituirebbe più di quel che aveva
    // dato e la partita si ritroverebbe punti dal nulla.
    getDb().prepare("INSERT INTO lettura_partita (partita_id, tipo, chiave, updated_at) VALUES (?, 'libro', 'anima-da-cineasta', ?)").run(id, new Date().toISOString());
    await segna(id, 'film', f.chiave, 0);
    expect(await punti(id, f.dote!)).toBe(0);
    expect(dati).toBeGreaterThan(0);
  });
});

/* Il cruciverba di Leblanc aveva lo stesso difetto, e in forma più netta: l'evento nello storico
 * diceva «Conoscenza +1 nota» e i punti restavano dov'erano. Scrivere una promessa senza mantenerla
 * è peggio che non scriverla, perché chi legge lo storico ci conta. */
describe('API — il cruciverba dà la sua nota di Conoscenza', () => {
  beforeAll(() => { const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, DIR_SEED); });
  afterAll(() => closeDb());

  it('risolverne uno alza Conoscenza, e toglierlo la riporta indietro', async () => {
    const id = await nuovaPartita('Cruciverba');
    const tutti = (await request(app).get('/api/compendio/cruciverba')).body.data as { cruciverba: Array<{ giorno: string }> };
    const g = tutti.cruciverba[0].giorno;
    expect(await punti(id, 'conoscenza')).toBe(0);

    await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: g, fatto: true });
    // Una nota è il primo scalino: 2 punti.
    expect(await punti(id, 'conoscenza')).toBe(2);

    // Rispuntarlo non raddoppia: è già risolto.
    await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: g, fatto: true });
    expect(await punti(id, 'conoscenza')).toBe(2);

    await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: g, fatto: false });
    expect(await punti(id, 'conoscenza')).toBe(0);
  });
});
