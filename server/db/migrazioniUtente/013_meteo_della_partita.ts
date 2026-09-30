// ============================================================
// utente 013 — il meteo di un giorno nella partita, di giorno e di sera
// ============================================================
//
// Scelta dell'utente (2026-09-30): il meteo si segna nella partita (Partita → Oggi), separato per fascia, perché il
// gioco non sempre fa quello della guida e per 58 giorni la guida non lo dice. Una fascia a NULL vuol dire «vale quello
// della guida» (`meteoService`). Su un file nato dopo questa migrazione la tabella esiste già (`schemaUtente.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente013: Migration = {
  id: 13,
  name: 'meteo_della_partita',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.meteo_partita (
      partita_id  INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      data        TEXT NOT NULL,
      giorno      TEXT CHECK (giorno IS NULL OR giorno IN ('sereno','nuvoloso','pioggia','neve')),
      sera        TEXT CHECK (sera IS NULL OR sera IN ('sereno','nuvoloso','pioggia','neve')),
      updated_at  TEXT NOT NULL,
      PRIMARY KEY (partita_id, data)
    )`);
  },
};
