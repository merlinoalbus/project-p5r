// ============================================================
// utente 010 — più passaggi di rango nello stesso momento della giornata
// ============================================================
//
// La 009 voleva un solo incontro per Confidente, giorno e fascia. È giusto per gli incontri «semplici» (le risposte di
// un'uscita, la spunta di un incontro senza passaggio), ma non per i passaggi di rango segnati a mano: chi imposta il rango
// 1 e poi il 2 nello stesso giorno registra due passaggi, e il secondo non deve perdere la sua Dote (difetto trovato dai
// test della voce 5). L'unicità la tiene ora `incontriService`: un solo incontro semplice per momento, un passaggio per
// rango. Qui la tabella si ricostruisce senza il vincolo, con un indice sul momento per le ricerche.
// Su un file nato dopo questa migrazione la tabella ha già questa forma (`schemaUtente.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente010: Migration = {
  id: 10,
  name: 'incontri_piu_passaggi',
  up(db) {
    db.exec(`CREATE TABLE utente.incontro_confidente_partita_nuova (
      id                INTEGER PRIMARY KEY,
      partita_id        INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      confidente_chiave TEXT NOT NULL,
      data              TEXT NOT NULL DEFAULT '',
      fascia            TEXT NOT NULL DEFAULT '',
      verso_rango       INTEGER NOT NULL CHECK (verso_rango BETWEEN 1 AND 10),
      passaggio         INTEGER NOT NULL DEFAULT 0 CHECK (passaggio IN (0,1)),
      origine           TEXT NOT NULL CHECK (origine IN ('azione','mia','pagina')),
      doti_json         TEXT NOT NULL DEFAULT '[]',
      created_at        TEXT NOT NULL
    )`);
    db.exec(`INSERT INTO utente.incontro_confidente_partita_nuova (id, partita_id, confidente_chiave, data, fascia, verso_rango, passaggio, origine, doti_json, created_at)
      SELECT id, partita_id, confidente_chiave, data, fascia, verso_rango, passaggio, origine, doti_json, created_at FROM utente.incontro_confidente_partita`);
    db.exec('DROP TABLE utente.incontro_confidente_partita');
    db.exec('ALTER TABLE utente.incontro_confidente_partita_nuova RENAME TO incontro_confidente_partita');
    db.exec('CREATE INDEX IF NOT EXISTS utente.idx_incontro_confidente_momento ON incontro_confidente_partita(partita_id, confidente_chiave, data, fascia)');
  },
};
