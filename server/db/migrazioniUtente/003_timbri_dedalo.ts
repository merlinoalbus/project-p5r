// ============================================================
// utente 003 — i timbri raccolti in ogni dedalo dei Memento, per partita
// ============================================================
//
// Il totale dei timbri di un dedalo sta nel file di gioco (`dungeon_area.timbri_totale`,
// migrazione 077); quanti ne ha raccolti una partita sta qui. `area_chiave` rimanda a
// `dungeon_area` nell'altro file: nessun vincolo fra i due (SQLite non li applica), la chiave è
// stabile. Su un file nato dopo questa migrazione la tabella esiste già (`schemaUtente.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente003: Migration = {
  id: 3,
  name: 'timbri_dedalo',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.timbri_dedalo_partita (
      partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      area_chiave TEXT NOT NULL,
      raccolti    INTEGER NOT NULL CHECK (raccolti >= 0),
      updated_at  TEXT NOT NULL,
      PRIMARY KEY (partita_id, area_chiave)
    )`);
  },
};
