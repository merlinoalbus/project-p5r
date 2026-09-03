// ============================================================
// Test migrationRunner — ordine, idempotenza, transazionalità
// ============================================================

import { closeDb, initDb, prepared } from './dbService.js';
import { runMigrations, type Migration } from './migrationRunner.js';

describe('runMigrations', () => {
  beforeEach(() => {
    initDb(':memory:');
  });

  afterEach(() => {
    closeDb();
  });

  it('applica le migrazioni in ordine di id e aggiorna user_version', () => {
    const db = initDb(':memory:');
    const applicate: number[] = [];
    const lista: Migration[] = [
      { id: 2, name: 'seconda', up: (d) => { d.exec('CREATE TABLE b (id INTEGER)'); applicate.push(2); } },
      { id: 1, name: 'prima', up: (d) => { d.exec('CREATE TABLE a (id INTEGER)'); applicate.push(1); } },
    ];
    runMigrations(db, lista);
    expect(applicate).toEqual([1, 2]);
    expect(db.pragma('user_version', { simple: true })).toBe(2);
  });

  it('è idempotente: una seconda esecuzione non riapplica nulla', () => {
    const db = initDb(':memory:');
    let conteggio = 0;
    const lista: Migration[] = [{ id: 1, name: 'unica', up: () => { conteggio++; } }];
    runMigrations(db, lista);
    runMigrations(db, lista);
    expect(conteggio).toBe(1);
  });

  it('una migrazione fallita non aggiorna user_version (transazione)', () => {
    const db = initDb(':memory:');
    const lista: Migration[] = [
      { id: 1, name: 'ok', up: (d) => d.exec('CREATE TABLE ok (id INTEGER)') },
      { id: 2, name: 'rotta', up: (d) => { d.exec('CREATE TABLE parziale (id INTEGER)'); throw new Error('boom'); } },
    ];
    expect(() => runMigrations(db, lista)).toThrow('boom');
    expect(db.pragma('user_version', { simple: true })).toBe(1);
    const tabelle = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as Array<{ name: string }>;
    expect(tabelle.map((t) => t.name)).toEqual(['ok']);
  });

  it('prepared() cachea gli statement per connessione', () => {
    initDb(':memory:').exec('CREATE TABLE t (v TEXT)');
    const s1 = prepared('SELECT COUNT(*) AS n FROM t');
    const s2 = prepared('SELECT COUNT(*) AS n FROM t');
    expect(s1).toBe(s2);
    expect((s1.get() as { n: number }).n).toBe(0);
  });
});
