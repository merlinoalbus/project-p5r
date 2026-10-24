// ============================================================
// pulizieL11 — gli attrezzi comuni delle migrazioni che tolgono colonne e tabelle (L11, blocco B12)
// ============================================================
//
// Una migrazione che toglie una colonna con dati: (1) ARCHIVIA nel blocco `dati_guida.archivio-frasi-l11` ciò che la struttura nuova non ripete
// (convenzione delle migrazioni 176 e 177: righe archiviate = righe tolte, mai un valore perso in silenzio), (2) toglie la colonna, (3) controlla
// che il resto delle tabelle sia identico (impronta di ogni riga prima e dopo). Ogni anomalia lancia PRIMA di cambiare qualcosa: il runner
// esegue la migrazione in una transazione e la copia di avvio è la via di ritorno.
// Nessun import da `server/services/`; non si scrive in `utente`.
// ============================================================

import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';

/** Il blocco di `dati_guida` che raccoglie le frasi tolte da L11: per colonna, le righe (chiave → valore) che la struttura nuova non ripete. */
export const ARCHIVIO_FRASI = 'archivio-frasi-l11';

export type RigheArchiviate = Record<string, unknown>;

export const esisteTabella = (db: AppDatabase, tabella: string): boolean =>
  !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(tabella);

export const colonneDi = (db: AppDatabase, tabella: string): string[] =>
  (db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);

export const haColonna = (db: AppDatabase, tabella: string, colonna: string): boolean => colonneDi(db, tabella).includes(colonna);

export const conta = (db: AppDatabase, sql: string): number => (db.prepare(sql).pluck().get() as number | null) ?? 0;

/** Impronta (conteggio e SHA-256) di ogni riga della tabella, nell'ordine di inserimento, senza le colonne indicate. */
export function improntaTabella(db: AppDatabase, tabella: string, senza: readonly string[] = []): string {
  const colonne = colonneDi(db, tabella).filter((c) => !senza.includes(c));
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare(`SELECT ${colonne.map((c) => `"${c}"`).join(', ')} FROM main.${tabella} ORDER BY rowid`).iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

/** Aggiunge al blocco d'archivio le righe tolte (per colonna «tabella.colonna») e le prove della migrazione, senza perdere ciò che c'era già. */
export function archiviaFrasi(db: AppDatabase, migrazione: string, colonne: Record<string, RigheArchiviate>, prove: Record<string, unknown>): void {
  const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO_FRASI) as string | undefined;
  const blocco = esistente ? JSON.parse(esistente) as { migrazioni?: string[]; colonne?: Record<string, RigheArchiviate>; prove?: Record<string, unknown> } : {};
  const nuovo = {
    versione: 1,
    motivo: 'Frasi e copie tolte dal modello (L11, B12): qui resta ciò che la struttura nuova non ripete, per colonna «tabella.colonna» (chiave della riga → valore).',
    migrazioni: [...new Set([...(blocco.migrazioni ?? []), migrazione])],
    colonne: { ...(blocco.colonne ?? {}), ...colonne },
    prove: { ...(blocco.prove ?? {}), ...prove },
  };
  db.prepare('INSERT OR REPLACE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run(ARCHIVIO_FRASI, JSON.stringify(nuovo));
}

/** Le righe archiviate di una colonna, rilette dal database (per il controllo «righe archiviate = righe tolte»). */
export function archiviate(db: AppDatabase, colonna: string): number {
  const json = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(ARCHIVIO_FRASI) as string | undefined;
  const c = json ? (JSON.parse(json) as { colonne?: Record<string, RigheArchiviate> }).colonne?.[colonna] : undefined;
  return c ? Object.keys(c).length : 0;
}

/** Le righe di una colonna di testo con un valore, come «chiave → valore» (per archiviarle tutte). */
export function righeConValore(db: AppDatabase, tabella: string, colonna: string, vuoti: readonly string[] = ['']): RigheArchiviate {
  const segnaposto = vuoti.map(() => '?').join(', ');
  const righe = db.prepare(`SELECT chiave, "${colonna}" AS v FROM main.${tabella} WHERE "${colonna}" IS NOT NULL AND "${colonna}" NOT IN (${segnaposto}) ORDER BY rowid`).all(...vuoti) as Array<{ chiave: string; v: unknown }>;
  return Object.fromEntries(righe.map((r) => [r.chiave, r.v]));
}
