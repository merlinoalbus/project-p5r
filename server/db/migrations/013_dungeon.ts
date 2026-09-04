// ============================================================
// Migrazione 013 — dungeon (Palazzi e Dedali) con aree e punti di interesse; mappe con marcatori; tracking per partita (Fase 7.1)
// ============================================================
//
// Dati di gioco dal seed `dungeon.json` (guida allgamestaff): `dungeon`, `dungeon_area`, `punto_interesse` (chiave stabile
// `<area>/<ordine>`, upsert al reseed così marcatori e stati non si perdono). `marcatore_mappa` (posizione dello spillo
// sull'immagine importata dall'utente, in percentuale) e `punto_partita` (ottenuto/esaurito) sono dati dell'utente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_013 = `
CREATE TABLE dungeon (
  chiave              TEXT PRIMARY KEY,
  tipo                TEXT NOT NULL CHECK (tipo IN ('palazzo','mementos')),
  ordine              INTEGER NOT NULL,
  nome                TEXT NOT NULL,
  sovrano             TEXT NOT NULL DEFAULT '',
  arcana_sovrano      TEXT NOT NULL DEFAULT '',
  data_sblocco        TEXT NOT NULL DEFAULT '',
  data_scadenza       TEXT NOT NULL DEFAULT '',
  furto_consigliato   TEXT NOT NULL DEFAULT '',
  livello_consigliato TEXT NOT NULL DEFAULT '',
  note                TEXT NOT NULL DEFAULT '',
  fonti_json          TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE dungeon_area (
  chiave          TEXT PRIMARY KEY,
  dungeon_chiave  TEXT NOT NULL REFERENCES dungeon(chiave) ON DELETE CASCADE,
  ordine          INTEGER NOT NULL,
  nome            TEXT NOT NULL,
  descrizione     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_dungeon_area ON dungeon_area(dungeon_chiave, ordine);
CREATE TABLE punto_interesse (
  chiave        TEXT PRIMARY KEY,                 -- '<area>/<ordine>'
  area_chiave   TEXT NOT NULL REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
  ordine        INTEGER NOT NULL,
  tipo          TEXT NOT NULL,
  nome          TEXT NOT NULL,
  descrizione   TEXT NOT NULL DEFAULT '',
  esauribile    INTEGER NOT NULL DEFAULT 0 CHECK (esauribile IN (0,1)),
  dettagli_json TEXT NOT NULL DEFAULT '{}',
  fonte         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_punto_interesse_area ON punto_interesse(area_chiave, ordine);
CREATE TABLE marcatore_mappa (
  punto_chiave  TEXT PRIMARY KEY REFERENCES punto_interesse(chiave) ON DELETE CASCADE,
  x             REAL NOT NULL CHECK (x BETWEEN 0 AND 100),
  y             REAL NOT NULL CHECK (y BETWEEN 0 AND 100),
  updated_at    TEXT NOT NULL
);
CREATE TABLE punto_partita (
  partita_id    INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  punto_chiave  TEXT NOT NULL REFERENCES punto_interesse(chiave) ON DELETE CASCADE,
  stato         TEXT NOT NULL CHECK (stato IN ('ottenuto','esaurito')),
  updated_at    TEXT NOT NULL,
  PRIMARY KEY (partita_id, punto_chiave)
);
`;

/** Dungeon, punti di interesse, marcatori delle mappe e stato per partita. */
export const migration013: Migration = {
  id: 13,
  name: 'dungeon',
  up: (db) => {
    db.exec(SQL_013);
  },
};
