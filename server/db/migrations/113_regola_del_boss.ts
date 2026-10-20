// ============================================================
// 113 — la regola del boss di ogni Palazzo: la voce del boss finale, o il boss segnato nella Guida come nei Memento (L4 §8.15 punto 3)
// ============================================================
//
// Iweleth è di tipo `palazzo` ma non ha una voce del boss finale (G-027, R8-19b): con la regola della 112 risulterebbe un Palazzo che non si
// conclude mai. R8-19b: «segue la regola dei Memento, nessun effetto di Palazzo». Qui una proprietà strutturata invece della chiave scritta
// nel codice: `dungeon.regola_boss` = `voce-finale` (la voce dichiarata, §8.14) o `memento` (il boss segnato nella Guida, come il ramo dei
// Memento di `palazziService`), con Iweleth = `memento`. Un Palazzo con la regola dei Memento non entra in nessun effetto di Palazzo (ingressi,
// mappa di Tokyo, requisiti); L8 (D3) lo porta poi dentro il dedalo.
// Nella 113 e non nella 112 (dove la scriveva il §8.15): la 112 era già applicata ai dati di sviluppo e all'anteprima e committata; le
// migrazioni sono append-only. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** I Palazzi che seguono la regola dei Memento per il boss (R8-19b). */
export const PALAZZI_COL_BOSS_DELLA_GUIDA: readonly string[] = ['iweleth'];

export const migration113: Migration = {
  id: 113,
  name: 'regola_del_boss',
  up(db) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'dungeon'").get()) return;
    const colonne = (db.prepare('PRAGMA table_info(dungeon)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('regola_boss')) {
      db.exec("ALTER TABLE dungeon ADD COLUMN regola_boss TEXT NOT NULL DEFAULT 'voce-finale' CHECK (regola_boss IN ('voce-finale', 'memento'))");
      for (const d of PALAZZI_COL_BOSS_DELLA_GUIDA) db.prepare("UPDATE dungeon SET regola_boss = 'memento' WHERE chiave = ?").run(d);
    }
    const memento = db.prepare("SELECT chiave FROM dungeon WHERE regola_boss = 'memento'").pluck().all() as string[];
    logger.info({ memento }, 'migrazione 113: regola del boss di ogni Palazzo (i Palazzi con la regola dei Memento)');
  },
};
