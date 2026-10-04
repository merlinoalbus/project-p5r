// ============================================================
// Migrazione 037 — data di sblocco dei quartieri strutturata
// ============================================================
//
// Aggiunge `quartiere.sblocco_data`, ricavata dalla prosa di `quartiere.sblocco`, e riconverte le
// condizioni di negozi e articoli della guida (la 036) ora che le date dei quartieri sono leggibili.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type Database from 'better-sqlite3';
import { dataSbloccoQuartiere } from '../../../shared/condizioniSpillo.js';
import { sincronizzaCondizioniCatalogo } from './036_condizioni_procedurali.js';
/** Scrive in `sblocco_data` di ogni quartiere la data ricavata dalla prosa del suo `sblocco` (null se non se ne ricava una). */
function sincronizzaDateQuartieri(db:Database.Database):void {
  for(const q of db.prepare('SELECT chiave,sblocco FROM quartiere').all() as Array<{chiave:string;sblocco:string|null}>) db.prepare('UPDATE quartiere SET sblocco_data=? WHERE chiave=?').run(dataSbloccoQuartiere(q.sblocco),q.chiave);
}
export const migration037:Migration={id:37,name:'sblocco_quartieri_strutturato',up(db){
  db.exec('ALTER TABLE quartiere ADD COLUMN sblocco_data TEXT');
  sincronizzaDateQuartieri(db);
  sincronizzaCondizioniCatalogo(db);
}};
