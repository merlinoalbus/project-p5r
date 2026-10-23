// ============================================================
// Utente 040 — il piazzamento agli esami di ogni partita (R9-08, G-016c / G-020)
// ============================================================
//
// Il bonus dell'esame sui punti dei sette Confidenti dipende da dove ci si è piazzati all'ultimo esame (primo in classifica, nei primi 10,
// altrove) e vale fino ai risultati dell'esame successivo. Il piazzamento si registra per partita ed esame: una riga per coppia. Senza riga
// il moltiplicatore non si applica. La tabella nasce vuota: nessuna riga esistente cambia. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente040: Migration = {
  id: 40,
  name: 'piazzamento_esami',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.esame_piazzamento_partita (
      partita_id   INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      esame_chiave TEXT NOT NULL,
      piazzamento  TEXT NOT NULL CHECK (piazzamento IN ('primo', 'primi-10', 'altro')),
      updated_at   TEXT NOT NULL,
      PRIMARY KEY (partita_id, esame_chiave)
    )`);
  },
};
