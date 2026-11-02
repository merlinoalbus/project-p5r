// ============================================================
// decisioniDati0111 — gli attrezzi comuni delle migrazioni 341-343 (decisioni dell'utente del 01/11 sui dati, dal censimento L8-02)
// ============================================================
//
// Le tre migrazioni applicano le risposte dell'utente del 1° novembre ai casi in dubbio e ai conflitti di dati del censimento «L8-02 — avvisi
// del giorno» (revisione 2): 341 le voci nuove del Diario e il nome del rango 6 di Igor, 342 date e testi del calendario e della trama, 343 gli
// avvisi del giorno. Regole comuni: un dato si scrive solo se è ancora quello atteso, parola per parola, e mai corretto dall'utente
// (`origine = 'seed'`, `seed_json IS NULL` dove la tabella le ha); una seconda esecuzione trova tutto già fatto e non cambia niente; ogni
// tabella vicina resta identica riga per riga (impronte prima e dopo, escluse le sole righe dell'elenco). Nessun import da `server/services/`.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import { colonneDi, esisteTabella } from './pulizieL11.js';

/** L'impronta di ogni riga di una tabella di `main`, per chiave (le colonne della chiave unite da «|»): il confronto prima/dopo riga per riga. */
export function righePerChiave(db: AppDatabase, tabella: string, chiave: readonly string[]): Map<string, string> {
  const m = new Map<string, string>();
  if (!esisteTabella(db, tabella)) return m;
  const colonne = colonneDi(db, tabella);
  for (const r of db.prepare(`SELECT ${colonne.map((c) => `"${c}"`).join(', ')} FROM main."${tabella}"`).iterate() as Iterable<Record<string, unknown>>) {
    m.set(chiave.map((c) => String(r[c])).join('|'), createHash('sha256').update(JSON.stringify(r)).digest('hex'));
  }
  return m;
}

/** Le righe cambiate, aggiunte o tolte fra due impronte, fuori dalle chiavi ammesse: deve essere vuoto. */
export function diverseFuori(prima: Map<string, string>, dopo: Map<string, string>, ammesse: ReadonlySet<string>): string[] {
  const fuori: string[] = [];
  for (const [k, h] of prima) if (!ammesse.has(k) && dopo.get(k) !== h) fuori.push(k);
  for (const k of dopo.keys()) if (!ammesse.has(k) && !prima.has(k)) fuori.push(k);
  return fuori;
}

/** L'impronta di tutte le tabelle dello schema delle partite (righe in ordine di rowid): le migrazioni di gioco non le toccano. Null senza
 *  lo schema delle partite attaccato. */
export function improntaPartite(db: AppDatabase): string | null {
  const schemi = db.prepare('PRAGMA database_list').all() as Array<{ name: string }>;
  if (!schemi.some((s) => s.name === 'utente')) return null;
  const h = createHash('sha256');
  const tabelle = db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").pluck().all() as string[];
  for (const t of tabelle) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}" ORDER BY rowid`).raw().iterate() as Iterable<unknown[]>) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** Accoda all'audit `chiave` di `dati_guida` un'esecuzione, solo se è la prima o se qualcosa è cambiato (una seconda esecuzione identica non
 *  lo sporca). */
export function scriviAudit(db: AppDatabase, chiave: string, migrazione: number, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  if (esistente && !cambiato) return;
  const esecuzioni = esistente ? ((JSON.parse(esistente) as { esecuzioni?: unknown[] }).esecuzioni ?? []) : [];
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, decisioni: 'risposte dell\'utente del 01/11 al censimento L8-02 (revisione 2)', esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}
