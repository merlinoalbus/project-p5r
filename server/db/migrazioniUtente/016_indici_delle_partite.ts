// ============================================================
// utente 016 — gli indici delle partite: uno doppio in meno, uno utile in più
// ============================================================
//
// Rilievi R1' e R5' della verifica completa (2026-10-03):
//   - `idx_effetto_lettura_partita(partita_id, tipo, chiave)` (migrazione di gioco 056, poi `schemaUtente`) è un prefisso della
//     chiave primaria `(partita_id, tipo, chiave, ordine, dote_chiave)`, che ha già il suo indice: si toglie;
//   - `spunta_voce_partita` si cerca per `voce_uid` (giornata: spunte di una voce in tutte le partite), e senza indice ogni
//     ricerca scorreva le spunte di tutte le partite: si aggiunge `idx_spunta_voce_uid`.
// `schemaUtente.ts` porta già lo stato finale, così un `partite.db` nuovo nasce uguale a uno aggiornato.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente016: Migration = {
  id: 16,
  name: 'indici_delle_partite',
  up(db) {
    db.exec('DROP INDEX IF EXISTS utente.idx_effetto_lettura_partita');
    db.exec('CREATE INDEX IF NOT EXISTS utente.idx_spunta_voce_uid ON spunta_voce_partita(voce_uid)');
  },
};
