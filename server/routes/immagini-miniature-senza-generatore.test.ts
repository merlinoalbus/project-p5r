// ============================================================
// L1, variante «miniature» — test 7: il generatore che fallisce non rompe niente. Con sharp simulato in errore la rotta con `l`
// risponde 200 con l'originale (`X-Miniatura: originale`), scrive un `warn` una volta sola per immagine e nessuna riga in cache.
// ============================================================

import request from 'supertest';
import { closeDb, prepared } from '../db/dbService.js';
import { createApp } from '../bootstrap.js';
import { leggiImmagine, salvaImmagine } from '../services/immaginiService.js';
import { logger } from '../utils/logger.js';
import { dbDiProva } from '../../test/dbDiProva.js';

// sharp che si carica ma lancia a ogni elaborazione (un PNG rovinato, un binario che non va su questa macchina…)
vi.mock('sharp', () => ({
  default: Object.assign(() => { throw new Error('elaborazione impossibile (simulata)'); }, { concurrency: () => 1, cache: () => undefined }),
}));

const app = createApp();

/** PNG di 1672×941 (solo l'intestazione: `dimensioniImmagine` la legge, sharp qui non serve). */
const png = (l: number, a: number) => {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(l, 0); ihdr.writeUInt32BE(a, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from([0, 0, 0, 13]), Buffer.from('IHDR'), ihdr, Buffer.alloc(4), Buffer.alloc(4), Buffer.from('IEND'), Buffer.alloc(4)]);
};

describe('miniature senza generatore', () => {
  beforeAll(() => { dbDiProva(); });
  afterAll(() => closeDb());

  it('7 — sharp in errore: 200 con l’originale, un warn per immagine, nessuna riga', async () => {
    const avvisi = vi.spyOn(logger, 'warn');
    const contenuto = png(1672, 941);
    salvaImmagine('altro', 'senza-generatore', 'image/png', contenuto);
    const i = leggiImmagine('altro', 'senza-generatore')!;
    for (const l of [320, 640]) {
      const r = await request(app).get(`${i.url}?v=${encodeURIComponent(i.createdAt)}&l=${l}`).buffer(true)
        .parse((res, cb) => { const c: Buffer[] = []; res.on('data', (d: Buffer) => c.push(d)); res.on('end', () => cb(null, Buffer.concat(c))); });
      expect(r.status).toBe(200);
      expect(r.headers['x-miniatura']).toBe('originale');
      expect(r.headers['content-type']).toContain('image/png');
      expect((r.body as Buffer).equals(contenuto)).toBe(true);
    }
    expect(avvisi.mock.calls.filter((c) => String(c[1]).includes('generazione fallita'))).toHaveLength(1);
    expect(prepared('SELECT COUNT(*) FROM immagine_miniatura').pluck().get()).toBe(0);
  });
});
