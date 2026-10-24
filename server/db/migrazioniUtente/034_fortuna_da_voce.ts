import type { Migration } from '../migrationRunner.js';

/**
 * R10-10/2: la Fortuna accesa dalla voce di Chihaya ricorda la voce che l'ha accesa (`da_voce`) e lo stato di prima (`prima_json`):
 * togliendo la spunta della voce lo stato torna com'era. L'interruttore delle Doti azzera i due campi. Nessuna riga esistente cambia.
 * Idempotente: ogni colonna si aggiunge solo se manca (un file delle partite che ce l'ha già non fa fallire l'avvio).
 */
export const utente034: Migration = {
  id: 34,
  name: 'fortuna_da_voce',
  up(db) {
    const colonne = new Set((db.prepare('PRAGMA utente.table_info(fortuna_partita)').all() as Array<{ name: string }>).map((c) => c.name));
    if (!colonne.has('da_voce')) db.exec('ALTER TABLE utente.fortuna_partita ADD COLUMN da_voce TEXT');
    if (!colonne.has('prima_json')) db.exec('ALTER TABLE utente.fortuna_partita ADD COLUMN prima_json TEXT');
  },
};
