// ============================================================
// Test utente 024 — le tabelle di L4 con la cascata sulla partita
// ============================================================

import { closeDb, prepared } from '../dbService.js';
import { utente024 } from './024_cascata_delle_tabelle_di_l4.js';
import { dbDiProva } from '../../../test/dbDiProva.js';

afterEach(() => closeDb());

it('ricostruisce le due tabelle senza chiave: righe copiate com’erano, orfane tolte, poi la cascata vale; idempotente', () => {
  const db = dbDiProva();
  prepared("INSERT INTO partita (id, nome, attiva, livello_protagonista, created_at, updated_at) VALUES (7, 'Prova', 1, 1, 'x', 'x')").run();
  // le tabelle com'erano prima della 024 (utente 022 e 023), con una riga buona e una orfana (partita 99)
  db.exec(`DROP TABLE utente.divergenza_partita; CREATE TABLE utente.divergenza_partita (partita_id INTEGER NOT NULL, spillo_uid TEXT NOT NULL,
    voce_chiave TEXT NOT NULL, rilevata_il TEXT NOT NULL, PRIMARY KEY (partita_id, spillo_uid, voce_chiave))`);
  db.exec(`DROP TABLE utente.spillo_partita_infiltrazione; CREATE TABLE utente.spillo_partita_infiltrazione (partita_id INTEGER NOT NULL,
    spillo_uid TEXT NOT NULL, infiltrazione_chiave TEXT NOT NULL, raccolto INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL,
    PRIMARY KEY (partita_id, spillo_uid, infiltrazione_chiave))`);
  prepared("INSERT INTO divergenza_partita VALUES (7, 'a', 'v', 'r1'), (99, 'b', 'v', 'r2')").run();
  prepared("INSERT INTO spillo_partita_infiltrazione VALUES (7, 'a', 'i', 1, 'u1'), (99, 'b', 'i', 1, 'u2')").run();
  utente024.up(db);
  expect(prepared('SELECT * FROM divergenza_partita').all()).toEqual([{ partita_id: 7, spillo_uid: 'a', voce_chiave: 'v', rilevata_il: 'r1' }]);
  expect(prepared('SELECT * FROM spillo_partita_infiltrazione').all()).toEqual([{ partita_id: 7, spillo_uid: 'a', infiltrazione_chiave: 'i', raccolto: 1, updated_at: 'u1' }]);
  // idempotente
  utente024.up(db);
  expect(prepared('SELECT COUNT(*) FROM spillo_partita_infiltrazione').pluck().get()).toBe(1);
  // la cascata
  prepared('DELETE FROM partita WHERE id = 7').run();
  expect([prepared('SELECT COUNT(*) FROM divergenza_partita').pluck().get(), prepared('SELECT COUNT(*) FROM spillo_partita_infiltrazione').pluck().get()]).toEqual([0, 0]);
});
