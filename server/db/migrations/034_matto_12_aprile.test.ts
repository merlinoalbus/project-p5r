// ============================================================
// Test migrazione 034 — spunta del Matto spostata dall'11 al 12 aprile
// ============================================================

import path from 'node:path';
import { closeDb, getDb, initDb, prepared } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { caricaSeed } from '../../services/seed/caricaSeed.js';
import { spostaSpuntaMatto } from './034_matto_12_aprile.js';

const DIR_SEED = path.resolve(import.meta.dirname, '../../../data/seed');

describe('migrazione 034 — Il Matto il 12 aprile', () => {
  beforeAll(() => {
    const db = initDb(':memory:');
    runMigrations(db);
    caricaSeed(db, DIR_SEED);
  });
  afterAll(() => closeDb());

  it('il seed: l’11 aprile ha solo il Palazzo, il 12 aprile finisce con la Stanza di Velluto (Igor, rango 1) e il requisito del Matto parte dal 12 aprile', () => {
    const g11 = JSON.parse((prepared("SELECT azioni_json FROM giorno_percorso WHERE data = '04-11'").get() as { azioni_json: string }).azioni_json) as Array<{ tipo: string }>;
    const g12 = JSON.parse((prepared("SELECT azioni_json FROM giorno_percorso WHERE data = '04-12'").get() as { azioni_json: string }).azioni_json) as Array<{ tipo: string; fascia: string; riferimento: { chiave: string } | null; rangoAtteso: number | null }>;
    expect(g11.map((a) => a.tipo)).toEqual(['palazzo']);
    expect(g12[3]).toMatchObject({ tipo: 'velluto', fascia: 'sera', riferimento: { chiave: 'igor' }, rangoAtteso: 1 });
    const req = prepared("SELECT dati_json FROM confidente_requisito WHERE confidente_chiave = 'igor' AND rango = 1 AND tipo = 'data'").get() as { dati_json: string };
    expect(JSON.parse(req.dati_json)).toMatchObject({ dal: '04-12' });
  });

  it('sposta la spunta 04-11/1 su 04-12/3 conservando gli effetti; se il 12 aprile è già spuntato la toglie soltanto', () => {
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('a', 1, 1, 'x', 'x')").run();
    prepared("INSERT INTO partita (nome, attiva, livello_protagonista, created_at, updated_at) VALUES ('b', 0, 1, 'x', 'x')").run();
    const [pa, pb] = (prepared('SELECT id FROM partita ORDER BY id').all() as Array<{ id: number }>).map((r) => r.id);
    const ins = prepared('INSERT INTO azione_partita (partita_id, data, indice, effetti_json, updated_at) VALUES (?, ?, ?, ?, ?)');
    ins.run(pa, '04-11', 0, null, 'x');
    ins.run(pa, '04-11', 1, '{"doti":[]}', 'y');
    ins.run(pb, '04-11', 1, null, 'x');
    ins.run(pb, '04-12', 3, null, 'x');
    expect(spostaSpuntaMatto(getDb())).toEqual({ spostate: 1, tolte: 1 });
    const righe = prepared('SELECT partita_id, data, indice, effetti_json FROM azione_partita ORDER BY partita_id, data, indice').all();
    expect(righe).toEqual([
      { partita_id: pa, data: '04-11', indice: 0, effetti_json: null },
      { partita_id: pa, data: '04-12', indice: 3, effetti_json: '{"doti":[]}' },
      { partita_id: pb, data: '04-12', indice: 3, effetti_json: null },
    ]);
  });
});
