// ============================================================
// Migrazione 022 — mappe dei quartieri (collegamenti alle immagini pubblicate) e spilli dei luoghi (Fase 8.3)
// ============================================================
//
// Come per le piante dei dungeon (migrazione 020): nel repository restano solo URL e credito; l'immagine viene scaricata
// nell'istanza al primo uso (ambito «mappa», chiave `citta-<quartiere>`). `marcatore_luogo` è la posizione dello spillo di un
// luogo sulla mappa del quartiere, con origine «seed» (preposizionato) o «utente».
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_022 = `
CREATE TABLE pianta_quartiere (
  quartiere_chiave  TEXT PRIMARY KEY REFERENCES quartiere(chiave) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  pagina            TEXT,
  fonte             TEXT NOT NULL DEFAULT '',
  licenza           TEXT NOT NULL DEFAULT '',
  larghezza         INTEGER,
  altezza           INTEGER,
  note              TEXT NOT NULL DEFAULT ''
);
CREATE TABLE marcatore_luogo (
  luogo_chiave  TEXT PRIMARY KEY REFERENCES luogo(chiave) ON DELETE CASCADE,
  x             REAL NOT NULL CHECK (x BETWEEN 0 AND 100),
  y             REAL NOT NULL CHECK (y BETWEEN 0 AND 100),
  updated_at    TEXT NOT NULL,
  origine       TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('utente','seed'))
);
`;

/** Mappe dei quartieri e spilli dei luoghi. */
export const migration022: Migration = {
  id: 22,
  name: 'piante-citta',
  up: (db) => {
    db.exec(SQL_022);
  },
};
