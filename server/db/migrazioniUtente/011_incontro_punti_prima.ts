// ============================================================
// utente 011 — un incontro registrato dalle risposte si ricorda i punti del Confidente di prima
// ============================================================
//
// Nella pagina Confidenti una risposta registra l'incontro del momento (la Dote a ogni incontro); «Annulla ultimo» toglie i
// punti dell'ultima risposta, e se si torna ai punti di prima di quell'incontro l'incontro non c'è stato (una risposta
// data per sbaglio): va tolto con la sua Dote. `punti_prima` sono i punti del Confidente prima della prima risposta
// dell'incontro; null per gli incontri che non vengono da una risposta (passaggi, spunte).
// Su un file nato dopo questa migrazione la colonna esiste già (`schemaUtente.ts`).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente011: Migration = {
  id: 11,
  name: 'incontro_punti_prima',
  up(db) {
    const colonne = (db.prepare('PRAGMA utente.table_info(incontro_confidente_partita)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('punti_prima')) db.exec('ALTER TABLE utente.incontro_confidente_partita ADD COLUMN punti_prima REAL');
  },
};
