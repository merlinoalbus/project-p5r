// ============================================================
// Test API — il denaro del gruppo e i livelli dei Ladri Fantasma
// ============================================================
//
// Chiesto dall'utente: tenere traccia dei yen e di livello ed esperienza del protagonista e della
// squadra. Della partita si sapeva una cosa sola, `livello_protagonista`, e per un altro motivo —
// serve alla fusione per sapere quali Persona si possono evocare.
//
// Le cose che questa prova sorveglia sono quelle che si rompono in silenzio:
//
//  1. **chi è la squadra lo dice il seed**, non un elenco scritto nel servizio: due elenchi da
//     tenere allineati a memoria è il modo in cui divergono;
//  2. **il non segnato non è uno zero** — un membro senza riga è uno di cui non hai scritto niente,
//     e la scheda deve poterlo dire invece di mostrare un livello che non hai mai confermato;
//  3. **Joker ha due case per lo stesso numero**, qui e in `partita.livello_protagonista`, che la
//     fusione legge: se divergono, l'app propone Persona che non puoi evocare — o te ne nasconde di
//     evocabili — e nessuno dei due errori si vede finché non serve.

import path from 'node:path';
import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { runMigrations } from '../db/migrationRunner.js';
import { caricaSeed } from '../services/seed/caricaSeed.js';
import { createApp } from '../bootstrap.js';
import type { PartitaDto, SquadraPartitaDto } from '../../shared/types.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../data/seed');
const app = createApp();
const nuovaPartita = async (nome: string) => ((await request(app).post('/api/partite').send({ nome })).body.data as { id: number }).id;
const squadra = async (id: number) => (await request(app).get(`/api/partite/${id}/squadra`)).body.data as SquadraPartitaDto;
const membro = (s: SquadraPartitaDto, chiave: string) => s.membri.find((m) => m.chiave === chiave)!;

describe('API squadra — denaro ed esperienza', () => {
  beforeAll(() => { const db = initDb(':memory:'); runMigrations(db); caricaSeed(db, DIR_SEED); });
  afterAll(() => closeDb());

  it('la squadra sono i giocabili del seed, e all’inizio nessuno è segnato', async () => {
    const s = await squadra(await nuovaPartita('Squadra'));
    // Dieci Ladri in Royal, Kasumi compresa. Il numero viene dal seed: se un giorno cambia, cambia
    // qui, ed è giusto che questa prova lo faccia notare.
    expect(s.membri).toHaveLength(10);
    expect(s.membri.map((m) => m.chiave)).toContain('joker');
    expect(s.membri.map((m) => m.chiave)).toContain('kasumi');
    // I nomi sono quelli del seed, non le chiavi: «Protagonista», non «joker».
    expect(membro(s, 'joker').nome).not.toBe('joker');
    expect(s.membri.every((m) => !m.segnato)).toBe(true);
    expect(s.yen).toBe(0);
  });

  it('i yen si impostano al valore o per differenza, e non scendono sotto zero', async () => {
    const id = await nuovaPartita('Denaro');
    await request(app).patch(`/api/partite/${id}/squadra/yen`).send({ delta: 15000 });
    expect((await squadra(id)).yen).toBe(15000);
    // «Ho speso 12.000» è il gesto vero: chiedere di ricalcolare il totale a mano è un modo per
    // sbagliarlo.
    await request(app).patch(`/api/partite/${id}/squadra/yen`).send({ delta: -12000 });
    expect((await squadra(id)).yen).toBe(3000);
    // Non si va in rosso: nel gioco i yen non sono mai negativi.
    await request(app).patch(`/api/partite/${id}/squadra/yen`).send({ delta: -99999 });
    expect((await squadra(id)).yen).toBe(0);
    await request(app).patch(`/api/partite/${id}/squadra/yen`).send({ yen: 42000 });
    expect((await squadra(id)).yen).toBe(42000);
    // Un corpo che non dice né l'uno né l'altro è un errore di chi chiama, e va detto.
    expect((await request(app).patch(`/api/partite/${id}/squadra/yen`).send({})).status).toBe(400);
  });

  it('segnare un membro lo distingue da chi non è mai stato toccato', async () => {
    const id = await nuovaPartita('Membri');
    await request(app).patch(`/api/partite/${id}/squadra/ryuji`).send({ livello: 12, esperienza: 3400 });
    const s = await squadra(id);
    expect(membro(s, 'ryuji')).toMatchObject({ livello: 12, esperienza: 3400, segnato: true });
    expect(membro(s, 'ann').segnato).toBe(false);
    expect(membro(s, 'ryuji').updatedAt).not.toBeNull();
  });

  it('il livello di Joker resta allineato a quello che legge la fusione', async () => {
    const id = await nuovaPartita('Joker');
    await request(app).patch(`/api/partite/${id}/squadra/joker`).send({ deltaLivello: 4 });
    expect(membro(await squadra(id), 'joker').livello).toBe(5);
    const p = (await request(app).get(`/api/partite/${id}`)).body.data as PartitaDto;
    // Se questi due numeri divergono, la fusione propone Persona che non puoi evocare — o ne
    // nasconde di evocabili — e non se ne accorge nessuno finché non serve.
    expect(p.livelloProtagonista).toBe(5);
  });

  it('un membro che non fa parte della squadra è un errore, non una riga nuova', async () => {
    const id = await nuovaPartita('Sconosciuto');
    expect((await request(app).patch(`/api/partite/${id}/squadra/sojiro`).send({ livello: 5 })).status).toBe(404);
    expect((await request(app).patch(`/api/partite/${id}/squadra/inventato`).send({ livello: 5 })).status).toBe(404);
  });

  it('«yen» non viene scambiato per la chiave di un membro', async () => {
    const id = await nuovaPartita('Rotte');
    // La rotta dei yen sta prima di quella per chiave: registrata dopo, «yen» finirebbe lì e
    // risponderebbe «non è un membro giocabile della squadra».
    expect((await request(app).patch(`/api/partite/${id}/squadra/yen`).send({ yen: 100 })).status).toBe(200);
  });
});
