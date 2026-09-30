// ============================================================
// utente 014 — l'ordine esatto delle voci di ogni fascia di un giorno della guida
// ============================================================
//
// Richiesta dell'utente (2026-09-30): le voci aggiunte alla giornata finivano sempre in fondo; ora si sceglie il punto
// esatto e si spostano su e giù tutte le voci, azioni della guida comprese. `voci_json` è la sequenza delle voci della
// fascia (chiavi `g:<indice>`, `a:<id>`, `e:<id>`): `{ chiave }` per le voci dell'utente, `{ chiave, firma }` per le azioni della guida,
// dove la firma è il testo che la guida ha a quel posto — se un pacchetto nuovo lo cambia, quella voce torna al suo posto
// naturale invece di portarsi dietro la posizione di un'altra. Vale per tutte le partite, come le correzioni della guida.
// Superata prima di essere usata (stesso giorno): l'utente ha chiesto che le modifiche alla giornata siano canone del file
// di gioco, non dati delle partite. L'ordine sta in `main.voce_giornata` (migrazione di gioco 092) e la «utente» 015 toglie
// questa tabella. Resta nella sequenza perché un'istanza l'ha già applicata (le migrazioni si aggiungono, non si riscrivono).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente014: Migration = {
  id: 14,
  name: 'ordine_della_giornata',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.ordine_giornata (
      data        TEXT NOT NULL,
      fascia      TEXT NOT NULL CHECK (fascia IN ('giorno','sera')),
      voci_json   TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      PRIMARY KEY (data, fascia)
    )`);
  },
};
