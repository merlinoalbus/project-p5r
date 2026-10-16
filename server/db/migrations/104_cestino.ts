// ============================================================
// 104 — Il cestino: ciò che si elimina dalla guida e dalle mappe si può rimettere
// ============================================================
//
// Richiesta dell'utente (2026-10-16), dopo che tre aree del Palazzo di Madarame erano state eliminate per errore e si sono dovute
// ricostruire a mano dal WAL di produzione: «Cestino con ripristino». Scelte dell'utente (AskUserQuestion): nel cestino vanno le
// aree della guida dei Palazzi, le voci della guida, le planimetrie e le aree dei dedali; il cestino sta in Impostazioni; si
// svuota solo a mano.
//
// Una riga per ogni eliminazione: che cosa era (`tipo`, `chiave`, `nome`, `contesto`), quando, quante righe se ne sono andate per
// tabella (`riepilogo_json`, per l'elenco) e il **registro** (`registro_json`): ogni riga cancellata, cambiata o aggiunta dalla
// transazione dell'eliminazione nel file di gioco, com'era prima e com'è diventata, nell'ordine in cui è successo (il servizio
// `cestinoService` lo raccoglie con trigger temporanei, cascate comprese). Le righe delle partite vanno nel loro file
// (`utente.cestino_partite`, migrazione utente 021) con lo stesso `uid`: il pacchetto di gioco esportato non porta l'avanzamento.
// `con_partite` dice se l'eliminazione aveva una parte nelle partite: se manca (file delle partite sostituito) lo si sa.
// `vicini_json` (`{ prima, dopo }`) sono le chiavi di ciò che stava subito prima e subito dopo l'elemento (aree, voci): al ripristino
// lo si rimette lì, anche se nel frattempo altre righe sono state aggiunte o spostate e il suo vecchio numero d'ordine non dice più
// niente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration104: Migration = {
  id: 104,
  name: 'cestino',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS cestino (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      uid             TEXT NOT NULL UNIQUE,
      tipo            TEXT NOT NULL CHECK (tipo IN ('area', 'voce', 'mappa', 'area-dedalo')),
      chiave          TEXT NOT NULL,
      nome            TEXT NOT NULL,
      contesto        TEXT NOT NULL DEFAULT '',
      riepilogo_json  TEXT NOT NULL DEFAULT '{}',
      registro_json   TEXT NOT NULL,
      con_partite     INTEGER NOT NULL DEFAULT 0 CHECK (con_partite IN (0, 1)),
      vicini_json     TEXT,
      eliminato_il    TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_cestino_eliminato ON cestino(eliminato_il)');
  },
};
