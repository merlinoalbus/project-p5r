// ============================================================
// Migrazione 027 — mappe a livelli e spilli dell'editor (Fase 13.1)
// ============================================================
//
// `mappa`: albero (Tokyo → quartieri → luoghi; Palazzo/Dedalo → aree) con immagine di base nell'istanza (ambito «mappa») o asset
// del repository; `spillo`: punti di interesse con coordinate in percentuale, tipo del registro `shared/spilli.ts`, riferimento
// tipizzato e flag «collezionabile»; `spillo_partita`: stato «raccolto» per partita. I marcatori esistenti (`marcatore_mappa`,
// `marcatore_luogo`) vengono trasformati in spilli da `sincronizzaMappe` (qui per le istanze esistenti, nel seed per le nuove).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { sincronizzaMappe } from '../../services/mappe/sincronizzaMappe.js';

const SQL_027 = `
CREATE TABLE mappa (
  chiave           TEXT PRIMARY KEY,
  nome             TEXT NOT NULL,
  tipo             TEXT NOT NULL CHECK (tipo IN ('citta','quartiere','luogo','palazzo','area','dedalo','generica')),
  genitore_chiave  TEXT REFERENCES mappa(chiave) ON DELETE SET NULL,
  ordine           INTEGER NOT NULL DEFAULT 0,
  immagine_chiave  TEXT,
  asset            TEXT,
  larghezza        INTEGER,
  altezza          INTEGER,
  entita_tipo      TEXT,
  entita_chiave    TEXT,
  origine          TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed','utente')),
  note             TEXT NOT NULL DEFAULT '',
  updated_at       TEXT NOT NULL
);
CREATE INDEX idx_mappa_genitore ON mappa(genitore_chiave, ordine);
CREATE TABLE spillo (
  id                 INTEGER PRIMARY KEY,
  mappa_chiave       TEXT NOT NULL REFERENCES mappa(chiave) ON DELETE CASCADE,
  tipo               TEXT NOT NULL,
  nome               TEXT NOT NULL,
  descrizione        TEXT NOT NULL DEFAULT '',
  x                  REAL NOT NULL CHECK (x BETWEEN 0 AND 100),
  y                  REAL NOT NULL CHECK (y BETWEEN 0 AND 100),
  riferimento_tipo   TEXT,
  riferimento_chiave TEXT,
  collezionabile     INTEGER NOT NULL DEFAULT 0 CHECK (collezionabile IN (0,1)),
  ordine             INTEGER NOT NULL DEFAULT 0,
  origine            TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed','utente')),
  updated_at         TEXT NOT NULL
);
CREATE INDEX idx_spillo_mappa ON spillo(mappa_chiave, ordine);
CREATE INDEX idx_spillo_riferimento ON spillo(riferimento_tipo, riferimento_chiave);
CREATE TABLE spillo_partita (
  partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  spillo_id   INTEGER NOT NULL REFERENCES spillo(id) ON DELETE CASCADE,
  raccolto    INTEGER NOT NULL DEFAULT 0 CHECK (raccolto IN (0,1)),
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (partita_id, spillo_id)
);
`;

export const migration027: Migration = {
  id: 27,
  name: 'mappe',
  up: (db) => {
    db.exec(SQL_027);
    sincronizzaMappe(db);
  },
};
