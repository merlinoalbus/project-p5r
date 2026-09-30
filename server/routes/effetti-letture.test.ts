// ============================================================
// Test API — leggere, vedere e giocare dicono le Doti che il gioco dà; le Doti si segnano a mano
// ============================================================
//
// Storia: cinque visioni di un film che dà «Coraggio ♪♪♪» lasciavano Coraggio a zero, perché
// `impostaLettura` scriveva l'avanzamento e nient'altro; da allora il conseguimento alzava le Doti.
// Poi la scelta dell'utente (2026-09-30): «fai che i punti Doti Sociali li sposto solo io manualmente e
// non automaticamente», con promemoria. Il conseguimento non tocca più le Doti: le **dice**
// (`daSegnare` nella risposta) e le registra, per sapere che cosa ricordare. Le cose che si rompono
// facilmente restano le stesse, e si sorvegliano sul promemoria:
//
//  1. **il bonus del libro** — tre note lette in un libro valgono il quarto scalino (7 punti invece di 5);
//  2. **prima volta contro volte successive** — al cinema la guida dichiara quanto vale rivederlo, e chi
//     disfa una visione toglie **l'ultima** (il promemoria in negativo dice quella), non la prima;
//  3. **niente di retroattivo** — un film che non dichiara le visioni successive non ne dà, e ciò che
//     era stato registrato resta quello anche se il mondo cambia in mezzo.

import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import type { CruciverbaDto, DoteDaSegnareDto, DoteSocialePartitaDto, LibriDto, FilmDvdDto } from '../../shared/types.js';

const app = createApp();

// a metà maggio libri e film usati qui sono disponibili: una lettura bloccata dalla guida non si registra (409)
const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome, dataGioco: '05-15' })).body.data as { id: number }).id;
const punti = async (id: number, dote: string) =>
  ((await request(app).get(`/api/partite/${id}/doti`)).body.data as DoteSocialePartitaDto[]).find((d) => d.chiave === dote)!.punti;
const segna = async (id: number, tipo: string, chiave: string, avanzamento: number) =>
  ((await request(app).put(`/api/partite/${id}/letture`).send({ tipo, chiave, avanzamento }).expect(200)).body.data as { daSegnare?: DoteDaSegnareDto[] }).daSegnare ?? [];
const delta = (lista: DoteDaSegnareDto[], dote: string) => lista.find((d) => d.chiave === dote)?.delta ?? 0;

