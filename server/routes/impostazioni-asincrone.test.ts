// ============================================================
// Test F15 (verifica completa 2026-10-03): le rotte asincrone di /api/impostazioni passano i loro errori al gestore
// ============================================================
//
// Gli handler sono `async` senza `try/catch`: è Express 5 a passare a `next` la promessa rifiutata. Qui ogni rotta asincrona
// fallisce e deve rispondere con la busta d'errore JSON e il suo codice, senza lasciare la richiesta appesa (il timeout di
// supertest la farebbe fallire).

import request from 'supertest';
import { config } from '../config.js';
import { httpErrors } from '../utils/httpError.js';

vi.mock('../services/impostazioniService.js', async (originale) => ({
  ...(await originale<typeof import('../services/impostazioniService.js')>()),
  copiaDatabase: async () => { throw httpErrors.conflict('copia-in-corso', 'Una copia è già in corso.'); },
  copiaIstanza: async () => { throw httpErrors.conflict('copia-in-corso', 'Una copia è già in corso.'); },
}));

const { createApp } = await import('../bootstrap.js');

describe('rotte asincrone di /api/impostazioni — errori', () => {
  const depositoOriginale = config.depositoDir;
  beforeAll(() => { (config as { depositoDir: string }).depositoDir = ''; });
  afterAll(() => { (config as { depositoDir: string }).depositoDir = depositoOriginale; });

  it.each([
    ['get', '/api/impostazioni/istanza/database', 409, 'copia-in-corso'],
    ['get', '/api/impostazioni/istanza/completa.zip', 409, 'copia-in-corso'],
    ['put', '/api/impostazioni/istanza/gioco/deposito', 400, 'deposito-non-configurato'],
    ['put', '/api/impostazioni/istanza/deposito', 400, 'deposito-non-configurato'],
  ] as const)('%s %s → %i %s, in JSON', async (metodo, percorso, stato, codice) => {
    const app = request(createApp());
    const res = await (metodo === 'get' ? app.get(percorso) : app.put(percorso).send({ nome: 'gioco.db' })).timeout(5000);
    expect(res.status).toBe(stato);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body.error.code).toBe(codice);
    expect(typeof res.body.requestId).toBe('string');
  });
});
