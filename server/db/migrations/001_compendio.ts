// ============================================================
// Migrazione 001 — dati di gioco (compendio Royal) + traduzioni + meta seed
// ============================================================
//
// Tutte le tabelle di questa migrazione sono RIGENERABILI dal seed
// (data/seed/*.json) tramite server/services/seed/caricaSeed.ts.
// Convenzioni:
//   - chiavi identificative canoniche (inglese Royal) in colonne `nome`/`chiave`;
//     la resa italiana vive in `traduzione`;
//   - id interi stabili per persona/skill/oggetto (il caricatore fa upsert per
//     nome, così i dati utente che li referenziano sopravvivono ai reseed);
//   - booleani come INTEGER 0/1; liste rare come JSON in colonne `_json`.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_001 = `
-- Metadati del seed caricato (versione, hash, data): usati per il reseed idempotente.
CREATE TABLE seed_meta (
  chiave  TEXT PRIMARY KEY,
  valore  TEXT NOT NULL
);

CREATE TABLE arcana (
  chiave  TEXT PRIMARY KEY,           -- 'Fool', 'Magician', …, 'World'
  ordine  INTEGER NOT NULL UNIQUE,    -- posizione nella tabella di fusione
  numero  INTEGER                     -- numero del tarocco (NULL per Faith/Councillor)
);

CREATE TABLE persona (
  id                       INTEGER PRIMARY KEY,
  nome                     TEXT NOT NULL UNIQUE,
  arcana                   TEXT NOT NULL REFERENCES arcana(chiave),
  livello                  INTEGER NOT NULL,
  eredita                  TEXT,                                  -- tipo di eredità; NULL per i Demoni del Tesoro
  speciale                 INTEGER NOT NULL DEFAULT 0,
  rara                     INTEGER NOT NULL DEFAULT 0,
  dlc                      INTEGER NOT NULL DEFAULT 0,
  richiede_confidente_max  INTEGER NOT NULL DEFAULT 0,
  nota                     TEXT,
  oggetto                  TEXT NOT NULL,
  oggetto_allarme          TEXT NOT NULL,
  oggetto_e_carta          INTEGER NOT NULL DEFAULT 0,
  tratto                   TEXT NOT NULL,                         -- nome della skill di tipo 'trait'
  forza                    INTEGER NOT NULL,
  magia                    INTEGER NOT NULL,
  resistenza               INTEGER NOT NULL,
  agilita                  INTEGER NOT NULL,
  fortuna                  INTEGER NOT NULL,
  aree_mementos_json       TEXT NOT NULL DEFAULT '[]',
  piani_mementos           TEXT
);
CREATE INDEX idx_persona_arcana_livello ON persona(arcana, livello);
CREATE INDEX idx_persona_livello ON persona(livello);

-- 10 righe per Persona (ordine degli elementi in traduzione.elementiAffinita)
CREATE TABLE persona_affinita (
  persona_id  INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  elemento    TEXT NOT NULL,           -- 'phys','gun','fire','ice','electric','wind','psy','nuclear','bless','curse'
  codice      TEXT NOT NULL,           -- '-','wk','rs','nu','rp','ab'
  PRIMARY KEY (persona_id, elemento)
);
CREATE INDEX idx_persona_affinita_elemento_codice ON persona_affinita(elemento, codice);

CREATE TABLE skill (
  id            INTEGER PRIMARY KEY,
  nome          TEXT NOT NULL UNIQUE,
  elemento      TEXT NOT NULL,         -- 'phys' … 'passive', 'trait'
  costo_tipo    TEXT NOT NULL CHECK (costo_tipo IN ('sp','hp','nessuno')),
  costo_valore  INTEGER NOT NULL DEFAULT 0,
  effetto       TEXT NOT NULL,         -- testo canonico (EN); resa IT in traduzione(ambito='effettoSkill')
  fonte_carta   TEXT,
  negoziazione  TEXT,
  unica         TEXT
);
CREATE INDEX idx_skill_elemento ON skill(elemento);

-- Persona la cui esecuzione produce la carta della skill.
CREATE TABLE skill_fonte_esecuzione (
  skill_id    INTEGER NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  persona_id  INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  PRIMARY KEY (skill_id, persona_id)
);

CREATE TABLE persona_skill (
  persona_id  INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  skill_id    INTEGER NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  livello     INTEGER NOT NULL,        -- 0 = innata
  PRIMARY KEY (persona_id, skill_id)
);
CREATE INDEX idx_persona_skill_skill ON persona_skill(skill_id);

