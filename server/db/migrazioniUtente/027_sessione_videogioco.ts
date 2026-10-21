import type { Migration } from '../migrationRunner.js';
import { DDL_SESSIONE_VIDEOGIOCO } from '../schemaUtente.js';

/** Una dichiarazione di sessione è distinta dai round vinti. Nessun progresso viene dedotto o migrato. */
export const utente027: Migration = {
  id: 27,
  name: 'sessione_videogioco',
  up(db) { db.exec(DDL_SESSIONE_VIDEOGIOCO); },
};
