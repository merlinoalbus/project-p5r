// ============================================================
// utente 025 — gli inviti dei Confidenti registrati nella partita (L6 «Condizioni uniche», lotti/L6/modifiche.md §1)
// ============================================================
//
// Decisione dell'utente (2026-10-20): un invito («X ti ha chiesto di uscire») è un evento della partita che apre un luogo o un quartiere.
// Si registra col gesto «Invito avvenuto» dalla pagina del Confidente o del posto che apre (`voce_uid` NULL) oppure, da L10, con la spunta
// della voce del diario che lo cita (`voce_uid` della voce). La condizione `invito{invito}` è vera quando la riga c'è. Il file delle partite
// non ha chiavi verso quello di gioco: un invito che sparisce lascia la riga orfana (`RIFERIMENTI_PARTITE`). Con la partita la riga cade.
// Tabella nuova e vuota: nessun dato dell'utente cambia. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente025: Migration = {
  id: 25,
  name: 'inviti_della_partita',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.invito_partita (
      partita_id    INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      invito_chiave TEXT NOT NULL,
      voce_uid      TEXT,
      creato_il     TEXT NOT NULL,
      PRIMARY KEY (partita_id, invito_chiave)
    )`);
  },
};
