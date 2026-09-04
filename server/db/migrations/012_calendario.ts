// ============================================================
// Migrazione 012 — calendario di gioco (Fase 6.3): giorni con meteo ed eventi, consigli per settimana della guida
// ============================================================
//
// Dati di gioco dal seed `calendario.json` (guida allgamestaff + wikiwiki.jp per il meteo), ricaricati integralmente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_012 = `
CREATE TABLE giorno_calendario (
  data              TEXT PRIMARY KEY,           -- 'MM-GG'
  ordine            INTEGER NOT NULL,
  giorno_settimana  TEXT NOT NULL,
  meteo             TEXT,
  tempo_libero_json TEXT,                       -- {giorno, sera} oppure NULL se non documentato
  settimana         INTEGER                     -- numero della «Soluzione per settimana» della guida
);
CREATE TABLE evento_calendario (
  id        INTEGER PRIMARY KEY,
  data      TEXT NOT NULL REFERENCES giorno_calendario(data) ON DELETE CASCADE,
  ordine    INTEGER NOT NULL,
  tipo      TEXT NOT NULL,                      -- storia | scadenza | sblocco | esame | festa | vacanza | consiglio | meteo
  titolo    TEXT NOT NULL,
  dettaglio TEXT NOT NULL DEFAULT '',
  fonte     TEXT NOT NULL DEFAULT ''
);
CREATE INDEX idx_evento_calendario_data ON evento_calendario(data, ordine);
CREATE INDEX idx_evento_calendario_tipo ON evento_calendario(tipo);
CREATE TABLE settimana_guida (
  numero     INTEGER PRIMARY KEY,
  titolo     TEXT NOT NULL,
  periodo    TEXT NOT NULL DEFAULT '',
  url        TEXT NOT NULL DEFAULT '',
  riassunto  TEXT NOT NULL DEFAULT '',
  incertezze TEXT NOT NULL DEFAULT ''
);
`;

/** Calendario di gioco e consigli per settimana. */
export const migration012: Migration = {
  id: 12,
  name: 'calendario',
  up: (db) => {
    db.exec(SQL_012);
  },
};
