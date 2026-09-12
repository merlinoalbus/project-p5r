// ============================================================
// utente 002 — «raccolto» segue l'uid dello spillo, non il suo id
// ============================================================
//
// La tabella `spillo_partita` nasceva legata a `spillo.id`, un numero del file di gioco che
// cambia quando gli spilli vengono reimportati o il file sostituito. Dalla 067 di gioco.db ogni
// spillo ha un `uid` stabile: qui la tabella viene ricostruita con `spillo_uid`, traducendo le righe
// esistenti con un JOIN sul file di gioco (attaccato alla stessa connessione). Le righe il cui
// spillo non esiste più cadono: erano già orfane.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente002: Migration = {
  id: 2,
  name: 'spilli_raccolti_per_uid',
  up(db) {
    const colonne = (db.prepare('PRAGMA utente.table_info(spillo_partita)').all() as Array<{ name: string }>).map((c) => c.name);
    if (colonne.includes('spillo_uid')) return;
    db.exec(`CREATE TABLE utente.spillo_partita_nuova (
      partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      spillo_uid  TEXT NOT NULL,
      raccolto    INTEGER NOT NULL DEFAULT 0 CHECK (raccolto IN (0,1)),
      updated_at  TEXT NOT NULL,
      PRIMARY KEY (partita_id, spillo_uid)
    )`);
    const spilloConUid = (db.prepare('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).some((c) => c.name === 'uid');
    if (colonne.includes('spillo_id') && spilloConUid) {
      db.exec(`INSERT OR IGNORE INTO utente.spillo_partita_nuova (partita_id, spillo_uid, raccolto, updated_at)
        SELECT p.partita_id, s.uid, p.raccolto, p.updated_at FROM utente.spillo_partita p JOIN main.spillo s ON s.id = p.spillo_id`);
    }
    db.exec('DROP TABLE utente.spillo_partita');
    db.exec('ALTER TABLE utente.spillo_partita_nuova RENAME TO spillo_partita');
  },
};
