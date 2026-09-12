// ============================================================
// utente 001 — lo schema delle partite, nel loro file
// ============================================================
//
// La prima migrazione del file `partite.db`: crea le tabelle delle partite che mancano. Su
// un'istanza migrata dal file unico le tabelle esistono già (le ha create e riempite la
// migrazione 066 di gioco.db) e qui non succede nulla; su un `partite.db` nuovo — la prima
// installazione dal pacchetto, o una sostituzione — nascono vuote.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { creaSchemaUtente } from '../schemaUtente.js';

export const utente001: Migration = {
  id: 1,
  name: 'schema_partite',
  up(db) {
    creaSchemaUtente(db);
  },
};
