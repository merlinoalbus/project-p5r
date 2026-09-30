// ============================================================
// utente 006 — il boss della Guida segnato dal raccolto si distingue da quello segnato a mano
// ============================================================
//
// Scelta dell'utente (2026-09-30): raccogliendo il Tesoro del Palazzo o il boss finale sulla mappa, il boss
// finale della Guida si segna da solo, e **si toglie** se si toglie quel raccolto. Ma solo il segno che il
// raccolto ha messo: un boss segnato a mano (ottenuto o esaurito) prima o dopo non va cancellato da un
// «raccolto» tolto, anche solo per correggere un errore (rilievo della revisione). `automatico` = 1 marca
// il segno messo dal raccolto; ogni scrittura fatta dall'utente sul punto lo riporta a 0.
// Su un file nato dopo questa migrazione la colonna esiste già (`schemaUtente.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente006: Migration = {
  id: 6,
  name: 'boss_segnato_dal_raccolto',
  up(db) {
    const colonne = (db.prepare('PRAGMA utente.table_info(punto_partita)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('automatico')) {
      db.exec('ALTER TABLE utente.punto_partita ADD COLUMN automatico INTEGER NOT NULL DEFAULT 0 CHECK (automatico IN (0,1))');
    }
  },
};
