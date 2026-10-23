import type { Migration } from '../migrationRunner.js';

/**
 * R10-01/R10-09: gli effetti «segna lo stato» di una voce (evento di storia, domanda, cruciverba, Richiesta) ricordano com'era lo stato
 * PRIMA della spunta, così togliere la spunta lo riporta indietro anche dopo un ricaricamento. Tabella nuova e vuota: nessun dato
 * esistente cambia.
 */
export const utente036: Migration = {
  id: 36,
  name: 'effetti_di_stato_della_voce',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.effetto_stato_voce (
      partita_id   INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      voce_uid     TEXT NOT NULL,
      effetto_uid  TEXT NOT NULL,
      tipo         TEXT NOT NULL,
      chiave       TEXT NOT NULL,
      prima_json   TEXT NOT NULL CHECK(json_valid(prima_json)),
      applicato_il TEXT NOT NULL,
      PRIMARY KEY (partita_id, voce_uid, effetto_uid)
    );`);
  },
};
