import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';
import { migraTestiCondizioni } from '../../../shared/migraCondizioni.js';

export function sincronizzaCondizioniCatalogo(db:Database.Database):void {
  for(const tabella of ['negozio','articolo'] as const){
    const righe=db.prepare(`SELECT * FROM ${tabella} WHERE condizioni_json IS NULL OR origine='seed'`).all() as Array<Record<string,unknown>>;
    for(const r of righe){
      const confidente=tabella==='negozio'?r.confidente_chiave:(db.prepare('SELECT confidente_chiave FROM negozio WHERE chiave=?').get(r.negozio_chiave) as {confidente_chiave:string|null}|undefined)?.confidente_chiave;
      const testi=(tabella==='negozio'?[r.sblocco]:[r.disponibile_dal,r.condizione]) as Array<string|null>;
      db.prepare(`UPDATE ${tabella} SET condizioni_json=? WHERE chiave=?`).run(JSON.stringify(migraTestiCondizioni(testi,confidente as string|null)),r.chiave);
    }
  }
}
export const migration036:Migration={id:36,name:'condizioni_procedurali',up(db){
  db.exec(`ALTER TABLE negozio ADD COLUMN condizioni_json TEXT;
    ALTER TABLE articolo ADD COLUMN condizioni_json TEXT;
    CREATE TABLE fatto_gioco (chiave TEXT PRIMARY KEY,nome TEXT NOT NULL,categoria TEXT NOT NULL,unita TEXT NOT NULL DEFAULT '',updated_at TEXT NOT NULL);
    CREATE TABLE fatto_partita (partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,fatto_chiave TEXT NOT NULL REFERENCES fatto_gioco(chiave),valore INTEGER NOT NULL CHECK(valore>=0),updated_at TEXT NOT NULL,PRIMARY KEY(partita_id,fatto_chiave));`);
  sincronizzaCondizioniCatalogo(db);
}};
