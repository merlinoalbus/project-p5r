// ============================================================
// dbService — ciclo di vita better-sqlite3 (open/get/close)
// ============================================================
//
// Persistenza SU DISCO, nessun DB esterno. Istanza unica aperta al
// boot; fallimento = fatale in index.ts.
//
// **Due file, una connessione** (decisione dell'utente, 2026-09-12): `gioco.db` è il database
// principale (compendio, guida, catalogo, mappe, immagini) e `partite.db` è attaccato come schema
// `utente` con le tabelle delle partite. Così il DB di gioco si può esportare e sostituire senza
// toccare l'avanzamento. Le query restano senza prefisso: SQLite risolve il nome della tabella
// cercando prima in `main` e poi in `utente`, e i nomi sono tutti diversi. Solo le migrazioni e il
// backup nominano lo schema. Il vecchio file unico `project-p5r.db` viene rinominato in `gioco.db`
// al primo avvio; la migrazione 066 sposta poi le partite nel loro file.
//
// Pragma:
//   - journal_mode=WAL     → letture concorrenti + scritture veloci
//   - synchronous=NORMAL   → accoppiamento raccomandato con WAL
//   - busy_timeout=5000    → copre il breve riavvio di tsx watch
//   - foreign_keys=ON      → integrità referenziale reale (CASCADE), dentro ogni file
//
// `prepared(sql)` è la cache degli statement (better-sqlite3 non
// memoizza le prepare). `':memory:'` è supportato per i test (anche
// il file delle partite è in memoria).
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { config } from '../config.js';

/** Tipo della connessione SQLite condivisa dal processo backend. */
export type AppDatabase = Database.Database;

/** Nome dello schema attaccato che contiene le tabelle delle partite. */
export const SCHEMA_UTENTE = 'utente';

let db: AppDatabase | null = null;

/** Percorso assoluto del file SQLite dei dati di gioco. */
export function resolveDbPath(): string {
  return path.join(config.dataDir, config.dbFileName);
}

/** Percorso assoluto del file SQLite delle partite. */
export function resolvePartitePath(): string {
  return path.join(config.dataDir, config.partiteFileName);
}

/** Il file delle partite che accompagna un dato file di gioco (`:memory:` resta in memoria). */
export function percorsoPartiteDi(dbPath: string): string {
  if (dbPath === ':memory:') return ':memory:';
  return dbPath === resolveDbPath() ? resolvePartitePath() : path.join(path.dirname(dbPath), config.partiteFileName);
}

/** Il vecchio file unico, se esiste ancora e quello nuovo no: viene rinominato (con i suoi giornali). */
function rinominaFileLegacy(dbPath: string): void {
  if (dbPath !== resolveDbPath()) return;
  const vecchio = path.join(config.dataDir, config.dbFileNameLegacy);
  if (fs.existsSync(dbPath) || !fs.existsSync(vecchio)) return;
  fs.renameSync(vecchio, dbPath);
  for (const coda of ['-wal', '-shm']) if (fs.existsSync(`${vecchio}${coda}`)) fs.renameSync(`${vecchio}${coda}`, `${dbPath}${coda}`);
}

/**
 * Apre la connessione SQLite, crea la directory dati quando serve, attacca il file delle partite
 * e applica i pragma operativi. Chiamate successive restituiscono la stessa connessione.
 */
export function initDb(dbPath: string = resolveDbPath()): AppDatabase {
  if (db) return db;
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    rinominaFileLegacy(dbPath);
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
  // Il file delle partite: attaccato sempre, così ogni query lo vede e il runner delle migrazioni lo versiona.
  db.prepare('ATTACH DATABASE ? AS utente').run(percorsoPartiteDi(dbPath));
  if (dbPath !== ':memory:') db.pragma('utente.journal_mode = WAL');
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
  // `db = null` anche se la chiusura fallisce: una connessione rotta lasciata nel modulo verrebbe restituita da initDb()
  try {
    db?.close();
  } finally {
    db = null;
  }
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

/** Copia consistente (online backup) di uno dei due file: 'main' = gioco.db, 'utente' = partite.db.
 *  L'opzione `attached` esiste a runtime in better-sqlite3 ma non nei suoi tipi. */
export function copiaSchema(db: AppDatabase, destinazione: string, schema: 'main' | 'utente'): Promise<unknown> {
  return db.backup(destinazione, { attached: schema } as unknown as Database.BackupOptions);
}

/** Timestamp ISO-8601 UTC per le colonne created_at/updated_at. */
export function nowIso(): string {
  return new Date().toISOString();
}
