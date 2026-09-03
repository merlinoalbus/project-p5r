// ============================================================
// Migrazione 010 — dettaglio dei Confidenti (Fase 6.1): abilità per rango, dialoghi con risposte migliori, regali, disponibilità
// ============================================================
//
// Dati di gioco dal seed `confidenti-dettaglio.json` (guida allgamestaff), ricaricati a ogni cambio di hash del seed.
// `regalo_partita` è tracking dell'utente: regali già consegnati in una partita.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_010 = `
CREATE TABLE confidente_abilita (
  confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  rango             INTEGER NOT NULL CHECK (rango BETWEEN 1 AND 10),
  ordine            INTEGER NOT NULL,
  nome              TEXT NOT NULL,
  descrizione       TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (confidente_chiave, rango, ordine)
);
CREATE TABLE confidente_dialogo (
  id                INTEGER PRIMARY KEY,
  confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  ordine            INTEGER NOT NULL,
  rango             REAL,                       -- NULL se l'etichetta non è un rango numerico (es. "1-6")
  etichetta         TEXT NOT NULL,
  note              TEXT NOT NULL DEFAULT '',
  scelte_json       TEXT NOT NULL               -- [{ordine, testo, punti, puntiTesto, romantica, avviso}]
);
CREATE INDEX idx_confidente_dialogo ON confidente_dialogo(confidente_chiave, ordine);
CREATE TABLE confidente_regalo (
  confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  ordine            INTEGER NOT NULL,
  nome              TEXT NOT NULL,
  dove              TEXT,
  costo             TEXT,
  effetto           TEXT,
  sconsigliato      INTEGER NOT NULL DEFAULT 0 CHECK (sconsigliato IN (0,1)),
  PRIMARY KEY (confidente_chiave, ordine)
);
CREATE TABLE confidente_disponibilita (
  confidente_chiave TEXT PRIMARY KEY REFERENCES confidente(chiave) ON DELETE CASCADE,
  giorni_json       TEXT NOT NULL DEFAULT '[]',
  fasce_json        TEXT NOT NULL DEFAULT '[]',
  luogo             TEXT NOT NULL DEFAULT '',
  sblocco_data      TEXT NOT NULL DEFAULT '',
  sblocco_requisiti TEXT NOT NULL DEFAULT '',
  note              TEXT NOT NULL DEFAULT '',
  note_generali     TEXT NOT NULL DEFAULT '',
  fonti_json        TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE regalo_partita (
  partita_id        INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  regalo            TEXT NOT NULL,
  fatto_at          TEXT NOT NULL,
  PRIMARY KEY (partita_id, confidente_chiave, regalo)
);
`;

/** Dettaglio dei Confidenti e regali consegnati per partita. */
export const migration010: Migration = {
  id: 10,
  name: 'confidenti_dettaglio',
  up: (db) => {
    db.exec(SQL_010);
  },
};
