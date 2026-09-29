// ============================================================
// 085 — i nemici non si raccolgono
// ============================================================
//
// «I Nemici non devono figurare tra gli elementi da raccogliere per completare la mappa visto che si
// rigenerano» (richiesta dell'utente, 2026-09-30). Il tipo `nemico` passa dalla categoria «consumabile»
// a «informativa» (`shared/spilli.ts`): resta un segno sulla mappa, ma non si segna come fatto, non conta
// nella percentuale e non compare fra i «da raccogliere». La categoria decide la collezionabilità per
// gli spilli nuovi e per i pacchetti; qui si allineano quelli che le istanze hanno già.
//
// Gli eventuali «raccolto» delle partite su questi spilli restano nel file delle partite: non contano
// più (ogni conteggio parte da `collezionabile = 1`) e non si cancellano dati dell'utente senza motivo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const migration085: Migration = {
  id: 85,
  name: 'nemici_non_raccoglibili',
  up(db) {
    const cambiati = db.prepare("UPDATE spillo SET collezionabile = 0 WHERE tipo = 'nemico' AND collezionabile = 1").run().changes;
    logger.info({ cambiati }, 'migrazione 085: i nemici non sono più da raccogliere');
  },
};
