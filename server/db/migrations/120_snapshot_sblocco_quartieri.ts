// ============================================================
// 120 — copia della condizione guida dei quartieri, per «Ripristina» (L6)
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const migration120: Migration = {
  id: 120,
  name: 'snapshot_sblocco_quartieri',
  up(db) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'quartiere'").get()) return;
    const colonne = (db.prepare("PRAGMA table_info('quartiere')").all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('condizioni_guida_json')) db.exec('ALTER TABLE quartiere ADD COLUMN condizioni_guida_json TEXT');
    if (!colonne.includes('fonte_condizioni_guida_json')) db.exec('ALTER TABLE quartiere ADD COLUMN fonte_condizioni_guida_json TEXT');
    const copiate = db.prepare(`UPDATE quartiere
      SET condizioni_guida_json = condizioni_json,
          fonte_condizioni_guida_json = fonte_condizioni_json
      WHERE condizioni_guida_json IS NULL
        AND (condizioni_json IS NOT NULL OR fonte_condizioni_json IS NOT NULL)`).run().changes;
    logger.info({ copiate }, '[migration120] snapshot degli sblocchi dei quartieri copiato');
  },
};
