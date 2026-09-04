// ============================================================
// Migrazione 024 — descrizione delle Persona (Fase 12.9)
// ============================================================
//
// Testo originale in italiano sull'origine mitologica, folcloristica, religiosa o letteraria della figura (mai il testo del gioco),
// con l'indicazione sintetica della fonte; caricato da `data/seed/descrizioni-persona.json` (upsert per nome).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration024: Migration = {
  id: 24,
  name: 'descrizione_persona',
  up: (db) => {
    db.exec("ALTER TABLE persona ADD COLUMN descrizione TEXT NOT NULL DEFAULT ''");
    db.exec("ALTER TABLE persona ADD COLUMN fonte_descrizione TEXT NOT NULL DEFAULT ''");
  },
};
