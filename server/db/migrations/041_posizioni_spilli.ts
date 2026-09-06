import type { Migration } from '../migrationRunner.js';
export const migration041: Migration = { id: 41, name: 'posizioni_spilli', up(db) {
  db.exec('ALTER TABLE spillo ADD COLUMN solo_posizione INTEGER NOT NULL DEFAULT 0 CHECK (solo_posizione IN (0, 1))');
} };
