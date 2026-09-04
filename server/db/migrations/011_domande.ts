// ============================================================
// Migrazione 011 — domande in classe ed esami (Fase 6.2)
// ============================================================
//
// Dati di gioco dal seed `domande.json` (guida allgamestaff): interrogazioni con risposta corretta per data,
// sessioni d'esame con domande in ordine e premi. `domanda_partita` è il tracking dell'utente (domanda già fatta).
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_011 = `
CREATE TABLE domanda (
  id            INTEGER PRIMARY KEY,
  ordine        INTEGER NOT NULL,
  data          TEXT NOT NULL,                 -- 'MM-GG' del calendario di gioco
  tipo          TEXT NOT NULL CHECK (tipo IN ('classe','esame-medio','esame-finale','altro')),
  chi           TEXT NOT NULL DEFAULT '',
  domanda       TEXT NOT NULL,
  risposte_json TEXT NOT NULL,                 -- [{ordine, testo}] risposte corrette in ordine (catene a più passi)
  ricompensa    TEXT NOT NULL DEFAULT '',
  note          TEXT NOT NULL DEFAULT '',
  fonte         TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_domanda_data ON domanda(data, ordine);
CREATE TABLE esame (
  chiave          TEXT PRIMARY KEY,
  ordine          INTEGER NOT NULL,
  nome            TEXT NOT NULL,
  date_json       TEXT NOT NULL,               -- giorni di svolgimento
  data_risultati  TEXT,
  domande_json    TEXT NOT NULL,               -- [{data, ordine, domanda, risposta}]
  note            TEXT NOT NULL DEFAULT ''
);
CREATE TABLE esame_premi (
  chiave  TEXT PRIMARY KEY,
  json    TEXT NOT NULL
);
CREATE TABLE domanda_partita (
  partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  domanda_id  INTEGER NOT NULL REFERENCES domanda(id) ON DELETE CASCADE,
  fatta_at    TEXT NOT NULL,
  PRIMARY KEY (partita_id, domanda_id)
);
`;

/** Domande in classe, esami e tracking delle domande fatte. */
export const migration011: Migration = {
  id: 11,
  name: 'domande',
  up: (db) => {
    db.exec(SQL_011);
  },
};
