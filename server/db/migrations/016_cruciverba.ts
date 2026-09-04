// ============================================================
// Migrazione 016 — cruciverba di Leblanc (+Conoscenza) con stato per partita (Fase 7.5)
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_016 = `
CREATE TABLE cruciverba (
  data         TEXT PRIMARY KEY,               -- 'MM-GG' del calendario di gioco
  ordine       INTEGER NOT NULL,
  indizio      TEXT NOT NULL,
  risposta     TEXT NOT NULL,
  risposta_en  TEXT,
  fonte        TEXT NOT NULL DEFAULT ''
);
CREATE TABLE cruciverba_partita (
  partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  data        TEXT NOT NULL REFERENCES cruciverba(data) ON DELETE CASCADE,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (partita_id, data)
);
`;

/** Cruciverba con risposte e spunta per partita. */
export const migration016: Migration = {
  id: 16,
  name: 'cruciverba',
  up: (db) => {
    db.exec(SQL_016);
  },
};
