// ============================================================
// 114 — la planimetria di una voce della guida scelta a mano (L3, «planimetria della voce», decisione dell'utente del 2026-10-20)
// ============================================================
//
// «I gruppi senza pin devono essere visibili solo nella planimetria dove sono stati inseriti»; «lasciali agganciati alla planimetria 1 e
// dammi la possibilità di spostarli a mano in altre planimetrie durante la mia review». La migrazione aggiunge solo la colonna
// dell'aggancio fatto a mano, `punto_interesse.planimetria_chiave` (null = nessun aggancio): **non scrive valori**. La planimetria di una
// voce si calcola alla lettura con una regola sola (`planimetriaDellaVoce.ts`): dai pin se ne ha, altrimenti l'aggancio a mano, altrimenti la
// planimetria 1 della sua infiltrazione. Così una voce che perde i pin, una voce nuova o una planimetria ripristinata non restano mai
// senza planimetria (correzione del PM). Che la planimetria sia del Palazzo della voce lo controlla il servizio, come gli altri legami di
// L3. Eliminata la planimetria, il campo torna null e la voce torna alla planimetria 1. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration114: Migration = {
  id: 114,
  name: 'planimetria_della_voce',
  up(db) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'punto_interesse'").get()) return;
    const colonne = (db.prepare('PRAGMA table_info(punto_interesse)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('planimetria_chiave')) {
      db.exec('ALTER TABLE punto_interesse ADD COLUMN planimetria_chiave TEXT REFERENCES mappa(chiave) ON DELETE SET NULL ON UPDATE CASCADE');
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_punto_interesse_planimetria ON punto_interesse(planimetria_chiave)');
  },
};
