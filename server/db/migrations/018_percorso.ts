// ============================================================
// Migrazione 018 — guida giorno per giorno (percorso) con azioni spuntabili per partita (Fase 7.5b)
// ============================================================
//
// `giorno_percorso` viene dal seed `percorso.json` (guida allgamestaff, soluzione settimana per settimana);
// `azione_partita` (azione del giorno fatta) è un dato dell'utente, legato a data + indice dell'azione, e sopravvive al reseed.
// Il giorno corrente della partita è `partita.data_gioco` ('MM-GG'), già presente dalla migrazione 002.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_018 = `
CREATE TABLE giorno_percorso (
  data              TEXT PRIMARY KEY,              -- 'MM-GG' del calendario di gioco
  ordine            INTEGER NOT NULL,
  giorno_settimana  TEXT NOT NULL DEFAULT '',
  fase              TEXT NOT NULL DEFAULT '',
  trama             TEXT NOT NULL DEFAULT '',
  vincoli_json      TEXT NOT NULL DEFAULT '[]',
  meteo             TEXT,
  azioni_json       TEXT NOT NULL DEFAULT '[]',
  avvisi_json       TEXT NOT NULL DEFAULT '[]',
  fonte             TEXT NOT NULL DEFAULT '',
  coperto           INTEGER NOT NULL DEFAULT 1 CHECK (coperto IN (0,1))
);
CREATE TABLE azione_partita (
  partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  data        TEXT NOT NULL REFERENCES giorno_percorso(data) ON DELETE CASCADE,
  indice      INTEGER NOT NULL,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (partita_id, data, indice)
);
`;

/** Giorni del percorso e azioni fatte per partita. */
export const migration018: Migration = {
  id: 18,
  name: 'percorso',
  up: (db) => {
    db.exec(SQL_018);
  },
};
