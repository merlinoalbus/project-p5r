// ============================================================
// Migrazione 026 — requisiti per rango dei Confidenti e conferme manuali per partita (Fase 12.3)
// ============================================================
//
// `confidente_requisito` viene dal seed `confidenti-requisiti.json` (ricaricato integralmente); `requisito_partita` conserva le
// conferme manuali dell'utente per i requisiti che l'app non può verificare (acquisti, caffè, letture della fortuna…).
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_026 = `
CREATE TABLE confidente_requisito (
  confidente_chiave  TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  rango              REAL NOT NULL,
  indice             INTEGER NOT NULL,
  tipo               TEXT NOT NULL,
  dati_json          TEXT NOT NULL DEFAULT '{}',
  testo              TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (confidente_chiave, rango, indice)
);
CREATE TABLE requisito_partita (
  partita_id         INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  confidente_chiave  TEXT NOT NULL,
  rango              REAL NOT NULL,
  indice             INTEGER NOT NULL,
  confermato         INTEGER NOT NULL DEFAULT 0 CHECK (confermato IN (0,1)),
  updated_at         TEXT NOT NULL,
  PRIMARY KEY (partita_id, confidente_chiave, rango, indice)
);
`;

export const migration026: Migration = {
  id: 26,
  name: 'requisiti_confidenti',
  up: (db) => { db.exec(SQL_026); },
};
