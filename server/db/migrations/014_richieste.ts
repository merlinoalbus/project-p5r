// ============================================================
// Migrazione 014 — Richieste dei Mementos, stato per partita e dati della guida in JSON (Jose, battaglia) (Fase 7.2)
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_014 = `
CREATE TABLE richiesta (
  chiave            TEXT PRIMARY KEY,
  ordine            INTEGER NOT NULL,
  nome              TEXT NOT NULL,
  committente       TEXT NOT NULL DEFAULT '',
  disponibile_dal   TEXT NOT NULL DEFAULT '',
  scadenza          TEXT NOT NULL DEFAULT '',
  area              TEXT NOT NULL DEFAULT '',
  area_chiave       TEXT REFERENCES dungeon_area(chiave) ON DELETE SET NULL,
  piano             TEXT NOT NULL DEFAULT '',
  bersaglio_json    TEXT NOT NULL,
  ricompense_json   TEXT NOT NULL DEFAULT '[]',
  confidente_chiave TEXT REFERENCES confidente(chiave) ON DELETE SET NULL,
  confidente_rango  INTEGER,
  note              TEXT NOT NULL DEFAULT '',
  fonte             TEXT NOT NULL DEFAULT ''
);
CREATE TABLE richiesta_partita (
  partita_id        INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  richiesta_chiave  TEXT NOT NULL REFERENCES richiesta(chiave) ON DELETE CASCADE,
  stato             TEXT NOT NULL CHECK (stato IN ('accettata','completata')),
  updated_at        TEXT NOT NULL,
  PRIMARY KEY (partita_id, richiesta_chiave)
);
CREATE TABLE dati_guida (
  chiave  TEXT PRIMARY KEY,
  json    TEXT NOT NULL
);
`;

/** Richieste dei Mementos e dati della guida in JSON. */
export const migration014: Migration = {
  id: 14,
  name: 'richieste',
  up: (db) => {
    db.exec(SQL_014);
  },
};
