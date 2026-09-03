// ============================================================
// Migrazione 004 — ranghi delle Doti sociali e punti dei Confidenti
// ============================================================
//
// - dote_sociale_rango: i 5 ranghi di ogni dote (titolo italiano, soglia in
//   punti) — dato di gioco caricato dal seed (doti.json).
// - confidente_rango: punti necessari per passare da `rango` a `rango + 1`
//   (dato di gioco; NULL/assente = non documentato o avanzamento da storia).
// - confidente_partita.punti: punti accumulati verso il rango successivo.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_004 = `
CREATE TABLE dote_sociale_rango (
  dote_chiave  TEXT NOT NULL REFERENCES dote_sociale(chiave) ON DELETE CASCADE,
  rango        INTEGER NOT NULL CHECK (rango BETWEEN 1 AND 5),
  nome         TEXT NOT NULL,
  soglia       INTEGER NOT NULL CHECK (soglia >= 0),
  PRIMARY KEY (dote_chiave, rango)
);

CREATE TABLE confidente_rango (
  confidente_chiave  TEXT NOT NULL REFERENCES confidente(chiave) ON DELETE CASCADE,
  rango              INTEGER NOT NULL CHECK (rango BETWEEN 1 AND 9),
  punti_necessari    INTEGER NOT NULL CHECK (punti_necessari >= 0),
  PRIMARY KEY (confidente_chiave, rango)
);

ALTER TABLE confidente_partita ADD COLUMN punti REAL NOT NULL DEFAULT 0 CHECK (punti >= 0);
`;

/** Ranghi delle Doti e punti dei Confidenti. */
export const migration004: Migration = {
  id: 4,
  name: 'ranghi_doti_confidenti',
  up: (db) => {
    db.exec(SQL_004);
  },
};
