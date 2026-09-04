// ============================================================
// Migrazione 019 — trofei con stato per partita (Fase 9.1)
// ============================================================
//
// I trofei vengono dal seed `completamento.json` (guida allgamestaff); `trofeo_partita` (ottenuto) è un dato dell'utente
// e sopravvive al reseed grazie alle chiavi stabili. Finali, Covo dei Ladri, DLC, meteo, Nuova Partita+ e gestione del tempo
// sono contenuti di consultazione e vivono in `dati_guida` (chiave «completamento»).
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_019 = `
CREATE TABLE trofeo (
  chiave       TEXT PRIMARY KEY,
  ordine       INTEGER NOT NULL,
  nome         TEXT NOT NULL,
  nome_en      TEXT,
  tipo         TEXT NOT NULL CHECK (tipo IN ('bronzo','argento','oro','platino')),
  descrizione  TEXT NOT NULL DEFAULT '',
  come         TEXT NOT NULL DEFAULT '',
  mancabile    INTEGER CHECK (mancabile IN (0,1)),
  quando       TEXT,
  fonte        TEXT NOT NULL DEFAULT '',
  verificato   INTEGER NOT NULL DEFAULT 0 CHECK (verificato IN (0,1))
);
CREATE TABLE trofeo_partita (
  partita_id     INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  trofeo_chiave  TEXT NOT NULL REFERENCES trofeo(chiave) ON DELETE CASCADE,
  updated_at     TEXT NOT NULL,
  PRIMARY KEY (partita_id, trofeo_chiave)
);
`;

/** Trofei e trofei ottenuti per partita. */
export const migration019: Migration = {
  id: 19,
  name: 'trofei',
  up: (db) => {
    db.exec(SQL_019);
  },
};
