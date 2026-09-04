// ============================================================
// Migrazione 007 — piani di fusione salvati (Fase 5.3)
// ============================================================
//
// Istantanea di un piano calcolato dal motore (albero in JSON con le opzioni usate), legata alla
// partita e facoltativamente a un obiettivo. L'avanzamento non è salvato: viene ricalcolato a ogni
// lettura sulla scorta attuale.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_007 = `
CREATE TABLE piano_salvato (
  id            INTEGER PRIMARY KEY,
  partita_id    INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  persona_id    INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  obiettivo_id  INTEGER REFERENCES obiettivo_partita(id) ON DELETE SET NULL,
  nome          TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  opzioni_json  TEXT NOT NULL DEFAULT '{}',
  skill_json    TEXT NOT NULL DEFAULT '[]',
  piano_json    TEXT NOT NULL,
  costo         INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_piano_salvato_partita ON piano_salvato(partita_id, id DESC);
CREATE INDEX idx_piano_salvato_obiettivo ON piano_salvato(obiettivo_id);
`;

/** Piani di fusione salvati. */
export const migration007: Migration = {
  id: 7,
  name: 'piani_salvati',
  up: (db) => {
    db.exec(SQL_007);
  },
};
