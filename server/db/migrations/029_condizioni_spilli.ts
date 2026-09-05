// ============================================================
// Migrazione 029 — condizioni di visibilità degli spilli (Fase 15.22)
// ============================================================
//
// `condizioni_json` contiene l'elenco JSON delle condizioni strutturate (`shared/condizioniSpillo.ts`): data, periodo, Palazzo,
// Dote, Confidente, richiesta, pioggia, giorni, stagione, quartiere. NULL o «[]» = spillo sempre visibile. Con una partita attiva il
// server le valuta con lo stesso valutatore dei semafori e lo spillo bloccato sparisce dalla mappa.
// L'identità degli spilli del seed modificati dall'utente è nella migrazione 030 (registro append-only: la 029 era già applicata).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration029: Migration = {
  id: 29,
  name: 'condizioni_spilli',
  up: (db) => {
    db.exec('ALTER TABLE spillo ADD COLUMN condizioni_json TEXT');
  },
};
