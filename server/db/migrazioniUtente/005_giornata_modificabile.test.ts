// ============================================================
// Test utente 005 — tabella delle correzioni della guida e fascia degli eventi dell'utente
// ============================================================

import { closeDb, initDb, prepared } from '../dbService.js';
import { utente005 } from './005_giornata_modificabile.js';
import { runMigrations } from '../migrationRunner.js';
import { migrations } from '../migrations/index.js';
import { migrazioniUtente } from './index.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('su un file di prima: crea la tabella delle correzioni e dà la fascia «giorno» agli eventi già scritti; è idempotente', () => {
  const db = dbDiProva();
  // il file delle partite com'era prima della 005 (dalla 015 queste tabelle non ci sono più: la giornata è canone)
  db.exec('DROP TABLE IF EXISTS utente.correzione_azione_guida');
  db.exec('DROP TABLE IF EXISTS utente.evento_utente');
  db.exec(`CREATE TABLE utente.evento_utente (
    id INTEGER PRIMARY KEY, partita_id INTEGER, data TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'evento' CHECK (tipo IN ('evento','scadenza','promemoria')),
    titolo TEXT NOT NULL, dettaglio TEXT NOT NULL DEFAULT '', riferimento_tipo TEXT, riferimento_chiave TEXT,
    ordine INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`);
  prepared("INSERT INTO evento_utente (data, titolo, created_at, updated_at) VALUES ('04-12', 'Vecchio', 't', 't')").run();

  utente005.up(db);
  expect(prepared('SELECT fascia FROM evento_utente').get()).toEqual({ fascia: 'giorno' });
  expect(() => prepared("UPDATE evento_utente SET fascia = 'notte'").run()).toThrow();
  expect((prepared("SELECT COUNT(*) AS n FROM utente.sqlite_master WHERE name = 'correzione_azione_guida'").get() as { n: number }).n).toBe(1);

  utente005.up(db);
  expect((prepared('SELECT COUNT(*) AS n FROM evento_utente').get() as { n: number }).n).toBe(1);
});

it('su un file nuovo, fino alla 014, le tabelle hanno la forma della 005 (la 015 poi le converte e le toglie)', () => {
  const db = initDb(':memory:');
  runMigrations(db, migrations, migrazioniUtente.filter((m) => m.id < 15));
  const colonne = (db.prepare('PRAGMA utente.table_info(evento_utente)').all() as Array<{ name: string }>).map((c) => c.name);
  expect(colonne).toContain('fascia');
  expect((db.prepare('PRAGMA utente.table_info(correzione_azione_guida)').all() as Array<{ name: string }>).map((c) => c.name))
    .toEqual(['data', 'indice', 'originale_json', 'modifiche_json', 'nascosta', 'created_at', 'updated_at']);
});
