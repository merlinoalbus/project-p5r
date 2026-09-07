// ============================================================
// Migrazione 051 — libri, film e attività diventano correggibili come negozi e articoli
// ============================================================
//
// Dalla Fase 16.1 il catalogo dei negozi si corregge dall'interfaccia: si aggiunge una riga, se ne
// corregge una della guida, se ne nasconde una, e il reseed non porta via niente perché il
// caricatore tocca solo le righe `origine = 'seed'`. Le tre colonne che lo rendono possibile —
// `origine`, `nascosto`, `seed_json` — ce l'hanno però soltanto `negozio` e `articolo`.
//
// Libri, film e attività no: lì il catalogo è di sola lettura, e infatti nelle pagine nuove manca
// il pulsante per aggiungere. Questa migrazione dà loro le stesse tre colonne, così il meccanismo
// che già funziona si estende senza inventarne un altro.
//
// `origine = 'seed'` come predefinito è la scelta giusta per le righe che ci sono già: vengono
// tutte dalla guida, e devono continuare a essere aggiornate dal reseed.
// ============================================================

import type { Migration } from '../migrationRunner.js';

const TABELLE = ['libro', 'film', 'attivita'] as const;

export const migration051: Migration = {
  id: 51,
  name: 'catalogo-utente-esteso',
  up(db) {
    for (const t of TABELLE) {
      db.exec(`ALTER TABLE ${t} ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed';`);
      db.exec(`ALTER TABLE ${t} ADD COLUMN nascosto INTEGER NOT NULL DEFAULT 0;`);
      db.exec(`ALTER TABLE ${t} ADD COLUMN seed_json TEXT;`);
      db.exec(`ALTER TABLE ${t} ADD COLUMN updated_at TEXT;`);
    }
  },
};
