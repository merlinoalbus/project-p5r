import type { Migration } from '../migrationRunner.js';
import { sincronizzaPercorsiMappe } from '../../services/mappe/percorsiMappe.js';
export const migration038:Migration={id:38,name:'percorsi_mappe',up(db){
  db.exec('CREATE TABLE mappa_percorso(mappa_chiave TEXT PRIMARY KEY REFERENCES mappa(chiave) ON DELETE CASCADE,chiave TEXT NOT NULL UNIQUE,nome TEXT NOT NULL); CREATE TABLE mappa_alias(chiave TEXT PRIMARY KEY,mappa_chiave TEXT NOT NULL REFERENCES mappa(chiave) ON DELETE CASCADE)');
  sincronizzaPercorsiMappe(db);
}};
