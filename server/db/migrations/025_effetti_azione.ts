// ============================================================
// Migrazione 025 — effetti delle azioni della guida spuntate (Fase 12.3)
// ============================================================
//
// Quando l'utente spunta un'azione del percorso, l'app applica i punti che la guida indica (Doti «+N» nelle note, note del
// Confidente scelte 1–3) e li registra qui, così togliendo la spunta vengono annullati esattamente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration025: Migration = {
  id: 25,
  name: 'effetti_azione',
  up: (db) => {
    db.exec('ALTER TABLE azione_partita ADD COLUMN effetti_json TEXT');
  },
};
