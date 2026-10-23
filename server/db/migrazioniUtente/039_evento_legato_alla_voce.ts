// ============================================================
// Utente 039 — R10-22: l'evento dello storico può portare la voce del diario che l'ha prodotto
// ============================================================
//
// Lo storico è un registro derivato dei cambi di stato: togliere la spunta di una voce toglie dallo storico l'evento che quella spunta
// aveva registrato. Per farlo senza indovinare serve un legame esplicito: la colonna `voce_uid`, nulla per ogni evento che già c'è.
// Gli eventi storici non vengono riempiti né revocati: restano come sono. Il legame nasce solo dagli eventi registrati da ora in poi.
// Idempotente: la colonna e l'indice si creano solo se mancano.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente039: Migration = {
  id: 39,
  name: 'evento_legato_alla_voce',
  up(db) {
    const colonne = new Set((db.prepare('PRAGMA utente.table_info(evento_partita)').all() as Array<{ name: string }>).map((c) => c.name));
    if (!colonne.has('voce_uid')) db.exec('ALTER TABLE utente.evento_partita ADD COLUMN voce_uid TEXT');
    db.exec('CREATE INDEX IF NOT EXISTS utente.idx_evento_partita_voce ON evento_partita(partita_id, voce_uid) WHERE voce_uid IS NOT NULL');
  },
};
