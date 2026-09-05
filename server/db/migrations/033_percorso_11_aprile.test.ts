// ============================================================
// Test migrazione 033 — riallineamento delle spunte dell'11 aprile dopo la rimozione dell'azione «esame» dal seed
// ============================================================

import path from 'node:path';
import { closeDb, getDb, initDb, prepared } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { caricaSeed } from '../../services/seed/caricaSeed.js';
import { DATA_11_APRILE, rimappaAzioniUndiciAprile } from './033_percorso_11_aprile.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

describe('migrazione 033 — percorso dell’11 aprile', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
  });
  afterAll(() => closeDb());

  it('il seed non ha più la domanda in classe dell’11 aprile: due azioni (Palazzo di giorno, Stanza di Velluto di sera)', () => {
    const r = prepared('SELECT azioni_json FROM giorno_percorso WHERE data = ?').get(DATA_11_APRILE) as { azioni_json: string };
    const azioni = JSON.parse(r.azioni_json) as Array<{ fascia: string; tipo: string; azione: string }>;
    expect(azioni).toHaveLength(2);
    expect(azioni.some((a) => a.tipo === 'esame')).toBe(false);
    expect(azioni.map((a) => a.fascia)).toEqual(['giorno', 'sera']);
  });

  it('toglie la spunta dell’indice 0 e scala di uno le successive, in ogni partita, conservando gli effetti registrati e gli altri giorni', () => {
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('a', 1, 1, 'x', 'x')").run();
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('b', 0, 1, 'x', 'x')").run();
    const [pa, pb] = (prepared('SELECT id FROM partita ORDER BY id').all() as Array<{ id: number }>).map((r) => r.id);
    // stato «vecchio seed»: partita a con la domanda (0), il Palazzo (1, con effetti) e la Stanza di Velluto (2); partita b solo la Stanza di Velluto (2)
    const ins = prepared('INSERT INTO azione_partita (partita_id, data, indice, effetti_json, updated_at) VALUES (?, ?, ?, ?, ?)');
    const effetti = JSON.stringify({ doti: [{ chiave: 'coraggio', punti: 2 }] });
    ins.run(pa, DATA_11_APRILE, 0, null, 'x');
    ins.run(pa, DATA_11_APRILE, 1, effetti, 'x');
    ins.run(pa, DATA_11_APRILE, 2, null, 'x');
    ins.run(pb, DATA_11_APRILE, 2, null, 'x');
    ins.run(pa, '04-12', 0, null, 'x');
    expect(rimappaAzioniUndiciAprile(getDb())).toEqual({ tolte: 1, scalate: 3 });
    const righe = prepared('SELECT partita_id, data, indice, effetti_json FROM azione_partita ORDER BY partita_id, data, indice').all() as Array<{ partita_id: number; data: string; indice: number; effetti_json: string | null }>;
    expect(righe).toEqual([
      { partita_id: pa, data: DATA_11_APRILE, indice: 0, effetti_json: effetti },
      { partita_id: pa, data: DATA_11_APRILE, indice: 1, effetti_json: null },
      { partita_id: pa, data: '04-12', indice: 0, effetti_json: null },
      { partita_id: pb, data: DATA_11_APRILE, indice: 1, effetti_json: null },
    ]);
  });
});
