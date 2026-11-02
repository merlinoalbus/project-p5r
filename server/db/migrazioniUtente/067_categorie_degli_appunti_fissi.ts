// ============================================================
// Utente 067 — le categorie degli appunti fissi (2026-11-02)
// ============================================================
//
// Richiesta dell'utente: «voglio poter raggruppare per categorie (chiudibili e apribili) gli Appunti Fissi nonchè riordinarli con click e
// trascina all'interno di gruppi o della lista di Appunti fissi», con la proposta approvata «Sì, procedi».
//
// Una tabella nuova, vuota: `categoria_appunti` (nome da 1 a 40 caratteri, unico senza distinguere le maiuscole; posto fra le categorie da 0;
// date). In `appunto_fisso` una colonna nuova `categoria_id`, NULL = l'appunto sta nella lista senza categoria. Da qui `appunto_fisso.ordine` è
// il posto DENTRO il suo gruppo (la categoria, o la lista senza categoria), da 0 senza buchi.
// Gli appunti che ci sono non si toccano: restano tutti senza categoria (colonna NULL), con l'ordine di prima, che è già da 0 senza buchi in
// quell'unica lista. I numeri dei vincoli sono quelli di `shared/appuntiFissi.ts`, scritti qui per esteso perché una migrazione non cambia più.
// Append-only e idempotente (IF NOT EXISTS, colonna aggiunta solo se manca), dentro la transazione della migrazione.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente067: Migration = {
  id: 67,
  name: 'categorie_degli_appunti_fissi',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 067: manca la transazione della migrazione; nessuna modifica applicata.');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.categoria_appunti (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      nome          TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK (length(nome) BETWEEN 1 AND 40),
      ordine        INTEGER NOT NULL CHECK (ordine >= 0),
      creato_il     TEXT NOT NULL,
      aggiornato_il TEXT NOT NULL
    )`);
    db.exec('CREATE INDEX IF NOT EXISTS utente.categoria_appunti_ordine ON categoria_appunti (ordine, id)');
    const colonne = db.prepare('PRAGMA utente.table_info(appunto_fisso)').all() as Array<{ name: string }>;
    if (!colonne.some((c) => c.name === 'categoria_id')) {
      // la chiave esterna è fra due tabelle dello stesso file (`partite.db`); l'eliminazione di una categoria il service la fa spostando prima
      // gli appunti in fondo alla lista senza categoria: ON DELETE SET NULL è solo la rete
      db.exec('ALTER TABLE utente.appunto_fisso ADD COLUMN categoria_id INTEGER REFERENCES categoria_appunti(id) ON DELETE SET NULL');
    }
    db.exec('CREATE INDEX IF NOT EXISTS utente.appunto_fisso_gruppo ON appunto_fisso (categoria_id, ordine, id)');
  },
};
