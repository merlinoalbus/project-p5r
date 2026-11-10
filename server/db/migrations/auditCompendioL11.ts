// ============================================================
// auditCompendioL11 — gli attrezzi comuni delle migrazioni sui dati del compendio (L11, «Compendio e fusioni»)
// ============================================================
//
// Le migrazioni 366 e 367 usano le impronte di `decisioniDati0111.ts`, ma il suo `scriviAudit` ha il motivo fisso sulle decisioni del 01/11:
// qui c'è lo stesso audit, nella stessa forma, con il motivo della migrazione. Nessun import da `server/services/`.
// ============================================================

import type { AppDatabase } from '../dbService.js';

/** L'esito di un dato nell'audit: il prima e il dopo ci sono solo se è stato scritto. */
export interface EsitoDato { chiave: string; esito: string; prima?: unknown; dopo?: unknown; perche?: string }

/** Le colonne che dicono se una riga è ancora quella della guida. */
export interface RigaCorreggibile { origine: string; seed_json: string | null }

/** Vero se la riga è ancora quella della guida, mai corretta dall'utente. */
export const dellaGuida = (r: RigaCorreggibile): boolean => r.origine === 'seed' && r.seed_json === null;

/** Accoda all'audit `chiave` di `dati_guida` un'esecuzione, solo se è la prima o se qualcosa è cambiato (una seconda esecuzione identica non
 *  lo sporca). `decisioni` dice da dove vengono le correzioni. */
export function scriviAuditCompendio(db: AppDatabase, chiave: string, migrazione: number, decisioni: string, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const esistente = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(chiave) as string | undefined;
  if (esistente && !cambiato) return;
  const esecuzioni = esistente ? ((JSON.parse(esistente) as { esecuzioni?: unknown[] }).esecuzioni ?? []) : [];
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(chiave, JSON.stringify({ migrazione, decisioni, esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }] }));
}
