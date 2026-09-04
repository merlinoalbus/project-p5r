// ============================================================
// Migrazione 028 — immagini degli spilli (Fase 13.3): una o più schermate di riferimento per riconoscere l'elemento nel gioco
// ============================================================
//
// Ogni riga punta a un'immagine dell'istanza (ambito «spillo», tabella `immagine`) oppure a un asset del repository
// (`asset`, es. `spilli/citta-shibuya/3-1`), con didascalia e ordine. Le immagini dell'istanza restano nell'istanza; nel pacchetto per il
// repository entrano solo se l'utente lo chiede (mai schermate ufficiali nel repository pubblico).
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_028 = `
CREATE TABLE spillo_immagine (
  id               INTEGER PRIMARY KEY,
  spillo_id        INTEGER NOT NULL REFERENCES spillo(id) ON DELETE CASCADE,
  ordine           INTEGER NOT NULL DEFAULT 0,
  immagine_chiave  TEXT,
  asset            TEXT,
  didascalia       TEXT NOT NULL DEFAULT '',
  updated_at       TEXT NOT NULL,
  CHECK (immagine_chiave IS NOT NULL OR asset IS NOT NULL)
);
CREATE INDEX idx_spillo_immagine_spillo ON spillo_immagine(spillo_id, ordine);
`;

export const migration028: Migration = {
  id: 28,
  name: 'immagini_spilli',
  up: (db) => {
    db.exec(SQL_028);
  },
};
