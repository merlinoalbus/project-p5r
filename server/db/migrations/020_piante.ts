// ============================================================
// Migrazione 020 — piante delle aree (collegamenti alle immagini pubblicate dalle guide) e origine degli spilli (Fase 7.4)
// ============================================================
//
// `pianta_area` viene dal seed `mappe.json`: solo URL e credito della pianta, mai l'immagine (che viene scaricata nell'istanza
// dell'utente al primo uso, in `immagine` con ambito «mappa»). `marcatore_mappa.origine` distingue gli spilli preposizionati dal
// seed («seed») da quelli fissati dall'utente («utente»), che non vengono mai sovrascritti dal reseed.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const SQL_020 = `
CREATE TABLE pianta_area (
  area_chiave      TEXT PRIMARY KEY REFERENCES dungeon_area(chiave) ON DELETE CASCADE,
  url              TEXT NOT NULL,
  pagina           TEXT,
  fonte            TEXT NOT NULL DEFAULT '',
  licenza          TEXT NOT NULL DEFAULT '',
  larghezza        INTEGER,
  altezza          INTEGER,
  copertura        TEXT NOT NULL DEFAULT 'area',
  copre_aree_json  TEXT,
  note             TEXT NOT NULL DEFAULT '',
  alternative_json TEXT NOT NULL DEFAULT '[]'
);
ALTER TABLE marcatore_mappa ADD COLUMN origine TEXT NOT NULL DEFAULT 'utente' CHECK (origine IN ('utente','seed'));
`;

/** Piante delle aree e origine degli spilli. */
export const migration020: Migration = {
  id: 20,
  name: 'piante',
  up: (db) => {
    db.exec(SQL_020);
  },
};
