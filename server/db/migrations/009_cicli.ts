// ============================================================
// Migrazione 009 — cicli di fusione salvati (Fase 5.5)
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_009 = `
CREATE TABLE ciclo_salvato (
  id              INTEGER PRIMARY KEY,
  partita_id      INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  persona_id      INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL DEFAULT '',
  note            TEXT NOT NULL DEFAULT '',
  anelli_json     TEXT NOT NULL,
  costo           INTEGER NOT NULL DEFAULT 0,
  iterazioni      INTEGER NOT NULL DEFAULT 0 CHECK (iterazioni >= 0),
  anello_corrente INTEGER NOT NULL DEFAULT 0 CHECK (anello_corrente >= 0),
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
CREATE INDEX idx_ciclo_salvato_partita ON ciclo_salvato(partita_id, id DESC);
`;

/** Cicli di fusione salvati. */
export const migration009: Migration = {
  id: 9,
  name: 'cicli',
  up: (db) => {
    db.exec(SQL_009);
  },
};
