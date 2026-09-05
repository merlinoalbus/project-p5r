import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';
import { dataSbloccoQuartiere } from '../../../shared/condizioniSpillo.js';
import { sincronizzaCondizioniCatalogo } from './036_condizioni_procedurali.js';
export function sincronizzaDateQuartieri(db:Database.Database):void {
  for(const q of db.prepare('SELECT chiave,sblocco FROM quartiere').all() as Array<{chiave:string;sblocco:string|null}>) db.prepare('UPDATE quartiere SET sblocco_data=? WHERE chiave=?').run(dataSbloccoQuartiere(q.sblocco),q.chiave);
}
export const migration037:Migration={id:37,name:'sblocco_quartieri_strutturato',up(db){
  db.exec('ALTER TABLE quartiere ADD COLUMN sblocco_data TEXT');
  sincronizzaDateQuartieri(db);
  sincronizzaCondizioniCatalogo(db);
}};
