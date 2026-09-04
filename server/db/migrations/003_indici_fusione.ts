// ============================================================
// Migrazione 003 — indici per le query del motore di fusione
// ============================================================
//
// Ricerca inversa (quali coppie danno un arcano), ricette speciali per
// ingrediente, carte abilità ottenibili da una Persona, traduzioni per ambito.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_003 = `
CREATE INDEX idx_fusione_arcana_risultato ON fusione_arcana(risultato);
CREATE INDEX idx_fusione_speciale_ingrediente_persona ON fusione_speciale_ingrediente(ingrediente_id);
CREATE INDEX idx_skill_fonte_esecuzione_persona ON skill_fonte_esecuzione(persona_id);
CREATE INDEX idx_traduzione_ambito ON traduzione(ambito);
`;

/** Indici di supporto alle ricerche del motore di fusione. */
export const migration003: Migration = {
  id: 3,
  name: 'indici_fusione',
  up: (db) => {
    db.exec(SQL_003);
  },
};
