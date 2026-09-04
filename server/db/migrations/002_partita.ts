// ============================================================
// Migrazione 002 — dati utente: partite multiple e tracking
// ============================================================
//
// Ogni tabella di tracking ha `partita_id` con ON DELETE CASCADE: cancellare
// una partita rimuove tutto il suo stato. Una sola partita è "attiva"
// (indice parziale univoco). Queste tabelle NON vengono mai toccate dal seed.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_002 = `
CREATE TABLE partita (
  id                    INTEGER PRIMARY KEY,
  nome                  TEXT NOT NULL,
  note                  TEXT NOT NULL DEFAULT '',
  attiva                INTEGER NOT NULL DEFAULT 0 CHECK (attiva IN (0,1)),
  livello_protagonista  INTEGER NOT NULL DEFAULT 1 CHECK (livello_protagonista BETWEEN 1 AND 99),
  data_gioco            TEXT,                                   -- 'MM-GG' del calendario di gioco, opzionale
  difficolta            TEXT NOT NULL DEFAULT 'normale'
                        CHECK (difficolta IN ('sicura','facile','normale','difficile','spietata')),
  nuova_partita_plus    INTEGER NOT NULL DEFAULT 0 CHECK (nuova_partita_plus IN (0,1)),
  dlc_posseduti_json    TEXT NOT NULL DEFAULT '[]',             -- indici dei dlc_set posseduti
  allarme_attivo        INTEGER NOT NULL DEFAULT 0 CHECK (allarme_attivo IN (0,1)),
  created_at            TEXT NOT NULL,
  updated_at            TEXT NOT NULL
);
CREATE UNIQUE INDEX idx_partita_attiva ON partita(attiva) WHERE attiva = 1;

-- Compendio personale: Persona registrate nel compendio della Stanza di Velluto.
CREATE TABLE compendio_partita (
  partita_id          INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  persona_id          INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  registrata          INTEGER NOT NULL DEFAULT 1 CHECK (registrata IN (0,1)),
  livello_registrato  INTEGER,
  updated_at          TEXT NOT NULL,
  PRIMARY KEY (partita_id, persona_id)
);

-- Persona attualmente possedute (istanze: la stessa Persona può comparire una sola volta per partita).
CREATE TABLE persona_posseduta (
  id                INTEGER PRIMARY KEY,
  partita_id        INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  persona_id        INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  livello           INTEGER NOT NULL CHECK (livello BETWEEN 1 AND 99),
  forza             INTEGER,                                    -- statistiche attuali (NULL = base della Persona)
  magia             INTEGER,
  resistenza        INTEGER,
  agilita           INTEGER,
  fortuna           INTEGER,
  tratto_skill_id   INTEGER REFERENCES skill(id) ON DELETE SET NULL,   -- NULL = tratto proprio
  in_squadra        INTEGER NOT NULL DEFAULT 1 CHECK (in_squadra IN (0,1)),
  note              TEXT NOT NULL DEFAULT '',
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL,
  UNIQUE (partita_id, persona_id)
);

-- Skill attualmente conosciute dalla Persona posseduta (max 8 slot).
CREATE TABLE persona_posseduta_skill (
  posseduta_id  INTEGER NOT NULL REFERENCES persona_posseduta(id) ON DELETE CASCADE,
  slot          INTEGER NOT NULL CHECK (slot BETWEEN 1 AND 8),
  skill_id      INTEGER NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  PRIMARY KEY (posseduta_id, slot),
  UNIQUE (posseduta_id, skill_id)
);

-- Stato dei Confidenti nella partita.
CREATE TABLE confidente_partita (
  partita_id        INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  confidente_chiave TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  sbloccato         INTEGER NOT NULL DEFAULT 0 CHECK (sbloccato IN (0,1)),
  rango             INTEGER NOT NULL DEFAULT 0 CHECK (rango BETWEEN 0 AND 10),
  note              TEXT NOT NULL DEFAULT '',
  updated_at        TEXT NOT NULL,
  PRIMARY KEY (partita_id, confidente_chiave)
);

-- Punteggio delle Doti sociali nella partita.
CREATE TABLE dote_sociale_partita (
  partita_id   INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  dote_chiave  TEXT NOT NULL REFERENCES dote_sociale(chiave) ON DELETE CASCADE,
  punti        INTEGER NOT NULL DEFAULT 0 CHECK (punti >= 0),
  updated_at   TEXT NOT NULL,
  PRIMARY KEY (partita_id, dote_chiave)
);

-- Immagini caricate dall'utente (arcani, Confidenti, Persona…): file in DATA_DIR/immagini/.
CREATE TABLE immagine (
  id          INTEGER PRIMARY KEY,
  ambito      TEXT NOT NULL,            -- 'arcana','confidente','persona','altro'
  chiave      TEXT NOT NULL,            -- chiave dell'entità (es. 'Fool', 'morgana', nome Persona)
  nome_file   TEXT NOT NULL,            -- nome del file salvato sul disco
  mime        TEXT NOT NULL,
  byte        INTEGER NOT NULL,
  created_at  TEXT NOT NULL,
  UNIQUE (ambito, chiave)
);
`;

/** Schema dei dati utente (partite multiple, tracking, immagini). */
export const migration002: Migration = {
  id: 2,
  name: 'partita',
  up: (db) => {
    db.exec(SQL_002);
  },
};
