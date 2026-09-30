// ============================================================
// utente 009 — gli incontri con i Confidenti, per dare la Dote di ogni incontro una volta sola
// ============================================================
//
// Scelta dell'utente (2026-09-30): la Dote che un Confidente dà a ogni incontro arriva da ogni incontro registrato —
// la spunta di un'azione della guida o dell'utente, il passaggio di rango o le note di risposta nella pagina
// Confidenti — e il passaggio al rango R conta una volta sola, da qualunque parte arrivi. `incontro_confidente_partita`
// tiene gli incontri: uno per Confidente, giorno e momento della giornata (nel gioco si esce con un Confidente una volta
// per fascia), con il rango verso cui vale (`verso_rango`), se è il passaggio a quel rango (`passaggio`), da dove è
// arrivato (`origine`: azione della guida, azione dell'utente, pagina) e le Doti che ha dato, per toglierle identiche.
// Su un file nato dopo questa migrazione la tabella esiste già (`schemaUtente.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente009: Migration = {
  id: 9,
  name: 'incontri_con_i_confidenti',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.incontro_confidente_partita (
      id                INTEGER PRIMARY KEY,
      partita_id        INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      confidente_chiave TEXT NOT NULL,
      data              TEXT NOT NULL DEFAULT '',
      fascia            TEXT NOT NULL DEFAULT '',
      verso_rango       INTEGER NOT NULL CHECK (verso_rango BETWEEN 1 AND 10),
      passaggio         INTEGER NOT NULL DEFAULT 0 CHECK (passaggio IN (0,1)),
      origine           TEXT NOT NULL CHECK (origine IN ('azione','mia','pagina')),
      doti_json         TEXT NOT NULL DEFAULT '[]',
      created_at        TEXT NOT NULL,
      UNIQUE (partita_id, confidente_chiave, data, fascia)
    )`);
  },
};
