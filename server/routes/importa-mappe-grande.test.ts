// ============================================================
// O3-1 (L3, decisione del PM del 2026-10-20) — l'esportazione completa delle mappe (103 MB, immagini in base64) si reimporta
// dall'app: la sola rotta di importazione delle mappe accetta un corpo oltre i 64 MB di prima; le altre rotte restano al limite
// generale
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { dbDiProva } from '../../test/dbDiProva.js';

const app = createApp();

/** PNG di larghezza×altezza (intestazione IHDR valida) allungato fino a `byte`: il contenuto non viene decodificato. */
const pngDi = (l: number, a: number, byte: number) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(a, 4); ihdr[8] = 8; ihdr[9] = 6;
  const testa = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), ihdr, Buffer.alloc(4)]);
  const corpo = Buffer.alloc(byte - testa.length, 7);
  return Buffer.concat([testa, corpo]);
};

describe('O3-1 — importazione delle mappe oltre i 64 MB', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('un pacchetto di 9 mappe con immagini da 7,5 MB (oltre 64 MB di JSON) si importa dalla rotta, immagini comprese', async () => {
    const byte = 7.5 * 1024 * 1024;
    const mappe = Array.from({ length: 9 }, (_, i) => ({
      chiave: `grande-${i}`, nome: `Mappa grande ${i}`, tipo: 'generica', genitore: null, ordine: i, immagine: `grande-${i}`, asset: null,
      larghezza: 100 + i, altezza: 50, entita: null, note: '', spilli: [],
    }));
    const immagini = Object.fromEntries(mappe.map((m, i) => [m.chiave, { mime: 'image/png', base64: pngDi(100 + i, 50, byte).toString('base64') }]));
    const corpo = JSON.stringify({ pacchetto: { versione: 1, mappe, immagini }, sovrascrivi: true });
    expect(Buffer.byteLength(corpo)).toBeGreaterThan(64 * 1024 * 1024);
    const r = await request(app).post('/api/mappe/importa').set('Content-Type', 'application/json').send(corpo);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject({ mappe: 9, immagini: 9, saltate: [] });
    expect(prepared("SELECT COUNT(*) FROM immagine WHERE ambito = 'mappa' AND chiave LIKE 'grande-%' AND byte = ?").pluck().get(byte)).toBe(9);
  }, 120_000);

  it('le altre rotte restano al limite generale: un corpo JSON di 6 MB altrove è un 413', async () => {
    const r = await request(app).put('/api/mappe/ordine').set('Content-Type', 'application/json').send(JSON.stringify({ genitore: null, chiavi: ['x'.repeat(6 * 1024 * 1024)] }));
    expect(r.status).toBe(413);
  });
});
