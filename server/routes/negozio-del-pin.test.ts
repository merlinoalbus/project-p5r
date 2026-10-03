// ============================================================
// Test B10 (verifica completa 2026-10-03): il negozio di un pin sparisce solo se il negozio non esiste; ogni altro errore si vede
// ============================================================

import request from 'supertest';
import { HttpError } from '../utils/httpError.js';

const guasto = vi.hoisted(() => ({ errore: null as Error | null }));

vi.mock('../services/negoziService.js', async (originale) => {
  const vero = await originale<typeof import('../services/negoziService.js')>();
  return { ...vero, dettaglioNegozio: (...a: Parameters<typeof vero.dettaglioNegozio>) => { if (guasto.errore) throw guasto.errore; return vero.dettaglioNegozio(...a); } };
});

const { closeDb, getDb, initDb } = await import('../db/dbService.js');
const { caricaPacchetto } = await import('../services/pacchetto/pacchettoGioco.js');
const { createApp } = await import('../bootstrap.js');

describe('B10 — negozio del pin', () => {
  const app = createApp();
  let mappa = '';
  beforeAll(() => {
    caricaPacchetto(initDb(':memory:'));
    mappa = getDb().prepare("SELECT mappa_chiave FROM spillo WHERE riferimento_tipo = 'negozio' AND mappa_chiave IS NOT NULL LIMIT 1").pluck().get() as string;
  });
  afterAll(() => closeDb());
  afterEach(() => { guasto.errore = null; });

  const negozioDelPin = async () => {
    const res = await request(app).get(`/api/mappe/${mappa}`);
    return { status: res.status, negozi: (res.body.data?.spilli ?? []).filter((s: { riferimento?: { tipo: string } }) => s.riferimento?.tipo === 'negozio').map((s: { dettaglio?: { negozio?: unknown } }) => s.dettaglio?.negozio ?? null) };
  };

  it('il pin di un negozio che non esiste più resta, senza negozio', async () => {
    expect(mappa).toBeTruthy();
    // controllo: senza guasti il pin porta il suo negozio (così il campo letto qui sotto è quello giusto)
    const sano = await negozioDelPin();
    expect(sano.negozi.length).toBeGreaterThan(0);
    expect(sano.negozi.every((n: unknown) => n !== null)).toBe(true);
    guasto.errore = new HttpError(404, 'negozio-non-trovato', 'Il negozio non esiste.');
    const { status, negozi } = await negozioDelPin();
    expect(status).toBe(200);
    expect(negozi.length).toBeGreaterThan(0);
    expect(negozi.every((n: unknown) => n === null)).toBe(true);
  });

  it('un guasto vero (SQL, codice) non viene nascosto: la richiesta fallisce', async () => {
    guasto.errore = new Error('SQLITE_ERROR: no such column: a.prezzo');
    expect((await negozioDelPin()).status).toBe(500);
  });
});
