import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';
import { migraTestiCondizioni } from '../../../shared/migraCondizioni.js';
import { contestoConversione, contestoRiga } from '../../services/condizioni/contestoConversione.js';

/** Riscrive `condizioni_json` di negozi e articoli della guida dalla loro prosa (le righe tue restano come le hai scritte). */
export function sincronizzaCondizioniCatalogo(db: Database.Database): void {
  const base = contestoConversione(db);
  for (const tabella of ['negozio', 'articolo'] as const) {
    const righe = db.prepare(`SELECT * FROM ${tabella} WHERE condizioni_json IS NULL OR origine='seed'`).all() as Array<Record<string, unknown>>;
    for (const r of righe) {
      const ctx = contestoRiga(db, base, { tabella, chiave: String(r.chiave), negozio_chiave: r.negozio_chiave, confidente_chiave: r.confidente_chiave });
      const testi = (tabella === 'negozio' ? [r.sblocco] : [r.disponibile_dal, r.condizione]) as Array<string | null>;
      db.prepare(`UPDATE ${tabella} SET condizioni_json=? WHERE chiave=?`).run(JSON.stringify(migraTestiCondizioni(testi, ctx)), r.chiave);
    }
  }
}
export const migration036: Migration = { id: 36, name: 'condizioni_procedurali', up(db) {
  // `fatto_gioco` e `fatto_partita` nascevano qui (lo «stato» a nome libero) e la 064 le toglie.
  db.exec(`ALTER TABLE negozio ADD COLUMN condizioni_json TEXT;
    ALTER TABLE articolo ADD COLUMN condizioni_json TEXT;
    CREATE TABLE fatto_gioco (chiave TEXT PRIMARY KEY,nome TEXT NOT NULL,categoria TEXT NOT NULL,unita TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL);
    CREATE TABLE fatto_partita (partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,fatto_chiave TEXT NOT NULL REFERENCES fatto_gioco(chiave),valore INTEGER NOT NULL CHECK(valore>=0),updated_at TEXT NOT NULL,PRIMARY KEY(partita_id,fatto_chiave));`);
  sincronizzaCondizioniCatalogo(db);
} };
