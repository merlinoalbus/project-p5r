// ============================================================
// colonneCorrezione — le tre colonne del registro dei ripristini, aggiunte a una tabella di dati di gioco (L11 · R11-17/1)
// ============================================================
//
// Ogni tabella che si corregge e si ripristina dal servizio `/api/correzioni` ha tre colonne: `origine` ('seed' | 'utente', default 'seed'), `seed_json` (la
// fotografia dei valori della guida, presa dal servizio alla PRIMA correzione) e `updated_at` (quando). Nessuna di queste tabelle aveva una colonna che
// distinguesse una riga corretta dall'utente, quindi ogni riga di oggi è, per definizione, quella della guida: nessun valore cambia e nessuna fotografia si
// scrive adesso. Idempotente (ogni colonna si aggiunge solo se manca) e prudente: l'impronta di ogni colonna esistente delle tabelle toccate e di quelle
// collegate è identica prima e dopo, altrimenti la migrazione lancia (il runner annulla la transazione). Nessun import da `server/services/`; non scrive in `utente`.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';

const NUOVE = ['origine', 'seed_json', 'updated_at'] as const;

/** Aggiunge `origine`, `seed_json` e `updated_at` alle tabelle indicate (quelle che mancano della tabella non si toccano: l'istanza non le ha). */
export function aggiungiColonneCorrezione(db: AppDatabase, id: number, tabelle: readonly string[], vicine: readonly string[] = []): string[] {
  const errore = (motivo: string): never => { throw new Error(`${id}: ${motivo}; nessuna modifica applicata.`); };
  if (!db.inTransaction) errore('manca la transazione della migrazione');
  const presenti = tabelle.filter((t) => esisteTabella(db, t));
  const prima = new Map(presenti.map((t) => [t, improntaTabella(db, t, NUOVE)]));
  const impronteVicine = new Map(vicine.filter((t) => esisteTabella(db, t) && !tabelle.includes(t)).map((t) => [t, improntaTabella(db, t)]));
  for (const t of presenti) {
    const nuova = NUOVE.some((c) => !haColonna(db, t, c));
    if (!haColonna(db, t, 'origine')) db.exec(`ALTER TABLE main.${t} ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente'))`);
    if (!haColonna(db, t, 'seed_json')) db.exec(`ALTER TABLE main.${t} ADD COLUMN seed_json TEXT`);
    if (!haColonna(db, t, 'updated_at')) db.exec(`ALTER TABLE main.${t} ADD COLUMN updated_at TEXT`);
    // le colonne appena nate non possono avere righe corrette: se ne risultano, qualcosa non è come previsto
    const sporche = nuova ? db.prepare(`SELECT count(*) FROM main.${t} WHERE origine <> 'seed' OR seed_json IS NOT NULL`).pluck().get() as number : 0;
    if (sporche !== 0) errore(`${t}: ${sporche} righe risultano già corrette`);
  }
  for (const [t, imp] of prima) if (improntaTabella(db, t, NUOVE) !== imp) errore(`le colonne di ${t} sono cambiate`);
  for (const [t, imp] of impronteVicine) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
  logger.info({ migrazione: `L11-R11-17-${id}`, tabelle: presenti }, 'Tabelle correggibili: colonne del registro dei ripristini aggiunte');
  return presenti;
}
