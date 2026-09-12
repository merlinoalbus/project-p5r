// ============================================================
// Test API città e attività (Fase 8.1) — quartieri, luoghi, attività/lavori/libri/film, letture per partita con evento, reseed stabile
// ============================================================

import request from 'supertest';
import { closeDb, getDb, initDb } from '../db/dbService.js';
import { caricaPacchetto, ricaricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { invalidaCacheTraduzioni } from '../services/traduzioniService.js';
import { createApp } from '../bootstrap.js';
import type { AttivitaTutteDto, LibroDto, QuartiereDettaglioDto, QuartiereRiassuntoDto, StoricoDto } from '../../shared/types.js';

const app = createApp();

describe('API città e attività', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    caricaPacchetto(db);
    invalidaCacheTraduzioni();
  });
  afterAll(() => closeDb());

  it('quartieri con conteggi e scheda con luoghi (Confidenti risolti, piatti, flag verificato)', async () => {
    const q = (await request(app).get('/api/compendio/citta')).body.data as QuartiereRiassuntoDto[];
    expect(q.length).toBeGreaterThanOrEqual(20);
    expect(q[0]).toMatchObject({ chiave: 'yongen-jaya', nome: 'Yongen-Jaya' });
    // I due luoghi dell'«Entrata dei Memento» non si contano qui: non e' un quartiere e non
    // compare piu' in questo elenco — si raggiungono dalla pagina dei Memento, che e' il posto
    // giusto. Il totale e' salito da 82 a 84 con l'area del Tokyo Skytree (Asakusa) e Takenoko
    // Street (Harajuku): due libri dichiaravano di sbloccarle e nel catalogo non c'erano, quindi
    // leggere il libro non poteva far comparire niente. Da 84 a 91 con i sette posti che la
    // migrazione 072 ha aggiunto come sedi di negozi e distributori che non ne avevano una.
    expect(q.reduce((s, x) => s + x.luoghi, 0)).toBe(91);
    expect(q.some((x) => x.chiave === 'mementos')).toBe(false);
    expect(q.every((x) => x.luoghi > 0 && x.verificati <= x.luoghi)).toBe(true);
    const s = (await request(app).get('/api/compendio/citta/shibuya')).body.data as QuartiereDettaglioDto;
    // 22 della guida + Taisho Store, il venditore ambulante e il distributore del sottopasso (072)
    expect(s.luoghi).toHaveLength(25);
    const u = s.luoghi.find((l) => l.nome === 'Untouchable')!;
    expect(u).toMatchObject({ chiave: 'shibuya/untouchable', tipo: 'negozio', quando: 'sera', verificato: true });
    expect(u.confidenti).toEqual([{ chiave: 'iwai', nome: expect.stringContaining('Iwai') }]);
    expect(u.fonte.startsWith('https://www.allgamestaff.it/')).toBe(true);
    const y = (await request(app).get('/api/compendio/citta/yongen-jaya')).body.data as QuartiereDettaglioDto;
    expect(y.luoghi.some((l) => l.piatti !== null && l.piatti.length > 0)).toBe(true);
    expect((await request(app).get('/api/compendio/citta/atlantide')).status).toBe(404);
  });

  it('con una partita dice quali quartieri sono davvero nel mondo, non solo quelli con una data', async () => {
    // È il punto della decisione dell'utente: un quartiere che si apre col rango di un Confidente
    // o con un libro è **chiuso** finché non hai quel rango o quel libro, esattamente come uno che
    // apre a giugno è chiuso ad aprile. Prima si guardava solo `sbloccoData`, e i sedici quartieri
    // la cui condizione non è una data risultavano aperti dal primo giorno.
    const senza = (await request(app).get('/api/compendio/citta')).body.data as QuartiereRiassuntoDto[];
    expect(senza.every((x) => x.disponibile !== false)).toBe(true);

    const id = ((await request(app).post('/api/partite').send({ nome: 'Sblocchi' })).body.data as { id: number }).id;
    const q = (await request(app).get(`/api/compendio/citta?partita=${id}`)).body.data as QuartiereRiassuntoDto[];
    // Una partita nuova comincia l'11 aprile: si può stare a Yongen-Jaya, a Shibuya e a scuola.
    expect(q.filter((x) => x.disponibile !== false).map((x) => x.chiave)).toEqual(['yongen-jaya', 'shibuya', 'shujin-academy']);

    const perChiave = new Map(q.map((x) => [x.chiave, x]));
    expect(perChiave.get('shinjuku')!.bloccoMotivo).toContain('18 giugno');
    // un rango di Confidente: e il motivo dice a che punto sei, non solo che sei fermo
    expect(perChiave.get('ueno')!.bloccoMotivo).toMatch(/yusuke.*0 di 3/);
    expect(perChiave.get('yokohama-chinatown')!.bloccoMotivo).toContain('completare');
    // chi non ha condizioni non ha nemmeno un motivo
    expect(perChiave.get('shibuya')!.bloccoMotivo).toBeNull();
  });

  it('ogni quartiere è raggiungibile: nessuna regola scritta a mano lo chiude per sempre', async () => {
    // È la prova che conta di più su una tabella scritta a mano, e non c'entra col comportamento
    // di un giorno preciso: **una chiave sbagliata blocca un quartiere per sempre**, e non se ne
    // accorgerebbe nessuno. Un libro che nel catalogo si chiama `dolci-cinesi` scritto
    // `chinese-sweets`, un Confidente `yusuke` scritto `emperor`: il valutatore risponde «non
    // soddisfatta», per sempre, in silenzio. Qui si porta una partita alla fine del gioco con
    // tutto letto e tutti i ranghi al massimo, e si pretende che il mondo sia **tutto** aperto.
    const id = ((await request(app).post('/api/partite').send({ nome: 'Fine del gioco' })).body.data as { id: number }).id;
    const db = getDb();
    db.prepare("UPDATE partita SET data_gioco = '01-31' WHERE id = ?").run(id);
    db.prepare('UPDATE confidente_partita SET sbloccato = 1, rango = 10 WHERE partita_id = ?').run(id);
    for (const l of db.prepare('SELECT chiave FROM libro').all() as Array<{ chiave: string }>) {
      db.prepare("INSERT OR IGNORE INTO lettura_partita (partita_id, tipo, chiave, updated_at) VALUES (?, 'libro', ?, '')").run(id, l.chiave);
    }
    const q = (await request(app).get(`/api/compendio/citta?partita=${id}`)).body.data as QuartiereRiassuntoDto[];
    const chiusi = q.filter((x) => x.disponibile === false).map((x) => `${x.chiave}: ${x.bloccoMotivo}`);
    expect(chiusi, 'un quartiere che non si apre nemmeno a fine gioco ha una regola sbagliata').toEqual([]);
    expect(q.length).toBeGreaterThanOrEqual(20);
  });

  it('attività, lavori, libri e film con Doti; letture per partita con evento, riapertura, validazione, reseed stabile', async () => {
    const a = (await request(app).get('/api/compendio/attivita')).body.data as AttivitaTutteDto;
    expect(a.attivita.length).toBeGreaterThanOrEqual(20);
    expect(a.lavori).toHaveLength(4);
    expect(a.libri).toHaveLength(46);
    expect(a.film).toHaveLength(30);
    expect(a.attivita.find((x) => x.chiave === 'freccette')).toMatchObject({ luogoChiave: 'kichijoji', fascia: 'sera', costo: 800, doti: [{ dote: 'perizia', note: 1, condizione: expect.any(String) }], verificato: true });
    expect(a.lavori.every((x) => x.tipo === 'lavoro' && x.doti.length > 0)).toBe(true);
    expect(a.libri.filter((l) => l.dote !== null).length).toBeGreaterThanOrEqual(20);
    expect(a.libri.every((l) => l.fonte.startsWith('http') && !l.fatto)).toBe(true);
    expect(a.film.filter((f) => f.dove === 'dvd')).toHaveLength(12);
    expect(a.film.filter((f) => f.dove === 'cinema')).toHaveLength(18);
    expect(a).toMatchObject({ libriLetti: 0, filmVisti: 0 });
    expect((await request(app).get('/api/compendio/attivita?partita=99999')).status).toBe(404);

    const id = ((await request(app).post('/api/partite').send({ nome: 'Letture', dataGioco: '12-15' })).body.data as { id: number }).id;
    const libro = a.libri.find((l) => l.dote !== null)!;
    let r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: libro.chiave, fatto: true })).body.data as LibroDto;
    expect(r.fatto).toBe(true);
    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: libro.chiave, fatto: true })).body.data as LibroDto; // idempotente
    await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'film', chiave: a.film[0].chiave, fatto: true });
    const con = (await request(app).get(`/api/compendio/attivita?partita=${id}`)).body.data as AttivitaTutteDto;
    expect(con).toMatchObject({ libriLetti: 1, filmVisti: 1 });
    expect(con.libri.find((l) => l.chiave === libro.chiave)?.fatto).toBe(true);
    const storico = (await request(app).get(`/api/partite/${id}/storico?tipi=lettura`)).body.data as StoricoDto;
    expect(storico.totale).toBe(2);
    expect(storico.eventi.some((e) => e.titolo.includes(libro.nomeIt ?? libro.nome))).toBe(true);
    r = (await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: libro.chiave, fatto: false })).body.data as LibroDto;
    expect(r.fatto).toBe(false);
    expect((await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'libro', chiave: 'nessuno', fatto: true })).status).toBe(404);
    expect((await request(app).put(`/api/partite/${id}/letture`).send({ tipo: 'rivista', chiave: libro.chiave, fatto: true })).status).toBe(400);
    // reseed forzato: le letture restano
    ricaricaPacchetto(getDb());
    const dopo = (await request(app).get(`/api/compendio/attivita?partita=${id}`)).body.data as AttivitaTutteDto;
    expect(dopo.filmVisti).toBe(1);
    expect(dopo.libri).toHaveLength(46);
  });
});
