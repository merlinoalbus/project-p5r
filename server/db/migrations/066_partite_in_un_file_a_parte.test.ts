// ============================================================
// Test 066 — le partite escono dal file dei dati di gioco
// ============================================================

import { closeDb, initDb } from '../dbService.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from './index.js';
import { TABELLE_UTENTE } from '../schemaUtente.js';
import { migrazioniUtente } from '../migrazioniUtente/index.js';

afterEach(() => closeDb());

it('sposta le tabelle delle partite nello schema «utente» conservando righe e id, e le toglie dal file di gioco', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 66), []);
  db.prepare("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 3, 'x', 'x')").run();
  db.prepare("INSERT INTO evento_storia_partita (partita_id, evento_chiave, avvenuto, updated_at) VALUES (7, 'mansarda-pulita', 1, 'x')").run();
  expect((db.prepare("SELECT COUNT(*) AS n FROM main.sqlite_master WHERE type = 'table' AND name = 'partita'").get() as { n: number }).n).toBe(1);

  runMigrations(db);

  for (const t of TABELLE_UTENTE) {
    expect((db.prepare("SELECT COUNT(*) AS n FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t) as { n: number }).n, `${t} ancora in main`).toBe(0);
    expect((db.prepare("SELECT COUNT(*) AS n FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(t) as { n: number }).n, `${t} assente in utente`).toBe(1);
  }
  expect(db.prepare('SELECT id, nome FROM partita').all()).toEqual([{ id: 7, nome: 'Prova' }]);
  expect(db.prepare('SELECT avvenuto FROM evento_storia_partita WHERE partita_id = 7').get()).toEqual({ avvenuto: 1 });
  expect(db.pragma('utente.user_version', { simple: true })).toBe(migrazioniUtente.length);
  // le cascate fra tabelle delle partite restano: cancellare la partita svuota le sue righe
  db.prepare('DELETE FROM partita WHERE id = 7').run();
  expect((db.prepare('SELECT COUNT(*) AS n FROM evento_storia_partita').get() as { n: number }).n).toBe(0);
});

it('su un file di gioco senza tabelle delle partite (un pacchetto) la migrazione non fa nulla e la migrazione «utente» 001 crea lo schema vuoto', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations.filter((m) => m.id < 66), []);
  // come nel runner: i vincoli spenti mentre si smonta lo schema
  db.pragma('foreign_keys = OFF');
  for (const t of TABELLE_UTENTE) db.exec(`DROP TABLE IF EXISTS main.${t}`);
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  expect(db.pragma('utente.user_version', { simple: true })).toBe(migrazioniUtente.length);
  expect((db.prepare('SELECT COUNT(*) AS n FROM partita').get() as { n: number }).n).toBe(0);
  expect((db.prepare('SELECT COUNT(*) AS n FROM utente.sqlite_master WHERE type = ?').get('table') as { n: number }).n).toBe(TABELLE_UTENTE.length);
});
