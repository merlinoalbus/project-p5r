// ============================================================
// Migrazione 005 — storico degli eventi della partita (Fase 5.1)
// ============================================================
//
// Ogni modifica di tracking (scorta, livelli, Confidenti, Doti, compendio, Allarme, fusioni…)
// registra una riga con titolo e dettaglio in italiano e i dati grezzi in JSON.
// `persona_id` è opzionale e permette di filtrare la storia di una singola Persona.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_005 = `
CREATE TABLE evento_partita (
  id          INTEGER PRIMARY KEY,
  partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  tipo        TEXT NOT NULL,
  titolo      TEXT NOT NULL,
  dettaglio   TEXT NOT NULL DEFAULT '',
  dati_json   TEXT NOT NULL DEFAULT '{}',
  persona_id  INTEGER REFERENCES persona(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL
);
CREATE INDEX idx_evento_partita ON evento_partita(partita_id, id DESC);
CREATE INDEX idx_evento_partita_tipo ON evento_partita(partita_id, tipo, id DESC);
CREATE INDEX idx_evento_partita_persona ON evento_partita(partita_id, persona_id, id DESC);
`;

/** Storico degli eventi della partita. */
export const migration005: Migration = {
  id: 5,
  name: 'storico',
  up: (db) => {
    db.exec(SQL_005);
  },
};
