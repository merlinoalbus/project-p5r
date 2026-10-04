// ============================================================
// Migrazione 038 — percorsi e alias delle mappe
// ============================================================
//
// Crea `mappa_percorso` (per ogni mappa il percorso leggibile usato negli indirizzi, composto dai
// nomi della sua gerarchia) e `mappa_alias` (chiavi alternative che portano a una mappa), poi le
// riempie con `sincronizzaPercorsiMappe`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { sincronizzaPercorsiMappe } from '../../services/mappe/percorsiMappe.js';
export const migration038:Migration={id:38,name:'percorsi_mappe',up(db){
  db.exec('CREATE TABLE mappa_percorso(mappa_chiave TEXT PRIMARY KEY REFERENCES mappa(chiave) ON DELETE CASCADE,chiave TEXT NOT NULL UNIQUE,nome TEXT NOT NULL); CREATE TABLE mappa_alias(chiave TEXT PRIMARY KEY,mappa_chiave TEXT NOT NULL REFERENCES mappa(chiave) ON DELETE CASCADE)');
  sincronizzaPercorsiMappe(db);
}};
