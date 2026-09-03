// ============================================================
// Migration runner — versionato su PRAGMA user_version
// ============================================================
//
// Ogni migrazione è `{ id, name, up(db) }`; l'array ordinato vive in
// db/migrations/index.ts (import espliciti). Ogni migrazione applica
// DDL + bump versione in UNA transazione. Append-only: nessuna down
// migration (il backup pre-migrazione è la via di ripristino).
// ============================================================

import type { AppDatabase } from './dbService.js';
import { logger } from '../utils/logger.js';
import { migrations as allMigrations } from './migrations/index.js';

/** Contratto minimo di una migrazione SQLite append-only. */
export interface Migration {
  id: number;
  name: string;
  up: (db: AppDatabase) => void;
}

/** Applica in ordine le migrazioni successive a `PRAGMA user_version`. */
export function runMigrations(db: AppDatabase, list: Migration[] = allMigrations): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  const pending = [...list]
    .sort((a, b) => a.id - b.id)
    .filter((m) => m.id > current);

  for (const m of pending) {
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        m.up(db);
        db.pragma(`user_version = ${m.id}`);
      })();
    } finally {
      db.pragma('foreign_keys = ON');
    }
    const violations = db.pragma('foreign_key_check') as unknown[];
    if (Array.isArray(violations) && violations.length > 0) {
      throw new Error(
        `Migrazione ${m.id} (${m.name}): violazioni di integrità referenziale: ${JSON.stringify(violations.slice(0, 5))}`,
      );
    }
    logger.info({ id: m.id, name: m.name }, 'migrazione applicata');
  }

  if (pending.length === 0) {
    logger.debug({ userVersion: current }, 'schema aggiornato');
  }
}
