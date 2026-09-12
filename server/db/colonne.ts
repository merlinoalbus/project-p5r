// ============================================================
// colonne — le due domande che ogni migrazione fa allo schema
// ============================================================

import type Database from 'better-sqlite3';

export function haTabella(db: Database.Database, tabella: string, schema: 'main' | 'utente' = 'main'): boolean {
  return !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(tabella);
}

export function haColonna(db: Database.Database, tabella: string, colonna: string, schema: 'main' | 'utente' = 'main'): boolean {
  return (db.prepare(`PRAGMA ${schema}.table_info(${tabella})`).all() as Array<{ name: string }>).some((c) => c.name === colonna);
}

/** Aggiunge la colonna se manca: le migrazioni restano idempotenti anche su un file già toccato. */
export function aggiungiColonna(db: Database.Database, tabella: string, colonna: string, tipo: string): boolean {
  if (haColonna(db, tabella, colonna)) return false;
  db.exec(`ALTER TABLE ${tabella} ADD COLUMN ${colonna} ${tipo}`);
  return true;
}
