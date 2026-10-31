// ============================================================
// Migrazione 324 — i Confidenti con cui si può iniziare una relazione romantica: la colonna (L13, ondata 10, lotto O10-2)
// ============================================================
//
// Domanda posta all'utente il 2026-10-31: «Takemi: la guida dice che se inizi una relazione romantica con Takemi da quel momento la puoi vedere
// solo di sera e non più di giorno; l'app non sa se nella tua partita hai scelto la relazione romantica. a) aggiungo alla partita il dato
// "relazione romantica" (lo segni con la scelta romantica al rango 9) e da lì l'app sposta da sola la disponibilità di Takemi alla sera; b) lascio
// solo la frase scritta.». Risposta dell'utente: «a».
// Solo lo schema (i dati li scrive la 325, dal DB): `confidente.romanzabile` (0/1, 0 di partenza) dice che con il Confidente si può iniziare una
// relazione romantica; solo allora la partita può segnarla (`utente.confidente_partita.relazione_romantica`, migrazione utente 059). Nessuna
// riga si tocca: niente audit. Idempotente (la colonna si aggiunge solo se manca), dentro la transazione della migrazione. Solo `main`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';

export const migration324: Migration = {
  id: 324,
  name: 'confidenti_romanzabili_schema',
  up(db) {
    if (!db.inTransaction) throw new Error('324: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'confidente')) { logger.warn({ migrazione: 324 }, 'tabella confidente assente: niente da fare'); return; }
    const aggiunta = !haColonna(db, 'confidente', 'romanzabile');
    if (aggiunta) db.exec('ALTER TABLE main.confidente ADD COLUMN romanzabile INTEGER NOT NULL DEFAULT 0 CHECK (romanzabile IN (0, 1))');
    logger.info({ migrazione: 324, aggiunta }, 'confidente.romanzabile: con chi si può iniziare una relazione romantica');
  },
};
