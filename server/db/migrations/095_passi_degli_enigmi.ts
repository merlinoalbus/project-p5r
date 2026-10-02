// ============================================================
// 095 — L'Enigma contiene i suoi passi
// ============================================================
//
// Richiesta dell'utente (2026-10-01): «Enigma deve diventare un contenitore di sotto elementi che insieme descrivono
// l'enigma e come sbloccarlo»; e «una porta chiusa può aprirsi con un Meccanismo di sblocco... questo deve essere
// rappresentabile in guida con i relativi Pin agganciati». Scelte dell'utente: i passi sono **voci vere della guida, di
// qualunque tipo** (una Porta, un Meccanismo, una Storia, una nota…), ordinate dentro l'Enigma; l'Enigma è **risolto quando
// i passi sono fatti**; i pin stanno **solo sui passi**.
//   - `punto_interesse.contenitore_chiave`: l'Enigma (una voce «puzzle» della stessa area) a cui il passo appartiene;
//     eliminato l'Enigma, i passi tornano voci dell'area (nessuna perdita).
// Nessun dato da spostare: oggi nessuna voce è un passo.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration095: Migration = {
  id: 95,
  name: 'passi_degli_enigmi',
  up(db) {
    const colonne = (db.prepare('PRAGMA table_info(punto_interesse)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('contenitore_chiave')) {
      db.exec('ALTER TABLE punto_interesse ADD COLUMN contenitore_chiave TEXT REFERENCES punto_interesse(chiave) ON DELETE SET NULL');
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_punto_contenitore ON punto_interesse(contenitore_chiave)');
  },
};
