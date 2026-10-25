// ============================================================
// Utente 046 — oggetti ricevuti e sblocchi delle voci del Diario (L13, ondata 3, decisioni 1 e 17)
// ============================================================
//
// Due registri per partita, scritti SOLO dalla spunta di una voce con l'effetto «oggetto» o «sblocco» e tolti togliendo la spunta
// (`effettiDiStatoService`). Append-only, idempotente (IF NOT EXISTS), solo schema «utente»: nessuna riga esistente cambia, nessuna
// partita salvata si riscrive. Prima del congelamento dello schema delle partite (dopo la 045 il congelamento non è ancora avvenuto:
// questa è la nuova ultima migrazione delle partite).
//   - `oggetto_ottenuto_partita`: una riga per effetto spuntato (voce ed effetto), con l'oggetto del catalogo e le copie; le copie dello
//     stesso oggetto si sommano leggendo (due voci che danno lo stesso oggetto ne danno due);
//   - `sblocco_partita`: lo sblocco di una Richiesta o di un'attività, una riga per bersaglio con la voce che l'ha dato (la condizione
//     «sblocco ricevuto» la legge; un'altra voce che dà lo stesso sblocco eredita la riga togliendo la spunta della prima).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente046: Migration = {
  id: 46,
  name: 'oggetti_e_sblocchi_dalla_voce',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 046: manca la transazione della migrazione; nessuna modifica applicata.');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.oggetto_ottenuto_partita (
      partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      voce_uid TEXT NOT NULL,
      effetto_uid TEXT NOT NULL,
      catalogo_chiave TEXT NOT NULL,
      quantita INTEGER NOT NULL CHECK (quantita BETWEEN 1 AND 999),
      creato_il TEXT NOT NULL,
      PRIMARY KEY (partita_id, voce_uid, effetto_uid)
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS utente.idx_oggetto_ottenuto_catalogo ON oggetto_ottenuto_partita(partita_id, catalogo_chiave)');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.sblocco_partita (
      partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      bersaglio_tipo TEXT NOT NULL CHECK (bersaglio_tipo IN ('richiesta','attivita')),
      bersaglio_chiave TEXT NOT NULL,
      voce_uid TEXT,
      creato_il TEXT NOT NULL,
      PRIMARY KEY (partita_id, bersaglio_tipo, bersaglio_chiave)
    )`);
  },
};
