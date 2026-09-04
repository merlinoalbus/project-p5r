// ============================================================
// Migrazione 015 — città (quartieri e luoghi), attività del tempo libero, libri e film con stato per partita (Fase 8.1)
// ============================================================
//
// Dati di gioco dai seed `citta.json` e `attivita.json` (guida allgamestaff, con integrazioni segnalate da `verificato`);
// `lettura_partita` (libri letti / film visti) è un dato dell'utente e sopravvive al reseed grazie alle chiavi stabili.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_015 = `
CREATE TABLE quartiere (
  chiave       TEXT PRIMARY KEY,
  ordine       INTEGER NOT NULL,
  nome         TEXT NOT NULL,
  sblocco      TEXT,
  descrizione  TEXT NOT NULL DEFAULT '',
  fonte        TEXT NOT NULL DEFAULT ''
);
CREATE TABLE luogo (
  chiave           TEXT PRIMARY KEY,                 -- '<quartiere>/<luogo>'
  quartiere_chiave TEXT NOT NULL REFERENCES quartiere(chiave) ON DELETE CASCADE,
  ordine           INTEGER NOT NULL,
  tipo             TEXT NOT NULL,
  nome             TEXT NOT NULL,
  cosa_offre       TEXT NOT NULL DEFAULT '',
  quando           TEXT,
  giorni           TEXT,
  sblocco          TEXT,
  confidenti_json  TEXT NOT NULL DEFAULT '[]',
  attivita_json    TEXT NOT NULL DEFAULT '[]',
  negozio          TEXT,
  piatti_json      TEXT,
  note             TEXT,
  fonte            TEXT NOT NULL DEFAULT '',
  verificato       INTEGER NOT NULL DEFAULT 0 CHECK (verificato IN (0,1))
);
CREATE INDEX idx_luogo_quartiere ON luogo(quartiere_chiave, ordine);
CREATE TABLE attivita (
  chiave         TEXT PRIMARY KEY,
  ordine         INTEGER NOT NULL,
  nome           TEXT NOT NULL,
  tipo           TEXT NOT NULL,
  luogo          TEXT NOT NULL DEFAULT '',
  luogo_chiave   TEXT REFERENCES quartiere(chiave) ON DELETE SET NULL,
  fascia         TEXT,
  costo          INTEGER,
  sblocco        TEXT,
  doti_json      TEXT NOT NULL DEFAULT '[]',
  altri_effetti  TEXT,
  regole         TEXT NOT NULL DEFAULT '',
  premi          TEXT,
  paga           TEXT,
  fonte          TEXT NOT NULL DEFAULT '',
  verificato     INTEGER NOT NULL DEFAULT 0 CHECK (verificato IN (0,1))
);
CREATE TABLE libro (
  chiave          TEXT PRIMARY KEY,
  ordine          INTEGER NOT NULL,
  nome            TEXT NOT NULL,
  nome_it         TEXT,
  dove            TEXT NOT NULL DEFAULT '',
  prezzo          INTEGER,
  disponibile_dal TEXT,
  dote            TEXT,
  note            INTEGER,
  sblocca         TEXT,
  sessioni        INTEGER,
  dettagli        TEXT,
  fonte           TEXT NOT NULL DEFAULT '',
  verificato      INTEGER NOT NULL DEFAULT 0 CHECK (verificato IN (0,1))
);
CREATE TABLE film (
  chiave      TEXT PRIMARY KEY,
  ordine      INTEGER NOT NULL,
  nome        TEXT NOT NULL,
  nome_it     TEXT,
  dove        TEXT NOT NULL CHECK (dove IN ('cinema','dvd')),
  periodo     TEXT NOT NULL DEFAULT '',
  dote        TEXT,
  note        INTEGER,
  prezzo      INTEGER,
  dettagli    TEXT,
  fonte       TEXT NOT NULL DEFAULT '',
  verificato  INTEGER NOT NULL DEFAULT 0 CHECK (verificato IN (0,1))
);
CREATE TABLE lettura_partita (
  partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL CHECK (tipo IN ('libro','film')),
  chiave      TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (partita_id, tipo, chiave)
);
`;

/** Quartieri, luoghi, attività, libri, film e letture per partita. */
export const migration015: Migration = {
  id: 15,
  name: 'citta',
  up: (db) => {
    db.exec(SQL_015);
  },
};
