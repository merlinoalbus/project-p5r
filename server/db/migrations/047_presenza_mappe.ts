// ============================================================
// Migrazione 047 — la presenza di una mappa, non solo dei suoi pin
// ============================================================
//
// Un Palazzo esiste solo fra il giorno in cui si apre e quello in cui scade: il Palazzo di
// Kamoshida dal 12 aprile al 2 maggio, quello di Madarame dal 16 maggio al 5 giugno. Prima di
// quella data non c'è, dopo non ci si entra più.
//
// Quella finestra finora non aveva dove stare. Le condizioni vivono sugli spilli, e un Palazzo
// non è uno spillo: è una mappa radice, e nessun pin ci porta — non essendo figlio di Tokyo, il
// passaggio che avrebbe potuto portare la condizione non esiste. Le dieci finestre erano
// trascritte e caricate, e restavano applicate a zero cose.
//
// `mappa.condizioni_json` dà loro un posto: la stessa forma delle condizioni degli spilli, letta
// dallo stesso vocabolario e valutata dallo stesso servizio. Vale per la presenza — quando la
// mappa, in quel momento della partita, nel mondo non c'è — non per i prerequisiti.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration047: Migration = {
  id: 47,
  name: 'presenza_mappe',
  up: (db) => {
    const colonne = db.prepare("SELECT name FROM pragma_table_info('mappa')").all() as Array<{ name: string }>;
    if (!colonne.some((c) => c.name === 'condizioni_json')) {
      db.exec('ALTER TABLE mappa ADD COLUMN condizioni_json TEXT');
    }
  },
};