describe('API — il conseguimento dice le Doti, non le tocca', () => {
  beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); });
  afterAll(() => closeDb());

  it('un libro finito dice i suoi punti, col bonus del libro sulle tre note; disfarlo dice di toglierli', async () => {
    const id = await nuovaPartita('Effetti libro');
    const libri = (await request(app).get('/api/compendio/libri')).body.data as LibriDto;
    const l = libri.libri.find((x) => x.dote === 'conoscenza' && x.note === 3)!;

    // A metà non è ancora un conseguimento: niente da segnare.
    if (l.totaleSessioni > 1) expect(await segna(id, 'libro', l.chiave, l.totaleSessioni - 1)).toEqual([]);
    // Tre note lette in un libro sono il quarto scalino: 7, non 5.
    expect(await segna(id, 'libro', l.chiave, l.totaleSessioni)).toEqual([{ chiave: 'conoscenza', nome: 'Conoscenza', delta: 7 }]);
    expect(await punti(id, 'conoscenza')).toBe(0);
    // Disfare dice esattamente quel che dava, in negativo; le Doti restano come l'utente le ha segnate.
    expect(await segna(id, 'libro', l.chiave, 0)).toEqual([{ chiave: 'conoscenza', nome: 'Conoscenza', delta: -7 }]);
    expect(await punti(id, 'conoscenza')).toBe(0);
  });

  it('al cinema la prima visione vale più delle successive, e si disfa l’ultima', async () => {
    const id = await nuovaPartita('Effetti cinema');
    const film = (await request(app).get('/api/compendio/film')).body.data as FilmDvdDto;
    const f = film.film.find((x) => x.dove === 'cinema' && x.dote && x.note === 3 && x.noteSuccessive === 1)!;
    expect(f, 'serve almeno un film al cinema con le visioni successive dichiarate').toBeTruthy();

    // 3 note = 5 punti la prima volta; 1 nota = 2 punti ognuna delle due dopo.
    expect(delta(await segna(id, 'film', f.chiave, 3), f.dote!)).toBe(9);
    // Tolte due visioni successive: si tolgono i loro 2 + 2, non i 5 della prima.
    expect(delta(await segna(id, 'film', f.chiave, 1), f.dote!)).toBe(-4);
    expect(delta(await segna(id, 'film', f.chiave, 0), f.dote!)).toBe(-5);
    expect(await punti(id, f.dote!)).toBe(0);
  });

  it('un film che non dichiara le visioni successive non ne dà', async () => {
    const id = await nuovaPartita('Effetti senza successive');
    const film = (await request(app).get('/api/compendio/film')).body.data as FilmDvdDto;
    const f = film.film.find((x) => x.dove === 'cinema' && x.dote && x.note && !x.noteSuccessive);
    if (!f) return; // se un giorno tutti li dichiarano, questa prova non ha più un caso da coprire
    expect(delta(await segna(id, 'film', f.chiave, 1), f.dote!)).toBeGreaterThan(0);
    expect(await segna(id, 'film', f.chiave, 4)).toEqual([]);
  });

  it('ciò che è stato registrato resta quello anche se il mondo cambia in mezzo', async () => {
    const id = await nuovaPartita('Effetti stabili');
    const film = (await request(app).get('/api/compendio/film')).body.data as FilmDvdDto;
    const f = film.film.find((x) => x.dove === 'dvd' && x.dote && x.note)!;
    const dati = delta(await segna(id, 'film', f.chiave, f.totaleSessioni), f.dote!);
    expect(dati).toBeGreaterThan(0);
    // «Anima da cineasta» alza di uno scalino film e DVD da qui in avanti, non all'indietro: disfare
    // dice di togliere quel che era stato detto, non un ricalcolo più alto.
    getDb().prepare("INSERT INTO lettura_partita (partita_id, tipo, chiave, updated_at) VALUES (?, 'libro', 'anima-da-cineasta', ?)").run(id, new Date().toISOString());
    expect(delta(await segna(id, 'film', f.chiave, 0), f.dote!)).toBe(-dati);
    expect(await punti(id, f.dote!)).toBe(0);
  });
});

/* Il cruciverba di Leblanc dà una nota di Conoscenza: la risposta la ricorda, le Doti si segnano a mano. */
describe('API — il cruciverba ricorda la sua nota di Conoscenza', () => {
  beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); });
  afterAll(() => closeDb());

  it('risolverne uno la ricorda una volta; le Doti non si toccano né risolvendo né togliendo', async () => {
    const id = await nuovaPartita('Cruciverba');
    const tutti = (await request(app).get('/api/compendio/cruciverba')).body.data as { cruciverba: Array<{ giorno: string }> };
    const g = tutti.cruciverba[0].giorno;
    const spunta = async (fatto: boolean) => (await request(app).put(`/api/partite/${id}/cruciverba`).send({ data: g, fatto }).expect(200)).body.data as CruciverbaDto;

    // Una nota è il primo scalino: 2 punti.
    expect((await spunta(true)).daSegnare).toEqual([{ chiave: 'conoscenza', nome: 'Conoscenza', delta: 2, note: 1 }]);
    expect(await punti(id, 'conoscenza')).toBe(0);
    // Rispuntarlo non la ricorda di nuovo: è già risolto.
    expect((await spunta(true)).daSegnare).toBeUndefined();
    expect((await spunta(false)).daSegnare).toBeUndefined();
    expect(await punti(id, 'conoscenza')).toBe(0);
  });
});
