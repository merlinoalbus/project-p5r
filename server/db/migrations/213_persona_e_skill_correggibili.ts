// ============================================================
// 213 — la Persona e le sue skill si correggono e si ripristinano (L11 · R11-15/3)
// ============================================================
//
// `persona` e `skill` ricevono le tre colonne del registro dei ripristini (come la 178 e la 198): `origine` ('seed' | 'utente', default 'seed'), `seed_json` (la
// fotografia dei valori della guida, presa alla PRIMA correzione) e `updated_at` (quando). Nessuna delle due tabelle aveva una colonna che distinguesse una riga
// corretta dall'utente, quindi ogni riga di oggi è, per definizione, quella della guida: nessun valore cambia e nessuna fotografia si scrive adesso. L'impronta
// di ogni colonna esistente (e di `persona_skill`, `persona_affinita`, `traduzione`) è identica prima e dopo. Idempotente (ogni colonna si aggiunge solo se manca).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';

const errore = (motivo: string): never => { throw new Error(`213: ${motivo}; nessuna modifica applicata.`); };
const TABELLE = ['persona', 'skill'] as const;
const NUOVE = ['origine', 'seed_json', 'updated_at'];

export const migration213: Migration = {
  id: 213, name: 'persona_e_skill_correggibili',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const presenti = TABELLE.filter((t) => esisteTabella(db, t));
    if (presenti.length === 0) return;
    const prima = new Map(presenti.map((t) => [t, improntaTabella(db, t, NUOVE)]));
    const vicine = ['persona_skill', 'persona_affinita', 'traduzione', 'arcana'].filter((t) => esisteTabella(db, t));
    const impronteVicine = new Map(vicine.map((t) => [t, improntaTabella(db, t)]));
    for (const t of presenti) {
      if (!haColonna(db, t, 'origine')) db.exec(`ALTER TABLE main.${t} ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente'))`);
      if (!haColonna(db, t, 'seed_json')) db.exec(`ALTER TABLE main.${t} ADD COLUMN seed_json TEXT`);
      if (!haColonna(db, t, 'updated_at')) db.exec(`ALTER TABLE main.${t} ADD COLUMN updated_at TEXT`);
    }
    for (const [t, imp] of prima) if (improntaTabella(db, t, NUOVE) !== imp) errore(`le colonne di ${t} sono cambiate`);
    for (const [t, imp] of impronteVicine) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-R11-15-213', tabelle: presenti }, 'Persona e skill correggibili');
  },
};
