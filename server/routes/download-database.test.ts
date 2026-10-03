// ============================================================
// Test F05 (verifica completa 2026-10-03): lo scaricamento del database non resta appeso e non fa cadere il processo
// ============================================================
//
// In Express 5 `res.download(percorso, nome, callback)` passa l'errore SOLO alla callback: prima la callback lo ignorava
// (la richiesta restava aperta) e un'eccezione di `rmSync` lì dentro sarebbe uscita dal ciclo degli eventi.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';

const stato = vi.hoisted(() => ({ percorso: '' }));

vi.mock('../services/impostazioniService.js', async (originale) => ({
  ...(await originale<typeof import('../services/impostazioniService.js')>()),
  copiaDatabase: async () => ({ percorso: stato.percorso, nome: 'gioco.db' }),
}));
vi.mock('../services/depositoService.js', async (originale) => ({
  ...(await originale<typeof import('../services/depositoService.js')>()),
  depositaCopia: () => null,
}));

const { createApp } = await import('../bootstrap.js');

describe('GET /api/impostazioni/istanza/database — errori dell\'invio', () => {
  it('un file sparito prima dell\'invio risponde 404 JSON invece di lasciare la richiesta appesa', async () => {
    stato.percorso = path.join(os.tmpdir(), `p5r-copia-sparita-${process.pid}.db`);
    const res = await request(createApp()).get('/api/impostazioni/istanza/database').timeout(5000);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('not-found');
  });

  it('se la pulizia della copia fallisce, il file arriva comunque e il processo resta in piedi', async () => {
    stato.percorso = path.join(os.tmpdir(), `p5r-copia-${process.pid}.db`);
    fs.writeFileSync(stato.percorso, 'contenuto');
    const rm = vi.spyOn(fs, 'rmSync').mockImplementation(() => { throw new Error('EBUSY: file in uso'); });
    try {
      const res = await request(createApp()).get('/api/impostazioni/istanza/database').buffer(true).parse((r, cb) => { let d = ''; r.on('data', (c: Buffer) => { d += c.toString(); }); r.on('end', () => cb(null, d)); }).timeout(5000);
      expect(res.status).toBe(200);
      expect(res.body).toBe('contenuto');
      expect(rm).toHaveBeenCalled();
    } finally {
      rm.mockRestore();
      fs.rmSync(stato.percorso, { force: true });
    }
  });
});
