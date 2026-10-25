// ============================================================
// improntaSchema — l'impronta della struttura di uno schema SQLite (L12, passi 7 e 9 del progetto delle due istanze)
// ============================================================
//
// La struttura delle partite è congelata alla consegna (`docs/coordinamento/lotti/L12/progetto-due-istanze.md`, §5): la «Prepara edizione» della
// preparazione registra nel manifesto l'impronta dello schema di `partite-vuoto.db`, e l'istanza di rilascio la ricalcola a ogni avvio sul file
// delle partite vero: se le due non coincidono l'avvio si ferma, perché il codice scriverebbe su tabelle diverse da quelle che si aspetta.
//
// Il modulo non importa né il runner né le cartelle delle migrazioni: lo può usare anche il punto d'avvio del rilascio, che quelle cartelle
// non le carica. È l'unica definizione dell'algoritmo: chi lo ricalcola altrove deve chiamare questa funzione, non riscriverla.
// ============================================================

import { createHash } from 'node:crypto';
import type Database from 'better-sqlite3';

/** Il nome dell'algoritmo, scritto nel manifesto accanto all'impronta: se un giorno cambia, i due lati non si confondono. */
export const ALGORITMO_IMPRONTA_SCHEMA = 'sqlite_master-v1';

/**
 * L'impronta (SHA-256 esadecimale) della struttura di uno schema: tabelle, indici, viste e trigger con il loro testo di creazione, in ordine
 * stabile (tipo e nome). Le tabelle interne di SQLite (`sqlite_%`) non contano. I dati non entrano: due file con le stesse tabelle e righe
 * diverse hanno la stessa impronta.
 */
export function improntaSchema(db: Database.Database, schema: 'main' | 'utente'): string {
  const righe = db.prepare(`SELECT type, name, tbl_name, COALESCE(sql, '') AS sql FROM "${schema}".sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name`).all() as
    Array<{ type: string; name: string; tbl_name: string; sql: string }>;
  const hash = createHash('sha256');
  for (const r of righe) hash.update(`${r.type}|${r.name}|${r.tbl_name}|${r.sql}\n`);
  return hash.digest('hex');
}
