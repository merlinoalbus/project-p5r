// ============================================================
// Utente 059 — la relazione romantica con un Confidente, dato della partita (2026-10-31, L13, ondata 10, O10-2)
// ============================================================
//
// Domanda posta all'utente: «Takemi: la guida dice che se inizi una relazione romantica con Takemi da quel momento la puoi vedere solo di sera e
// non più di giorno; l'app non sa se nella tua partita hai scelto la relazione romantica. a) aggiungo alla partita il dato "relazione romantica"
// (lo segni con la scelta romantica al rango 9) e da lì l'app sposta da sola la disponibilità di Takemi alla sera; b) lascio solo la frase
// scritta.». Risposta dell'utente: «a».
// Una colonna nuova, `confidente_partita.relazione_romantica` (0/1, 0 di partenza): la relazione romantica iniziata nella partita con quel
// Confidente (solo per i Confidenti romanzabili, `confidente.romanzabile`, migrazione di gioco 324-325; lo controlla il servizio). Le righe
// esistenti valgono 0 dal valore predefinito, senza riscritture. Nessun audit (nessuna riga si tocca). Idempotente (la colonna si aggiunge solo
// se manca), dentro la transazione della migrazione.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente059: Migration = {
  id: 59,
  name: 'relazione_romantica',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 059: manca la transazione della migrazione; nessuna modifica applicata.');
    const colonne = (db.prepare('PRAGMA utente.table_info(confidente_partita)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('relazione_romantica')) db.exec('ALTER TABLE utente.confidente_partita ADD COLUMN relazione_romantica INTEGER NOT NULL DEFAULT 0 CHECK (relazione_romantica IN (0, 1))');
  },
};
