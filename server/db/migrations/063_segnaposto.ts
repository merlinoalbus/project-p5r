// ============================================================
// 063 — segnaposto: il numero è già stato consumato
// ============================================================
//
// Le installazioni esistenti (locale e cloud) hanno `PRAGMA user_version = 63`: una migrazione
// con quel numero è stata applicata e poi assorbita nella 062 prima di arrivare su `main`. Il
// registro non ammette buchi e il runner applica solo gli id maggiori della versione corrente:
// una migrazione nuova numerata 63 non girerebbe mai su quei database. Questa non fa nulla e
// tiene il posto; il lavoro vero comincia dalla 064.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration063: Migration = { id: 63, name: 'segnaposto_numero_consumato', up() { /* niente da fare */ } };
