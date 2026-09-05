// ============================================================
// Migrazione 035 — catalogo estensibile dall'utente e agenda del giorno (Fase 16.1)
// ============================================================
//
// Il catalogo (negozi e articoli, per ora) può contenere righe create dall'utente accanto a quelle del seed:
//   `origine`    'seed' | 'utente' — il caricatore del seed tocca e cancella soltanto le proprie righe
//   `nascosto`   una riga del seed che l'utente non vuole vedere (senza cancellarla: il reseed la riporterebbe)
//   `seed_json`  la riga del seed com'era, salvata quando l'utente la modifica o la nasconde: serve a «Ripristina»
//   `updated_at` quando l'utente l'ha toccata
// Le righe esistenti sono tutte del seed: il backfill lo dichiara. Il DEFAULT è 'utente' come in `spillo`/`mappa`
// (027) perché è il fallimento sicuro: una riga inserita dimenticando la colonna non viene mai cancellata dal reseed.
//
// L'agenda del giorno vive in tabelle proprie, non dentro `giorno_percorso.azioni_json` (che il seed riscrive per intero)
// né in `evento_calendario` (che il seed svuota e ricrea, con FK a cascata su `giorno_calendario`):
//   `evento_utente`          eventi e promemoria di una data; `partita_id` NULL = vale per tutte le partite
//   `azione_utente`          cose da fare di una data e fascia, con lo stesso corredo delle azioni della guida
//   `azione_utente_partita`  la spunta per partita; le note personali non applicano effetti automatici
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL = `
ALTER TABLE negozio ADD COLUMN origine TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed','utente'));
ALTER TABLE negozio ADD COLUMN nascosto INTEGER NOT NULL DEFAULT 0 CHECK (nascosto IN (0,1));
ALTER TABLE negozio ADD COLUMN seed_json TEXT;
ALTER TABLE negozio ADD COLUMN updated_at TEXT;
ALTER TABLE articolo ADD COLUMN origine TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('seed','utente'));
ALTER TABLE articolo ADD COLUMN nascosto INTEGER NOT NULL DEFAULT 0 CHECK (nascosto IN (0,1));
ALTER TABLE articolo ADD COLUMN seed_json TEXT;
ALTER TABLE articolo ADD COLUMN updated_at TEXT;
CREATE INDEX idx_negozio_origine ON negozio(origine);
CREATE INDEX idx_articolo_origine ON articolo(origine);

CREATE TABLE evento_utente (
  id                 INTEGER PRIMARY KEY,
  partita_id         INTEGER REFERENCES partita(id) ON DELETE CASCADE,
  data               TEXT NOT NULL,
  tipo               TEXT NOT NULL DEFAULT 'evento' CHECK (tipo IN ('evento','scadenza','promemoria')),
  titolo             TEXT NOT NULL,
  dettaglio          TEXT NOT NULL DEFAULT '',
  riferimento_tipo   TEXT,
  riferimento_chiave TEXT,
  ordine             INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX idx_evento_utente_data ON evento_utente(data, ordine);
CREATE INDEX idx_evento_utente_partita ON evento_utente(partita_id);

CREATE TABLE azione_utente (
  id                 INTEGER PRIMARY KEY,
  partita_id         INTEGER REFERENCES partita(id) ON DELETE CASCADE,
  data               TEXT NOT NULL,
  fascia             TEXT NOT NULL DEFAULT 'giorno' CHECK (fascia IN ('giorno','sera')),
  tipo               TEXT NOT NULL DEFAULT 'altro',
  azione             TEXT NOT NULL,
  riferimento_tipo   TEXT,
  riferimento_chiave TEXT,
  rango_atteso       INTEGER,
  note               TEXT,
  ordine             INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);
CREATE INDEX idx_azione_utente_data ON azione_utente(data, fascia, ordine);
CREATE INDEX idx_azione_utente_partita ON azione_utente(partita_id);

CREATE TABLE azione_utente_partita (
  partita_id       INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  azione_utente_id INTEGER NOT NULL REFERENCES azione_utente(id) ON DELETE CASCADE,
  fatta_at         TEXT NOT NULL,
  effetti_json     TEXT,
  PRIMARY KEY (partita_id, azione_utente_id)
);
`;

export const migration035: Migration = {
  id: 35,
  name: 'catalogo_utente',
  up: (db) => {
    db.exec(SQL);
    // tutto ciò che esiste oggi arriva dal seed
    const adesso = new Date().toISOString();
    db.prepare("UPDATE negozio SET origine = 'seed', updated_at = ?").run(adesso);
    db.prepare("UPDATE articolo SET origine = 'seed', updated_at = ?").run(adesso);
  },
};
