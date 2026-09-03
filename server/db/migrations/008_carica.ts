// ============================================================
// Migrazione 008 — Persona «carica» (nome giallo: creata durante l'Allarme delle fusioni) (Fase 5.4)
// ============================================================
//
// Usata come ingrediente o sacrificio cambia i bonus (+20/+25 punti alla fusione, incidente garantito alla Forca con +10/+15).
// ============================================================

import type { Migration } from '../migrationRunner.js';

/** Flag «carica» sulle Persona possedute. */
export const migration008: Migration = {
  id: 8,
  name: 'carica',
  up: (db) => {
    db.exec('ALTER TABLE persona_posseduta ADD COLUMN carica INTEGER NOT NULL DEFAULT 0 CHECK (carica IN (0,1))');
  },
};
