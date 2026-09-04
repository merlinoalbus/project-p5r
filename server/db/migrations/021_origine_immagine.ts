// ============================================================
// Migrazione 021 — origine delle immagini importate da URL (credito della fonte effettivamente usata) (Fase 7.4)
// ============================================================
//
// `immagine.origine_url` conserva l'URL da cui l'immagine è stata scaricata (piante delle guide, import da URL
// dell'utente): serve a mostrare il credito della fonte davvero usata, anche quando la pianta è arrivata da una
// fonte alternativa. Nulla per i file caricati direttamente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

/** Colonna `origine_url` sulle immagini. */
export const migration021: Migration = {
  id: 21,
  name: 'origine-immagine',
  up: (db) => {
    db.exec('ALTER TABLE immagine ADD COLUMN origine_url TEXT;');
  },
};
