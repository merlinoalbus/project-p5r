// ============================================================
// Migration runner — versionato su PRAGMA user_version, per ciascuno dei due file
// ============================================================
//
// Ogni migrazione è `{ id, name, up(db) }`; gli array ordinati vivono in
// db/migrations/index.ts (dati di gioco, schema `main`) e in
// db/migrazioniUtente/index.ts (partite, schema `utente`). Ogni migrazione
// applica DDL + bump versione in UNA transazione. Append-only: nessuna down
// migration (il backup pre-migrazione è la via di ripristino).
//
// Due sequenze perché i due file hanno vite diverse: sostituire gioco.db con
// un pacchetto più vecchio o più nuovo non deve rifare le migrazioni delle
// partite, e un partite.db nuovo di zecca accanto a un gioco.db già migrato
// deve ricevere il proprio schema da zero.
// ============================================================

import type { AppDatabase } from './dbService.js';
import { logger } from '../utils/logger.js';
import { migrations as allMigrations } from './migrations/index.js';
import { migrazioniUtente as allUtente } from './migrazioniUtente/index.js';

/** Contratto minimo di una migrazione SQLite append-only. */
export interface Migration {
  id: number;
  name: string;
  up: (db: AppDatabase) => void;
}

/** Applica in ordine le migrazioni successive a `PRAGMA <schema>.user_version`. */
function applica(db: AppDatabase, schema: 'main' | 'utente', list: Migration[]): void {
  const current = db.pragma(`${schema}.user_version`, { simple: true }) as number;
  const pending = [...list]
    .sort((a, b) => a.id - b.id)
    .filter((m) => m.id > current);

  for (const m of pending) {
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        m.up(db);
        db.pragma(`${schema}.user_version = ${m.id}`);
      })();
    } finally {
      db.pragma('foreign_keys = ON');
    }
    const violations = db.pragma('foreign_key_check') as unknown[];
    if (Array.isArray(violations) && violations.length > 0) {
      throw new Error(
        `Migrazione ${schema} ${m.id} (${m.name}): violazioni di integrità referenziale: ${JSON.stringify(violations.slice(0, 5))}`,
      );
    }
    logger.info({ schema, id: m.id, name: m.name }, 'migrazione applicata');
  }

  if (pending.length === 0) {
    logger.debug({ schema, userVersion: current }, 'schema aggiornato');
  }
}

/** Le migrazioni dei dati di gioco (`main`), poi quelle delle partite (`utente`). */
export function runMigrations(db: AppDatabase, list: Migration[] = allMigrations, listaUtente: Migration[] = allUtente): void {
  applica(db, 'main', list);
  applica(db, 'utente', listaUtente);
}

/** Solo le migrazioni delle partite: per un `partite.db` nuovo accanto a un `gioco.db` già a posto. */
export function runMigrationsUtente(db: AppDatabase, listaUtente: Migration[] = allUtente): void {
  applica(db, 'utente', listaUtente);
}
