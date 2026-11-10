// ============================================================
// schemaMemo — «la tabella / la colonna c'è?» ricordato per connessione (L5-05, L5-08, L12-02)
// ============================================================
//
// Molte letture si adattano a uno schema più vecchio (le migrazioni aggiungono tabelle e colonne, i test caricano il seed a scaglioni) e
// per farlo interrogavano `sqlite_master` o `pragma_table_info` ad ogni richiesta, a volte per ogni pin. Qui la risposta si ricorda finché lo schema
// non cambia: la chiave è `PRAGMA <schema>.schema_version`, che SQLite aumenta ad ogni DDL (creare o togliere una tabella o un indice, aggiungere
// una colonna) della connessione o di un'altra. Una nuova connessione (importazione del pacchetto, riapertura) ha la sua memoria. Dentro una
// transazione non si ricorda niente: un DDL annullato riporterebbe `schema_version` a un valore già visto con un'altra struttura (le migrazioni
// girano in transazione e leggono lo schema che stanno cambiando).
// Due schemi: `main` (i dati di gioco) e `utente` (le partite), ognuno con la sua versione e la sua memoria. Per le migrazioni e le scritture che
// non vogliono memoria c'è `colonne.ts` (`haTabella`, `haColonna`): la stessa domanda, sempre riletta.
// Limite: un DETACH seguito dall'ATTACH di un altro file con lo stesso alias sulla stessa connessione non cambia la chiave (due file possono avere
// la stessa `schema_version`): chi lo fa deve usare `colonne.ts`. Oggi nessuna connessione che passa di qui lo fa (l'ATTACH/DETACH di
// `edizioneService` usa solo `colonne.ts`).
// ============================================================

import type { Statement } from 'better-sqlite3';
import type { AppDatabase } from './dbService.js';

export type SchemaDb = 'main' | 'utente';

interface Memoria { versione: unknown; tabelle: Map<string, boolean>; colonne: Map<string, boolean> }
const memorie = new WeakMap<AppDatabase, Partial<Record<SchemaDb, Memoria>>>();
const versioni = new WeakMap<AppDatabase, Partial<Record<SchemaDb, Statement>>>();

/** La memoria valida della connessione per lo schema, o null dentro una transazione (si legge sempre da capo). */
function memoriaDi(db: AppDatabase, schema: SchemaDb): Memoria | null {
  if (db.inTransaction) return null;
  let stmts = versioni.get(db);
  if (!stmts) { stmts = {}; versioni.set(db, stmts); }
  let stmt = stmts[schema];
  if (!stmt) { stmt = db.prepare(`PRAGMA ${schema}.schema_version`).pluck(); stmts[schema] = stmt; }
  const versione = stmt.get();
  let tutte = memorie.get(db);
  if (!tutte) { tutte = {}; memorie.set(db, tutte); }
  let m = tutte[schema];
  if (!m || m.versione !== versione) { m = { versione, tabelle: new Map(), colonne: new Map() }; tutte[schema] = m; }
  return m;
}

/** Vero se lo schema ha la tabella. */
export function haTabellaMemo(db: AppDatabase, schema: SchemaDb, tabella: string): boolean {
  const m = memoriaDi(db, schema);
  const ricordata = m?.tabelle.get(tabella);
  if (ricordata !== undefined) return ricordata;
  const c = !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(tabella);
  m?.tabelle.set(tabella, c);
  return c;
}

/** Vero se la tabella dello schema ha la colonna (falso se la tabella non c'è). */
export function haColonnaMemo(db: AppDatabase, schema: SchemaDb, tabella: string, colonna: string): boolean {
  const m = memoriaDi(db, schema);
  const chiave = `${tabella}\0${colonna}`;
  const ricordata = m?.colonne.get(chiave);
  if (ricordata !== undefined) return ricordata;
  const c = !!db.prepare('SELECT 1 FROM pragma_table_info(?, ?) WHERE name = ?').get(tabella, schema, colonna);
  m?.colonne.set(chiave, c);
  return c;
}

/** Vero se `main` ha la tabella. */
export const haTabellaMain = (db: AppDatabase, tabella: string): boolean => haTabellaMemo(db, 'main', tabella);
/** Vero se la tabella di `main` ha la colonna (falso se la tabella non c'è). */
export const haColonnaMain = (db: AppDatabase, tabella: string, colonna: string): boolean => haColonnaMemo(db, 'main', tabella, colonna);
/** Vero se `utente` (le partite) ha la tabella. */
export const haTabellaUtente = (db: AppDatabase, tabella: string): boolean => haTabellaMemo(db, 'utente', tabella);
/** Vero se la tabella di `utente` ha la colonna (falso se la tabella non c'è). */
export const haColonnaUtente = (db: AppDatabase, tabella: string, colonna: string): boolean => haColonnaMemo(db, 'utente', tabella, colonna);
