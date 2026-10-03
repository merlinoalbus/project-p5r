// ============================================================
// 096 — Pulizia dello schema dei dati di gioco: un indice doppio e una tabella che nessuno scrive
// ============================================================
//
// Rilievi R2' e R3' della verifica completa (2026-10-03), nessun dato perso:
//   - `idx_traduzione_ambito(ambito)` (migrazione 003) ripete il prefisso della chiave primaria `(ambito, chiave)`: SQLite usa
//     già l'indice della chiave per «WHERE ambito = ?», e il doppione costa solo spazio e scritture;
//   - `seed_meta` (migrazione 001) era la memoria dell'ultimo caricamento del seed JSON, che non esiste più: nessun codice la
//     scrive, i valori sono fermi al 2026-09-09 e Impostazioni li mostrava come se fossero dello stato attuale. Con lei esce il
//     campo `seed` dello stato dell'istanza.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration096: Migration = {
  id: 96,
  name: 'pulizia_schema',
  up(db) {
    db.exec('DROP INDEX IF EXISTS idx_traduzione_ambito');
    db.exec('DROP TABLE IF EXISTS seed_meta');
  },
};
