// ============================================================
// Migrazione 006 — obiettivi della partita (Fase 5.2)
// ============================================================
//
// Un obiettivo è una Persona da ottenere, con skill desiderate (id in JSON), livello minimo,
// priorità e note. Lo stato passa a «raggiunto» automaticamente quando una Persona posseduta
// soddisfa le condizioni (o a mano). Un solo obiettivo aperto per Persona e partita.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_006 = `
CREATE TABLE obiettivo_partita (
  id            INTEGER PRIMARY KEY,
  partita_id    INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  persona_id    INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  skill_json    TEXT NOT NULL DEFAULT '[]',
  livello_min   INTEGER CHECK (livello_min BETWEEN 1 AND 99),
  priorita      INTEGER NOT NULL DEFAULT 1 CHECK (priorita BETWEEN 0 AND 2),
  stato         TEXT NOT NULL DEFAULT 'aperto' CHECK (stato IN ('aperto','raggiunto','annullato')),
  note          TEXT NOT NULL DEFAULT '',
  raggiunto_at  TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_obiettivo_partita ON obiettivo_partita(partita_id, stato, priorita DESC, id);
CREATE UNIQUE INDEX idx_obiettivo_aperto_unico ON obiettivo_partita(partita_id, persona_id) WHERE stato = 'aperto';
`;

/** Obiettivi della partita. */
export const migration006: Migration = {
  id: 6,
  name: 'obiettivi',
  up: (db) => {
    db.exec(SQL_006);
  },
};
