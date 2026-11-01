// ============================================================
// schemaMemo — «la tabella / la colonna c'è?» ricordato per connessione (L5-05, L5-08)
// ============================================================
//
// Molte letture si adattano a uno schema più vecchio (le migrazioni aggiungono tabelle e colonne, i test caricano il seed a scaglioni) e
// per farlo interrogavano `sqlite_master` o `pragma_table_info` ad ogni richiesta, a volte per ogni pin. Qui la risposta si ricorda finché lo
// schema di `main` non cambia: la chiave è `PRAGMA main.schema_version`, che SQLite aumenta ad ogni DDL (creare o togliere una tabella o un
// indice, aggiungere una colonna) della connessione o di un'altra. Una nuova connessione (importazione del pacchetto, riapertura) ha la sua
// memoria. Dentro una transazione non si ricorda niente: un DDL annullato riporterebbe `schema_version` a un valore già visto con un'altra
// struttura (le migrazioni girano in transazione e leggono lo schema che stanno cambiando).
// Solo lo schema `main` (i dati di gioco); le tabelle di `utente` non passano di qui.
// ============================================================

import type { Statement } from 'better-sqlite3';
import type { AppDatabase } from './dbService.js';

interface Memoria { versione: unknown; tabelle: Map<string, boolean>; colonne: Map<string, boolean> }
const memorie = new WeakMap<AppDatabase, Memoria>();
const versioni = new WeakMap<AppDatabase, Statement>();

/** La memoria valida della connessione, o null dentro una transazione (si legge sempre da capo). */
function memoriaDi(db: AppDatabase): Memoria | null {
  if (db.inTransaction) return null;
  let stmt = versioni.get(db);
  if (!stmt) { stmt = db.prepare('PRAGMA main.schema_version').pluck(); versioni.set(db, stmt); }
  const versione = stmt.get();
  let m = memorie.get(db);
  if (!m || m.versione !== versione) { m = { versione, tabelle: new Map(), colonne: new Map() }; memorie.set(db, m); }
  return m;
}

/** Vero se `main` ha la tabella. */
export function haTabellaMain(db: AppDatabase, tabella: string): boolean {
  const m = memoriaDi(db);
  const ricordata = m?.tabelle.get(tabella);
  if (ricordata !== undefined) return ricordata;
  const c = !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);
  m?.tabelle.set(tabella, c);
  return c;
}

/** Vero se la tabella di `main` ha la colonna (falso se la tabella non c'è). */
export function haColonnaMain(db: AppDatabase, tabella: string, colonna: string): boolean {
  const m = memoriaDi(db);
  const chiave = `${tabella}\0${colonna}`;
  const ricordata = m?.colonne.get(chiave);
  if (ricordata !== undefined) return ricordata;
  const c = !!db.prepare("SELECT 1 FROM pragma_table_info(?, 'main') WHERE name = ?").get(tabella, colonna);
  m?.colonne.set(chiave, c);
  return c;
}
