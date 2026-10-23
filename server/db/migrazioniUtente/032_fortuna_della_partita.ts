import type { Migration } from '../migrationRunner.js';

/**
 * R10-10/2: la Fortuna è uno stato della partita — la Dote scelta e il giorno in cui è stata accesa. Si spegne da sola al cambio di
 * giorno (la riga resta come traccia, ma non vale più). Una sola riga per partita; nessun dato esistente viene toccato.
 */
export const utente032: Migration = {
  id: 32,
  name: 'fortuna_della_partita',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.fortuna_partita (
      partita_id INTEGER PRIMARY KEY REFERENCES partita(id) ON DELETE CASCADE,
      dote       TEXT NOT NULL,
      giorno     TEXT,
      acceso_il  TEXT NOT NULL
    );`);
  },
};
