// ============================================================
// Migrazione 017 — negozi e articoli (inventario) con acquisti per partita (Fase 8.2)
// ============================================================
//
// Dati di gioco dal seed `negozi.json` (guida allgamestaff + fonti secondarie segnalate da `verificato`);
// `acquisto_partita` (articolo già comprato/ottenuto) è un dato dell'utente e sopravvive al reseed grazie alle chiavi stabili.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_017 = `
CREATE TABLE negozio (
  chiave            TEXT PRIMARY KEY,
  ordine            INTEGER NOT NULL,
  nome              TEXT NOT NULL,
  luogo             TEXT NOT NULL DEFAULT '',
  luogo_chiave      TEXT REFERENCES quartiere(chiave) ON DELETE SET NULL,
  tipo              TEXT NOT NULL,
  gestore           TEXT,
  confidente_chiave TEXT REFERENCES confidente(chiave) ON DELETE SET NULL,
  orari             TEXT,
  sblocco           TEXT,
  note              TEXT,
  fonte             TEXT NOT NULL DEFAULT ''
);
CREATE TABLE articolo (
  chiave           TEXT PRIMARY KEY,                 -- '<negozio>/<articolo>'
  negozio_chiave   TEXT NOT NULL REFERENCES negozio(chiave) ON DELETE CASCADE,
  ordine           INTEGER NOT NULL,
  nome             TEXT NOT NULL,
  nome_it          TEXT,
  categoria        TEXT NOT NULL,
  per              TEXT,
  prezzo           INTEGER,
  effetto          TEXT,
  statistiche      TEXT,
  disponibile_dal  TEXT,
  condizione       TEXT,
  nota             TEXT,
  fonte            TEXT NOT NULL DEFAULT '',
  verificato       INTEGER NOT NULL DEFAULT 0 CHECK (verificato IN (0,1))
);
CREATE INDEX idx_articolo_negozio ON articolo(negozio_chiave, ordine);
CREATE TABLE acquisto_partita (
  partita_id       INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  articolo_chiave  TEXT NOT NULL REFERENCES articolo(chiave) ON DELETE CASCADE,
  updated_at       TEXT NOT NULL,
  PRIMARY KEY (partita_id, articolo_chiave)
);
`;

/** Negozi, articoli e acquisti per partita. */
export const migration017: Migration = {
  id: 17,
  name: 'negozi',
  up: (db) => {
    db.exec(SQL_017);
  },
};
