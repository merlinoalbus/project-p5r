// ============================================================
// 108 — le miniature delle immagini del database (L1, variante «miniature», 2026-10-20)
// ============================================================
//
// Con «Illustrazione anche nelle schede» (scelta dell'utente, 2026-10-20) La città caricherebbe 19 illustrazioni PNG piene
// (1672×941, ~2 MB l'una) per riquadri da ~128 px; l'indice e le griglie delle Mappe già caricavano planimetrie da 1024×1024 per
// miniature da 72 px. La rotta del file di un'immagine accetta ora una larghezza (`l`, `shared/miniature.ts`) e risponde con una
// WebP ridotta, generata al primo uso (`miniatureService`) e tenuta qui.
//
// Dati derivati, non di gioco: il pacchetto ha la tabella ma mai le righe (`SOLO_SCHEMA` in pacchettoGioco, e lo script del
// pacchetto la svuota). Una miniatura vale per la versione della sorgente (`versione` = `immagine.created_at` di quando è stata
// generata): `salvaImmagine` cancella quelle dell'immagine che sostituisce, la lettura scarta le stantie, e all'avvio le orfane
// se ne vanno (`pulisciMiniatureOrfane`). Solo creazione: nessun dato convertito.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration108: Migration = {
  id: 108,
  name: 'miniature_delle_immagini',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS immagine_miniatura (
      immagine_id     INTEGER NOT NULL REFERENCES immagine(id) ON DELETE CASCADE,
      larghezza       INTEGER NOT NULL CHECK (larghezza IN (160, 320, 640, 1024)),
      versione        TEXT NOT NULL,
      mime            TEXT NOT NULL,
      byte            INTEGER NOT NULL CHECK (byte > 0),
      larghezza_reale INTEGER NOT NULL CHECK (larghezza_reale > 0),
      altezza_reale   INTEGER NOT NULL CHECK (altezza_reale > 0),
      contenuto       BLOB NOT NULL,
      created_at      TEXT NOT NULL,
      PRIMARY KEY (immagine_id, larghezza)
    )`);
  },
};
