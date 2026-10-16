// ============================================================
// utente 021 — la parte delle partite di ciò che è nel cestino
// ============================================================
//
// Il cestino (migrazione di gioco 104, 2026-10-16) tiene nel file di gioco le righe dei dati di gioco eliminate; quelle delle
// partite (spunte delle voci, «raccolto» dei pin, timbri, …) stanno qui, con lo stesso `uid` della riga di `main.cestino`: il
// pacchetto di gioco esportato non porta l'avanzamento, e sostituire il file di gioco non tocca questo. Nessun vincolo fra i due
// file (SQLite non li ha): una riga senza la sua di gioco (file di gioco sostituito) non compare nel cestino e se ne va quando
// lo si svuota.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente021: Migration = {
  id: 21,
  name: 'cestino_delle_partite',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.cestino_partite (
      uid             TEXT PRIMARY KEY,
      registro_json   TEXT NOT NULL,
      eliminato_il    TEXT NOT NULL
    )`);
  },
};
