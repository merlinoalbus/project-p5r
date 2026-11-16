// ============================================================
// colonne — le due domande sullo schema: c'è la tabella? c'è la colonna?
// ============================================================

import type Database from 'better-sqlite3';

/** Vero se la tabella esiste nello schema indicato (`main` = gioco.db, `utente` = partite.db, o l'alias di un file attaccato), letto da `sqlite_master`; sempre riletto, mai ricordato (la versione ricordata per le letture è `schemaMemo.ts`). */
export function haTabella(db: Database.Database, tabella: string, schema = 'main'): boolean {
  return !!db.prepare(`SELECT 1 FROM "${schema.replaceAll('"', '""')}".sqlite_master WHERE type = 'table' AND name = ?`).get(tabella);
}

/** Vero se la tabella dello schema indicato ha la colonna (falso se la tabella non c'è), cercata con `pragma_table_info`; sempre riletta. */
export function haColonna(db: Database.Database, tabella: string, colonna: string, schema = 'main'): boolean {
  return !!db.prepare('SELECT 1 FROM pragma_table_info(?, ?) WHERE name = ?').get(tabella, schema, colonna);
}
