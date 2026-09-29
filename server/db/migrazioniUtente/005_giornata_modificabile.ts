// ============================================================
// utente 005 — la giornata della guida diventa modificabile: correzioni delle azioni e fascia degli eventi
// ============================================================
//
// `correzione_azione_guida`: le azioni della guida stanno in `giorno_percorso.azioni_json` del file di
// gioco, che il pacchetto sostituisce per intero; la correzione dell'utente (testo, note, fascia,
// «rimossa») vive qui, vale per tutte le partite (decisione dell'utente, 2026-09-29) e si applica
// sopra la guida alla lettura. La chiave è (data, indice) come per la spunta (`azione_partita`), e
// `originale_json` è l'azione com'era quando l'utente l'ha toccata: se un pacchetto nuovo mette
// un'altra azione a quel posto, la correzione non si applica in silenzio a quella sbagliata.
// Su un file nato dopo questa migrazione la tabella esiste già (`schemaUtente.ts`).
//
// `evento_utente.fascia`: gli eventi dell'utente si mostrano dentro «Di giorno» / «Di sera» come le
// azioni; quelli già scritti non avevano un momento della giornata e vanno di giorno.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente005: Migration = {
  id: 5,
  name: 'giornata_modificabile',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.correzione_azione_guida (
      data            TEXT NOT NULL,
      indice          INTEGER NOT NULL CHECK (indice >= 0),
      originale_json  TEXT NOT NULL,
      modifiche_json  TEXT NOT NULL DEFAULT '{}',
      nascosta        INTEGER NOT NULL DEFAULT 0 CHECK (nascosta IN (0,1)),
      created_at      TEXT NOT NULL,
      updated_at      TEXT NOT NULL,
      PRIMARY KEY (data, indice)
    )`);
    const colonne = (db.prepare('PRAGMA utente.table_info(evento_utente)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('fascia')) {
      db.exec("ALTER TABLE utente.evento_utente ADD COLUMN fascia TEXT NOT NULL DEFAULT 'giorno' CHECK (fascia IN ('giorno','sera'))");
    }
  },
};
