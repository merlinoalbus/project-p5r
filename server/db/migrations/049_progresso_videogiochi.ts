// ============================================================
// Migrazione 049 — round dei videogiochi e progresso per partita
// ============================================================

import type Database from 'better-sqlite3';
import type { Migration } from '../migrationRunner.js';

const ROUND = [
  ['videogioco-star-forneus', 3],
  ['videogioco-gambla-goemon', 2],
  ['videogioco-punch-ouch', 3],
  ['videogioco-train-of-life', 3],
  ['videogioco-power-intuition', 3],
  ['videogioco-golfer-sarutahiko', 3],
  ['videogioco-featherman-seeker', 3],
] as const;

export const migration049: Migration = {
  id: 49,
  name: 'progresso_videogiochi',
  up: (db: Database.Database) => {
    db.exec(`
      ALTER TABLE attivita ADD COLUMN sessioni INTEGER NOT NULL DEFAULT 1 CHECK (sessioni >= 1);
      CREATE TABLE progresso_videogioco_partita (
        partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
        videogioco_chiave TEXT NOT NULL REFERENCES attivita(chiave) ON DELETE CASCADE,
        avanzamento INTEGER NOT NULL CHECK (avanzamento >= 1),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (partita_id, videogioco_chiave)
      );
    `);
    const aggiorna = db.prepare('UPDATE attivita SET sessioni=? WHERE chiave=? AND tipo=\'videogioco\'');
    for (const [chiave, sessioni] of ROUND) aggiorna.run(sessioni, chiave);
  },
};
