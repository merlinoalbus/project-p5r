// ============================================================
// Utente 041 — il registro cronologico dei punti dei Confidenti «solo da oggi» (R10-11c, R10-11f)
// ============================================================
//
// Decisione dell'utente: i valori di oggi (rango e punti di ogni Confidente) sono la BASE e non si riscrivono. Da qui, le spunte nuove del Diario che
// danno punti o fanno salire di rango si applicano in ordine cronologico (data, fascia, ordine della voce, ordine dentro la voce); se si spunta una voce
// che viene PRIMA di altre già applicate, si ricalcola da quella base e le successive cambiano di conseguenza; togliere la spunta ricalcola allo stesso
// modo. La correzione a mano (pagina Confidenti, regali) è prioritaria: apre una nuova generazione, con la base uguale ai valori di quel momento.
//   - `punti_confidente_generazione`: una riga per partita e Confidente, con la base della generazione corrente (rango, punti, sblocco);
//   - `punti_confidente_voce`: gli eventi del Diario di quella generazione (e delle precedenti, che non si ricalcolano), con la chiave d'ordine e i
//     parametri che servono a rifare il calcolo (note, arcano, invito, piazzamento agli esami; oppure il rango a cui si sale).
// Le tabelle nascono vuote: nessuna riga esistente cambia, nessuna spunta già data viene toccata. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente041: Migration = {
  id: 41,
  name: 'punti_cronologici',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS utente.punti_confidente_generazione (
      partita_id       INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      confidente_chiave TEXT NOT NULL,
      generazione      INTEGER NOT NULL,
      rango_base       INTEGER NOT NULL,
      punti_base       REAL NOT NULL,
      sbloccato_base   INTEGER NOT NULL,
      creata_il        TEXT NOT NULL,
      PRIMARY KEY (partita_id, confidente_chiave)
    )`);
    db.exec(`CREATE TABLE IF NOT EXISTS utente.punti_confidente_voce (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      partita_id       INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      confidente_chiave TEXT NOT NULL,
      voce_uid         TEXT NOT NULL,
      generazione      INTEGER NOT NULL,
      tipo             TEXT NOT NULL CHECK (tipo IN ('punti', 'passaggio')),
      o_data           INTEGER NOT NULL,
      o_fascia         INTEGER NOT NULL,
      o_voce           INTEGER NOT NULL,
      o_sub            INTEGER NOT NULL,
      parametri_json   TEXT NOT NULL,
      creato_il        TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS utente.idx_punti_confidente_voce_ordine ON punti_confidente_voce(partita_id, confidente_chiave, generazione, o_data, o_fascia, o_voce, o_sub)');
    db.exec('CREATE INDEX IF NOT EXISTS utente.idx_punti_confidente_voce_uid ON punti_confidente_voce(partita_id, voce_uid)');
  },
};
