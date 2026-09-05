// ============================================================
// Migrazione 030 — identità degli spilli del seed modificati dall'utente (Fase 15.22)
// ============================================================
//
// `seed_identita_json` ricorda com'era uno spillo del seed (tipo, nome, posizione, riferimento) nel momento in cui l'utente lo modifica
// e lo spillo diventa `utente`: al reseed (cambio di hash) il pacchetto non reinserisce lo spillo con quella identità, così condizioni di
// visibilità e modifiche dell'utente sopravvivono senza doppioni. NULL per gli spilli del seed intatti e per quelli creati dall'utente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration030: Migration = {
  id: 30,
  name: 'identita_seed_spilli',
  up: (db) => {
    db.exec('ALTER TABLE spillo ADD COLUMN seed_identita_json TEXT');
  },
};
