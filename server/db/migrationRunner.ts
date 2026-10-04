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

/** Le violazioni di chiave esterna di uno schema, come testo confrontabile («tabella#riga→padre»). */
function violazioni(db: AppDatabase, schema: 'main' | 'utente'): Set<string> {
  const righe = db.pragma(`${schema}.foreign_key_check`) as Array<{ table: string; rowid: number | null; parent: string; fkid: number }>;
  return new Set(righe.map((r) => `${r.table}#${r.rowid ?? '?'}→${r.parent}/${r.fkid}`));
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
        // Il controllo delle chiavi esterne sta DENTRO la transazione, prima di avanzare `user_version`: una violazione **portata
        // dalla migrazione** la annulla e la lascia da applicare (fatto dopo il commit, falliva un avvio solo, e a quello dopo i
        // dati incoerenti passavano). Si confrontano le violazioni prima e dopo, nel solo schema della migrazione (SQLite non ha
        // chiavi esterne fra due file): una violazione che c'era già non è colpa della migrazione e non deve bloccare ogni avvio
        // per sempre — si scrive nel log.
        const prima = violazioni(db, schema);
        m.up(db);
        const nuove = [...violazioni(db, schema)].filter((v) => !prima.has(v));
        if (nuove.length > 0) {
          throw new Error(`Migrazione ${schema} ${m.id} (${m.name}): violazioni di integrità referenziale: ${nuove.slice(0, 5).join(', ')}`);
        }
        if (prima.size > 0) logger.warn({ schema, id: m.id, violazioni: [...prima].slice(0, 5), totale: prima.size }, 'violazioni di integrità referenziale già presenti prima della migrazione');
        db.pragma(`${schema}.user_version = ${m.id}`);
      })();
    } finally {
      db.pragma('foreign_keys = ON');
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
