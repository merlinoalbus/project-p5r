// ============================================================
// Migrazione 040 — destinazione degli spilli
// ============================================================
//
// Crea `spillo_destinazione`: per uno spillo, la mappa e il punto (x, y in percentuale, zoom 1–6)
// a cui porta; se la mappa sparisce la destinazione resta senza mappa (ON DELETE SET NULL).
// ============================================================

import type { Migration } from '../migrationRunner.js';
export const migration040: Migration = { id: 40, name: 'destinazioni_spilli', up(db) {
  db.exec(`CREATE TABLE spillo_destinazione (
    spillo_id INTEGER PRIMARY KEY REFERENCES spillo(id) ON DELETE CASCADE,
    mappa_chiave TEXT REFERENCES mappa(chiave) ON DELETE SET NULL,
    x REAL NOT NULL CHECK(x BETWEEN 0 AND 100),
    y REAL NOT NULL CHECK(y BETWEEN 0 AND 100),
    zoom REAL NOT NULL CHECK(zoom BETWEEN 1 AND 6)
  )`);
} };