CREATE TABLE oggetto (
  id           INTEGER PRIMARY KEY,
  nome         TEXT NOT NULL UNIQUE,
  categoria    TEXT NOT NULL,          -- 'Accessory','Weapon','Gun','Protector'
  vincolo      TEXT,                   -- 'Joker', 'Women', … o NULL
  descrizione  TEXT NOT NULL           -- canonica (EN); resa IT in traduzione(ambito='descrizioneOggetto')
);

-- Tabella di fusione: coppia non ordinata (a <= b in ordine di arcana.ordine) → arcana risultante.
CREATE TABLE fusione_arcana (
  a          TEXT NOT NULL REFERENCES arcana(chiave),
  b          TEXT NOT NULL REFERENCES arcana(chiave),
  risultato  TEXT NOT NULL REFERENCES arcana(chiave),
  PRIMARY KEY (a, b)
);

CREATE TABLE fusione_speciale (
  risultato_id  INTEGER PRIMARY KEY REFERENCES persona(id) ON DELETE CASCADE
);
CREATE TABLE fusione_speciale_ingrediente (
  risultato_id    INTEGER NOT NULL REFERENCES fusione_speciale(risultato_id) ON DELETE CASCADE,
  ingrediente_id  INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  ordine          INTEGER NOT NULL,
  PRIMARY KEY (risultato_id, ordine)
);

-- Demoni del Tesoro: ordine canonico + modificatore di rango per arcana.
CREATE TABLE tesoro (
  persona_id  INTEGER PRIMARY KEY REFERENCES persona(id) ON DELETE CASCADE,
  ordine      INTEGER NOT NULL UNIQUE
);
CREATE TABLE tesoro_modificatore (
  arcana        TEXT NOT NULL REFERENCES arcana(chiave),
  tesoro_id     INTEGER NOT NULL REFERENCES tesoro(persona_id) ON DELETE CASCADE,
  modificatore  INTEGER NOT NULL,      -- +1/+2 ranghi sopra, -1/-2 sotto
  PRIMARY KEY (arcana, tesoro_id)
);

-- Matrice di eredità: tipo (persona.eredita) × elemento della skill → ammesso.
CREATE TABLE eredita_matrice (
  tipo      TEXT NOT NULL,
  elemento  TEXT NOT NULL,
  ammesso   INTEGER NOT NULL,
  PRIMARY KEY (tipo, elemento)
);

CREATE TABLE dlc_set (
  id      INTEGER PRIMARY KEY,
  ordine  INTEGER NOT NULL UNIQUE
);
CREATE TABLE dlc_set_persona (
  set_id      INTEGER NOT NULL REFERENCES dlc_set(id) ON DELETE CASCADE,
  persona_id  INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  PRIMARY KEY (set_id, persona_id)
);

-- I 23 Confidenti (dato di gioco): nome mostrato, arcano.
CREATE TABLE confidente (
  chiave  TEXT PRIMARY KEY,            -- 'igor', 'morgana', …
  nome    TEXT NOT NULL,
  arcana  TEXT NOT NULL REFERENCES arcana(chiave),
  ordine  INTEGER NOT NULL UNIQUE
);

-- Doti sociali (dato di gioco).
CREATE TABLE dote_sociale (
  chiave  TEXT PRIMARY KEY,            -- 'conoscenza', …
  nome    TEXT NOT NULL,
  ordine  INTEGER NOT NULL UNIQUE
);

-- Resa italiana: (ambito, chiave) → testo. fonte='seed' viene aggiornata dal reseed,
-- fonte='utente' non viene MAI sovrascritta.
CREATE TABLE traduzione (
  ambito      TEXT NOT NULL,           -- 'arcana','elementoSkill','affinita','effettoSkill','descrizioneOggetto',…
  chiave      TEXT NOT NULL,
  testo       TEXT NOT NULL,
  extra_json  TEXT,                    -- es. sigla, numero
  fonte       TEXT NOT NULL DEFAULT 'seed' CHECK (fonte IN ('seed','utente')),
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (ambito, chiave)
);
`;

/** Schema del compendio Royal e delle traduzioni. */
export const migration001: Migration = {
  id: 1,
  name: 'compendio',
  up: (db) => {
    db.exec(SQL_001);
  },
};
