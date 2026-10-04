// ============================================================
// Migrazione 039 — ingresso di ogni quartiere su una mappa
// ============================================================
//
// Crea `quartiere_ingresso`: per ogni quartiere la mappa e il punto (x, y in percentuale, zoom 1–6)
// da cui si entra.
// ============================================================

import type { Migration } from '../migrationRunner.js';
export const migration039:Migration={id:39,name:'ingressi_quartieri',up(db){db.exec('CREATE TABLE quartiere_ingresso(quartiere_chiave TEXT PRIMARY KEY REFERENCES quartiere(chiave) ON DELETE CASCADE,mappa_chiave TEXT NOT NULL REFERENCES mappa(chiave) ON DELETE CASCADE,x REAL NOT NULL CHECK(x BETWEEN 0 AND 100),y REAL NOT NULL CHECK(y BETWEEN 0 AND 100),zoom REAL NOT NULL CHECK(zoom BETWEEN 1 AND 6))');}};
