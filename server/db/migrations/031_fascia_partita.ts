// ============================================================
// Migrazione 031 — momento della giornata della partita (Fase 15.23)
// ============================================================
//
// `fascia_gioco` è la fascia corrente della partita, «giorno» (mattina, pranzo, pomeriggio, dopo scuola) o «sera», le stesse due fasce
// della guida giorno per giorno. La imposta l'utente dalla scheda «Oggi»; torna a «giorno» quando cambia il giorno corrente. Serve a
// valutare le condizioni «solo di giorno» / «solo di sera» di spilli, articoli e negozi. Il vincolo sui valori è nello schema zod e
// nel servizio (ALTER TABLE di SQLite non aggiunge CHECK).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration031: Migration = {
  id: 31,
  name: 'fascia_partita',
  up: (db) => {
    db.exec("ALTER TABLE partita ADD COLUMN fascia_gioco TEXT NOT NULL DEFAULT 'giorno'");
  },
};
