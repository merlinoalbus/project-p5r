// ============================================================
// Utente 058 — gli appunti fissi del Diario (2026-10-31, C7)
// ============================================================
//
// Richiesta dell'utente: «mi farebbe comodo avere una sorta di clipboard su finestra fluttuante dove possa io inserire e mantenere salvati
// delle voci che tendono a ripetersi nel diario... per averli a portata di mano quando voglio inserirne una nuova occorrenza», con la
// proposta approvata «Sì, sul server»: gli appunti stanno nei dati utente e NON sono di una partita (gli stessi su PC, tablet e telefono).
//
// Una tabella nuova, vuota: titolo (1–80), testo intero (1–200.000: il testo che «Copia» del Diario scrive, compreso il blocco delle voci),
// posto nell'elenco e date. I numeri dei vincoli sono quelli di `shared/appuntiFissi.ts`, scritti qui per esteso perché una migrazione non
// cambia più dopo essere stata applicata. Nessuna riga esistente si tocca, nemmeno nel file di gioco: niente audit in `dati_guida`.
// Append-only e idempotente (IF NOT EXISTS), dentro la transazione della migrazione.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente058: Migration = {
  id: 58,
  name: 'appunti_fissi',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 058: manca la transazione della migrazione; nessuna modifica applicata.');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.appunto_fisso (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      titolo        TEXT NOT NULL CHECK (length(titolo) BETWEEN 1 AND 80),
      testo         TEXT NOT NULL CHECK (length(testo) BETWEEN 1 AND 200000),
      ordine        INTEGER NOT NULL CHECK (ordine >= 0),
      creato_il     TEXT NOT NULL,
      aggiornato_il TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS utente.appunto_fisso_ordine ON appunto_fisso (ordine, id)');
  },
};
