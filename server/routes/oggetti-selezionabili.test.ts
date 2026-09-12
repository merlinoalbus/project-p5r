// ============================================================
// Test API — gli oggetti che l'app già conosce, offerti a chi mette un articolo in vendita
// ============================================================
//
// Mettere in vendita una cosa già censita voleva dire riscriverla, e le due copie poi non si
// parlavano: il ponte fra oggetti della guida e articoli dei negozi li abbina **per nome**, e su
// 355 oggetti e 575 articoli ne aggancia 121. Questo elenco esiste perché l'aggancio lo faccia chi
// compila, che è l'unico che sa davvero se sono la stessa cosa.
//
// Le cose da sorvegliare sono tre, e sono tutte state difetti veri durante la stesura:
//  1. la rotta deve stare **prima** di `/catalogo/:tipo`, che accetta qualunque parola e altrimenti
//     la ingoia rispondendo «tipo di catalogo sconosciuto»;
//  2. le tre sorgenti (equipaggiamenti, guida, tabelle di libri/film/videogiochi) devono rispondere
//     tutte, perché sono tre codici diversi e ognuno si può rompere da solo;
//  3. una categoria senza archivio deve dare un **elenco vuoto**, non un errore: lì si scrive a
//     mano, ed è un modo normale di lavorare, non un guasto.

import request from 'supertest';
import { closeDb, initDb } from '../db/dbService.js';
import { caricaPacchetto } from '../services/pacchetto/pacchettoGioco.js';
import { createApp } from '../bootstrap.js';
import type { OggettoSelezionabileDto } from '../../shared/types.js';

const app = createApp();
const per = async (categoria: string) =>
  (await request(app).get(`/api/catalogo/oggetti-di/${categoria}`)).body.data as OggettoSelezionabileDto[];

describe('API oggetti selezionabili', () => {
  beforeAll(() => { const db = initDb(':memory:'); caricaPacchetto(db); });
  afterAll(() => closeDb());

  it('non viene ingoiata da /catalogo/:tipo', async () => {
    const r = await request(app).get('/api/catalogo/oggetti-di/arma');
    expect(r.status).toBe(200);
    // Il difetto sarebbe stato questo: 400 «tipo di catalogo sconosciuto», con l'elenco mai raggiunto.
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('l’equipaggiamento arriva dalla sua tabella, col nome italiano e il vincolo', async () => {
    const armi = await per('arma');
    // Le armi sono due categorie del dataset — da mischia e da fuoco — e vanno insieme: sono la
    // stessa famiglia nel negozio di Iwai.
    expect(armi.length).toBeGreaterThan(60);
    expect(armi.every((o) => o.fonte === 'equipaggiamento')).toBe(true);
    expect(armi.some((o) => o.nomeIt !== null)).toBe(true);
    expect((await per('protezione')).length).toBeGreaterThan(20);
    expect((await per('accessorio')).length).toBeGreaterThan(100);
    // Il vincolo — «Solo Joker», «Solo donne» — è quello che il modulo mette in «Per chi». Ce
    // l'hanno tutte le armi e tutte le protezioni; **nessuno dei 125 accessori**, che infatti nel
    // gioco li porta chiunque. Le due righe qui sotto dicono l'uno e l'altro fatto: se un giorno
    // gli accessori si ritrovassero un vincolo, o le armi lo perdessero, è un dato che è cambiato.
    expect((await per('arma')).every((o) => o.per !== null)).toBe(true);
    expect((await per('accessorio')).every((o) => o.per === null)).toBe(true);
  });

  it('i consumabili arrivano dalla guida, divisi per il tipo che la guida stessa usa', async () => {
    for (const c of ['cura', 'sp', 'battaglia', 'stato']) {
      const v = await per(c);
      expect(v.length, `categoria ${c}`).toBeGreaterThan(10);
      expect(v.every((o) => o.fonte === 'guida'), `categoria ${c}`).toBe(true);
      expect(v.every((o) => o.effetto !== null), `categoria ${c}`).toBe(true);
    }
    // **«consumabile» non e' piu' un raccoglitore.** Lo era finche' l'elenco si filtrava per la
    // categoria scelta a mano: chi non voleva distinguere prendeva quella e vedeva tutto. Ora la
    // categoria non si sceglie, **arriva con l'oggetto**, e un oggetto che cura e' `cura`: in
    // `consumabile` restano solo le voci che la guida stessa non classifica.
    expect((await per('consumabile')).every((o) => o.fonte === 'guida')).toBe(true);
  });

  /** L'archivio unico: tutti gli oggetti di ogni tipo, con la chiave che li collega.
   *
   * E' il punto della richiesta — «nel negozio scelgo un oggetto di qualsiasi tipo» — e la prova
   * che serve e' che l'elenco unico non perda per strada nessuna delle sorgenti. */
  it('l’archivio unico raccoglie ogni tipo, e ogni voce porta la chiave con cui si collega', async () => {
    const tutti = (await request(app).get('/api/catalogo/oggetti')).body.data as Array<{ chiave: string; fonte: string; categoria: string; nome: string }>;
    expect(tutti.length).toBeGreaterThan(300);
    // Nessuna voce senza le due meta' del collegamento, o il legame non si potrebbe salvare.
    expect(tutti.every((o) => !!o.chiave && !!o.fonte && !!o.categoria)).toBe(true);
    // La coppia fonte+chiave e' unica: due voci con la stessa coppia sarebbero indistinguibili.
    expect(new Set(tutti.map((o) => `${o.fonte}/${o.chiave}`)).size).toBe(tutti.length);
    // Tutte e cinque le sorgenti sono rappresentate.
    expect(new Set(tutti.map((o) => o.fonte))).toEqual(new Set(['equipaggiamento', 'guida', 'libri', 'film', 'videogiochi']));
  });

  it('libri, film, DVD e videogiochi sono merce da negozio quanto il resto', async () => {
    expect(await per('libro')).toHaveLength(46);
    const dvd = await per('dvd');
    const film = await per('film');
    expect(dvd.length).toBeGreaterThan(0);
    expect(film.length).toBeGreaterThan(0);
    // Sono due elenchi diversi, non lo stesso filtrato male: un DVD non è un film al cinema.
    expect(dvd.map((d) => d.nome).some((n) => film.map((f) => f.nome).includes(n))).toBe(false);
    expect((await per('videogioco')).length).toBe(7);
  });

  it('una categoria senza archivio risponde con un elenco vuoto, non con un errore', async () => {
    for (const c of ['regalo', 'materiale', 'cibo', 'altro', 'categoria-inventata']) {
      const r = await request(app).get(`/api/catalogo/oggetti-di/${c}`);
      expect(r.status, `categoria ${c}`).toBe(200);
      expect(r.body.data, `categoria ${c}`).toEqual([]);
    }
  });

  it('quello che si sceglie basta a riempire il modulo', async () => {
    const uno = (await per('cura'))[0];
    expect(uno).toMatchObject({ nome: expect.any(String), effetto: expect.any(String), fonte: 'guida' });
    // I campi che il modulo non sa riempire da qui sono dichiarati nulli, non assenti: chi legge la
    // risposta non deve indovinare se manca il dato o manca la chiave.
    expect(uno).toHaveProperty('statistiche');
    expect(uno).toHaveProperty('per');
    expect(uno).toHaveProperty('prezzo');
  });
});
