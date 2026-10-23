import type { Migration } from '../migrationRunner.js';

/**
 * R10-10/2: la Fortuna accesa dalla voce di Chihaya ricorda la voce che l'ha accesa (`da_voce`) e lo stato di prima (`prima_json`):
 * togliendo la spunta della voce lo stato torna com'era. L'interruttore delle Doti azzera i due campi. Nessuna riga esistente cambia.
 */
export const utente034: Migration = {
  id: 34,
  name: 'fortuna_da_voce',
  up(db) {
    db.exec('ALTER TABLE utente.fortuna_partita ADD COLUMN da_voce TEXT');
    db.exec('ALTER TABLE utente.fortuna_partita ADD COLUMN prima_json TEXT');
  },
};
