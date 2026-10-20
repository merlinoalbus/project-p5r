// ============================================================
// L1, variante «miniature» (2026-10-20) — la rotta del file con `l`: WebP ridotta, cache nel database legata alla versione della
// sorgente, originale quando non c'è niente da ridurre, intestazioni HTTP, coalescenza, alfa, pacchetto senza righe
// ============================================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import sharp from 'sharp';
import request from 'supertest';
import { closeDb, getDb, initDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { eliminaImmagine, eliminaImmaginiAmbito, leggiImmagine, salvaImmagine } from '../services/immaginiService.js';
import { miniaturaDi, pulisciMiniatureOrfane, riscaldaMiniature } from '../services/miniatureService.js';
import { caricaPacchetto, percorsoPacchettoDb } from '../services/pacchetto/pacchettoGioco.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** Un PNG vero di larghezza×altezza, con un canale alfa semitrasparente se chiesto. */
const pngVero = (l: number, a: number, alfa = 1) => sharp({ create: { width: l, height: a, channels: 4, background: { r: 200, g: 30, b: 60, alpha: alfa } } }).png().toBuffer();
/** GIF 1×1 minima (formato animabile: si serve sempre l'originale). */
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2000" height="1000"><rect width="2000" height="1000"/></svg>');
const binario = (r: request.Test) => r.buffer(true).parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
const righe = (ambito: string, chiave: string) => prepared('SELECT COUNT(*) FROM immagine_miniatura m JOIN immagine i ON i.id = m.immagine_id WHERE i.ambito = ? AND i.chiave = ?').pluck().get(ambito, chiave) as number;
const url = (chiave: string) => leggiImmagine('altro', chiave)!.url + `?v=${encodeURIComponent(leggiImmagine('altro', chiave)!.createdAt)}`;

describe('miniature delle immagini del database', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('1 — PNG 1672×941 con l=320: WebP 320×180 generata, molto più leggera; la seconda richiesta viene dalla cache, senza righe nuove', async () => {
    const originale = await pngVero(1672, 941);
    salvaImmagine('altro', 'mini-uno', 'image/png', originale);
    const r = await binario(request(app).get(`${url('mini-uno')}&l=320`)).expect(200);
    expect(r.headers['content-type']).toBe('image/webp');
    expect(r.headers['x-miniatura']).toBe('generata');
    const meta = await sharp(r.body as Buffer).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 320, 180]);
    expect((r.body as Buffer).length).toBeLessThan(originale.length / 4);
    expect(righe('altro', 'mini-uno')).toBe(1);
    const di2 = await binario(request(app).get(`${url('mini-uno')}&l=320`)).expect(200);
    expect(di2.headers['x-miniatura']).toBe('cache');
    expect((di2.body as Buffer).equals(r.body as Buffer)).toBe(true);
    expect(righe('altro', 'mini-uno')).toBe(1);
  });

  it('2 — sostituita l’immagine, le sue miniature se ne vanno; il nuovo `v` dà la miniatura nuova; una riga di un’altra versione si rigenera', async () => {
    salvaImmagine('altro', 'mini-due', 'image/png', await pngVero(1600, 900));
    await request(app).get(`${url('mini-due')}&l=160`).expect(200);
    expect(righe('altro', 'mini-due')).toBe(1);
    await new Promise((ok) => setTimeout(ok, 5)); // una data diversa: la versione cambia
    salvaImmagine('altro', 'mini-due', 'image/png', await pngVero(800, 400));
    expect(righe('altro', 'mini-due')).toBe(0);
    const nuova = await binario(request(app).get(`${url('mini-due')}&l=160`)).expect(200);
    expect(nuova.headers['x-miniatura']).toBe('generata');
    expect((await sharp(nuova.body as Buffer).metadata()).height).toBe(80);
    prepared("UPDATE immagine_miniatura SET versione = 'vecchia' WHERE immagine_id = (SELECT id FROM immagine WHERE ambito = 'altro' AND chiave = 'mini-due')").run();
    const rigenerata = await request(app).get(`${url('mini-due')}&l=160`).expect(200);
    expect(rigenerata.headers['x-miniatura']).toBe('generata');
    expect(prepared("SELECT versione FROM immagine_miniatura WHERE immagine_id = (SELECT id FROM immagine WHERE ambito = 'altro' AND chiave = 'mini-due')").pluck().get()).toBe(leggiImmagine('altro', 'mini-due')!.createdAt);
  });

  it('3 — larghezze non ammesse: 400 larghezza-non-ammessa', async () => {
    for (const l of ['300', 'abc', '0', '320.5', '-160', '']) {
      const r = await request(app).get(`${url('mini-uno')}&l=${l}`);
      expect([r.status, r.body.error?.code]).toEqual([400, 'larghezza-non-ammessa']);
    }
  });

  it('4 — l non minore della larghezza reale, SVG e GIF: l’originale, con lo stesso tipo e gli stessi byte', async () => {
    const piccola = await pngVero(800, 400);
    salvaImmagine('altro', 'mini-piccola', 'image/png', piccola);
    for (const [chiave, mime, contenuto] of [['mini-piccola', 'image/png', piccola], ['mini-svg', 'image/svg+xml', SVG], ['mini-gif', 'image/gif', GIF]] as const) {
      if (chiave !== 'mini-piccola') salvaImmagine('altro', chiave, mime, contenuto);
      const r = await binario(request(app).get(`${url(chiave)}&l=1024`)).expect(200);
      expect(r.headers['x-miniatura']).toBe('originale');
      expect(r.headers['content-type']).toContain(mime);
      expect((r.body as Buffer).equals(contenuto)).toBe(true);
      expect(righe('altro', chiave)).toBe(0);
    }
    // a 640 lo SVG e la GIF restano originali, la PNG da 800 si riduce
    expect((await request(app).get(`${url('mini-svg')}&l=640`)).headers['x-miniatura']).toBe('originale');
    expect((await request(app).get(`${url('mini-piccola')}&l=640`)).headers['x-miniatura']).toBe('generata');
  });

  it('5 — eliminando l’immagine, singola o in blocco, le sue miniature se ne vanno (cascata)', async () => {
    salvaImmagine('altro', 'mini-cinque', 'image/png', await pngVero(1000, 500));
    await request(app).get(`${url('mini-cinque')}&l=320`).expect(200);
    const id = leggiImmagine('altro', 'mini-cinque')!.id;
    eliminaImmagine('altro', 'mini-cinque');
    expect(prepared('SELECT COUNT(*) FROM immagine_miniatura WHERE immagine_id = ?').pluck().get(id)).toBe(0);
    expect(prepared("SELECT COUNT(*) FROM immagine_miniatura m JOIN immagine i ON i.id = m.immagine_id WHERE i.ambito = 'altro'").pluck().get()).toBeGreaterThan(0);
    eliminaImmaginiAmbito('altro');
    expect(prepared('SELECT COUNT(*) FROM immagine_miniatura').pluck().get()).toBe(0);
  });

  it('6 — intestazioni: con `v` immutabile, senza `v` no-cache; ETag con la larghezza; 304 con If-None-Match, anche prima di generare', async () => {
    salvaImmagine('altro', 'mini-sei', 'image/png', await pngVero(1200, 600));
    const conV = await request(app).get(`${url('mini-sei')}&l=320`).expect(200);
    expect(conV.headers['cache-control']).toBe('private, max-age=31536000, immutable');
    const etag = conV.headers.etag as string;
    expect(etag).toMatch(/-l320"$/);
    const senzaV = await request(app).get(`${leggiImmagine('altro', 'mini-sei')!.url}?l=320`).expect(200);
    expect(senzaV.headers['cache-control']).toBe('private, no-cache');
    expect(senzaV.headers.etag).toBe(etag);
    await request(app).get(`${url('mini-sei')}&l=320`).set('If-None-Match', etag).expect(304);
    // l'ETag di un'altra misura è un altro: e il 304 arriva senza generare (nessuna riga a 640)
    const etag640 = etag.replace(/-l320"$/, '-l640"');
    await request(app).get(`${url('mini-sei')}&l=640`).set('If-None-Match', etag640).expect(304);
    expect(prepared("SELECT COUNT(*) FROM immagine_miniatura m JOIN immagine i ON i.id = m.immagine_id WHERE i.chiave = 'mini-sei' AND m.larghezza = 640").pluck().get()).toBe(0);
    // senza `l` la risposta è quella di sempre
    const piena = await request(app).get(url('mini-sei')).expect(200);
    expect(piena.headers['x-miniatura']).toBeUndefined();
    expect(piena.headers.etag).not.toMatch(/-l\d+"$/);
  });

  it('8 — cinque richieste contemporanee della stessa miniatura: una generazione sola, una riga', async () => {
    salvaImmagine('altro', 'mini-otto', 'image/png', await pngVero(1672, 941));
    const f = prepared("SELECT id, mime, byte, created_at, contenuto FROM immagine WHERE ambito = 'altro' AND chiave = 'mini-otto'").get() as { id: number; mime: string; byte: number; created_at: string; contenuto: Buffer };
    const s = { id: f.id, contenuto: f.contenuto, mime: f.mime, byte: f.byte, createdAt: f.created_at };
    const esiti = await Promise.all(Array.from({ length: 5 }, () => miniaturaDi(s, 640)));
    expect(esiti.every((e) => e.esito === 'generata')).toBe(true);
    // lo stesso risultato per tutte: la stessa generazione, non cinque
    expect(new Set(esiti.map((e) => e.contenuto)).size).toBe(1);
    expect(prepared('SELECT COUNT(*) FROM immagine_miniatura WHERE immagine_id = ? AND larghezza = 640').pluck().get(f.id)).toBe(1);
    const http = await Promise.all(Array.from({ length: 5 }, () => request(app).get(`${url('mini-otto')}&l=1024`)));
    expect(http.every((r) => r.status === 200)).toBe(true);
    expect(prepared('SELECT COUNT(*) FROM immagine_miniatura WHERE immagine_id = ? AND larghezza = 1024').pluck().get(f.id)).toBe(1);
  });

  it('9 — una PNG trasparente resta trasparente nella WebP', async () => {
    salvaImmagine('altro', 'mini-alfa', 'image/png', await pngVero(1024, 1024, 0.3));
    const r = await binario(request(app).get(`${url('mini-alfa')}&l=320`)).expect(200);
    const meta = await sharp(r.body as Buffer).metadata();
    expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(['webp', 320, 320, true]);
  });

  it('riscaldamento e pulizia: le immagini date ricevono le misure delle schede; le miniature orfane o stantie se ne vanno', async () => {
    salvaImmagine('altro', 'mini-calda', 'image/png', await pngVero(1672, 941));
    expect(await riscaldaMiniature([{ ambito: 'altro', chiave: 'mini-calda' }])).toMatchObject({ immagini: 1, generate: 2 });
    expect(prepared("SELECT larghezza FROM immagine_miniatura m JOIN immagine i ON i.id = m.immagine_id WHERE i.chiave = 'mini-calda' ORDER BY larghezza").pluck().all()).toEqual([160, 320]);
    expect((await riscaldaMiniature([{ ambito: 'altro', chiave: 'mini-calda' }])).generate).toBe(0);
    prepared("UPDATE immagine_miniatura SET versione = 'vecchia' WHERE larghezza = 160 AND immagine_id = (SELECT id FROM immagine WHERE chiave = 'mini-calda')").run();
    expect(pulisciMiniatureOrfane(getDb())).toBe(1);
    expect(prepared("SELECT larghezza FROM immagine_miniatura m JOIN immagine i ON i.id = m.immagine_id WHERE i.chiave = 'mini-calda'").pluck().all()).toEqual([320]);
  });

  it('10 — il pacchetto porta lo schema delle miniature ma mai le righe', async () => {
    // un pacchetto alla 108 con una miniatura dentro (lo script del pacchetto le svuota: qui si prova che anche una rimasta non entra)
    const cartella = fs.mkdtempSync(path.join(os.tmpdir(), 'p5r-miniature-'));
    const file = path.join(cartella, 'gioco.db');
    try {
      fs.copyFileSync(percorsoPacchettoDb(), file);
      const p = new Database(file);
      p.exec(`CREATE TABLE immagine_miniatura (immagine_id INTEGER NOT NULL REFERENCES immagine(id) ON DELETE CASCADE, larghezza INTEGER NOT NULL CHECK (larghezza IN (160, 320, 640, 1024)),
        versione TEXT NOT NULL, mime TEXT NOT NULL, byte INTEGER NOT NULL CHECK (byte > 0), larghezza_reale INTEGER NOT NULL CHECK (larghezza_reale > 0),
        altezza_reale INTEGER NOT NULL CHECK (altezza_reale > 0), contenuto BLOB NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY (immagine_id, larghezza))`);
      // una miniatura «valida» (sorgente con contenuto, stessa versione): la pulizia delle orfane non la toglierebbe, quindi se
      // manca dopo il caricamento è perché le righe non sono entrate
      const sorgente = p.prepare('SELECT id, created_at FROM immagine ORDER BY id LIMIT 1').get() as { id: number; created_at: string };
      p.prepare("UPDATE immagine SET contenuto = x'01' WHERE id = ?").run(sorgente.id);
      p.prepare("INSERT INTO immagine_miniatura VALUES (?, 160, ?, 'image/webp', 1, 1, 1, x'00', 'x')").run(sorgente.id, sorgente.created_at);
      p.pragma('user_version = 108');
      p.close();
      closeDb();
      const db = initDb(':memory:');
      caricaPacchetto(db, file, { conImmagini: true });
      expect(db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'immagine_miniatura'").get()).toBeTruthy();
      expect(db.prepare('SELECT COUNT(*) FROM immagine_miniatura').pluck().get()).toBe(0);
      expect(db.pragma('user_version', { simple: true })).toBeGreaterThanOrEqual(108);
    } finally {
      closeDb();
      fs.rmSync(cartella, { recursive: true, force: true });
      dbDiProva();
    }
  });
});
