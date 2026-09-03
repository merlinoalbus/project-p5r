// ============================================================
// dbService — ciclo di vita better-sqlite3 (open/get/close)
// ============================================================
//
// Persistenza SU DISCO, nessun DB esterno. Istanza unica aperta al
// boot; fallimento = fatale in index.ts.
//
// Pragma:
//   - journal_mode=WAL     → letture concorrenti + scritture veloci
//   - synchronous=NORMAL   → accoppiamento raccomandato con WAL
//   - busy_timeout=5000    → copre il breve riavvio di tsx watch
//   - foreign_keys=ON      → integrità referenziale reale (CASCADE)
//
// `prepared(sql)` è la cache degli statement (better-sqlite3 non
// memoizza le prepare). `':memory:'` è supportato per i test.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';

/** Tipo della connessione SQLite condivisa dal processo backend. */
export type AppDatabase = Database.Database;

let db: AppDatabase | null = null;

/** Percorso assoluto del file SQLite configurato. */
export function resolveDbPath(): string {
  return path.join(config.dataDir, config.dbFileName);
}

/**
 * Apre la connessione SQLite, crea la directory dati quando serve e applica i
 * pragma operativi. Chiamate successive restituiscono la stessa connessione.
 */
export function initDb(dbPath: string = resolveDbPath()): AppDatabase {
  if (db) return db;
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  db.pragma('cache_size = -64000');
  db.pragma('temp_store = MEMORY');
  if (dbPath !== ':memory:') {
    db.pragma('mmap_size = 268435456');
  }
  stmtCache.clear();
  return db;
}

/** Connessione già inizializzata (errore d'uso se manca initDb). */
export function getDb(): AppDatabase {
  if (!db) throw new Error('DB non inizializzato — chiamare initDb() prima');
  return db;
}

/** Ottimizza e chiude la connessione, svuotando la cache degli statement. */
export function closeDb(): void {
  if (db) {
    try {
      db.pragma('optimize');
    } catch {
      // best effort: mai bloccare la chiusura
    }
  }
  stmtCache.clear();
  db?.close();
  db = null;
}

// ---- Cache statement ----

const stmtCache = new Map<string, Database.Statement>();

/** Statement preparato e cacheato per la connessione corrente. */
export function prepared(sql: string): Database.Statement {
  let stmt = stmtCache.get(sql);
  if (!stmt) {
    stmt = getDb().prepare(sql);
    stmtCache.set(sql, stmt);
  }
  return stmt;
}

/** Timestamp ISO-8601 UTC per le colonne created_at/updated_at. */
export function nowIso(): string {
  return new Date().toISOString();
}
