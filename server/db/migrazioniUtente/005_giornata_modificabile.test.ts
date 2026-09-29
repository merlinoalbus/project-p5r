// ============================================================
// Test utente 005 — tabella delle correzioni della guida e fascia degli eventi dell'utente
// ============================================================

import { closeDb, initDb, prepared } from '../dbService.js';
import { utente005 } from './005_giornata_modificabile.js';
import { caricaPacchetto } from '../../services/pacchetto/pacchettoGioco.js';

afterEach(() => closeDb());

it('su un file di prima: crea la tabella delle correzioni e dà la fascia «giorno» agli eventi già scritti; è idempotente', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  // il file delle partite com'era prima della 005
  db.exec('DROP TABLE utente.correzione_azione_guida');
  db.exec('DROP TABLE utente.evento_utente');
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

it('su un file nuovo le tabelle hanno già la forma attuale', () => {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  const colonne = (db.prepare('PRAGMA utente.table_info(evento_utente)').all() as Array<{ name: string }>).map((c) => c.name);
  expect(colonne).toContain('fascia');
  expect((db.prepare('PRAGMA utente.table_info(correzione_azione_guida)').all() as Array<{ name: string }>).map((c) => c.name))
    .toEqual(['data', 'indice', 'originale_json', 'modifiche_json', 'nascosta', 'created_at', 'updated_at']);
});
