// ============================================================
// 225 — i luoghi d'incontro e le voci delle Ombre si correggono e si ripristinano (L11 · R11-17/1, gruppo Ombre)
// ============================================================
//
// `ombra_luogo` (dove si incontra un'Ombra: Palazzo, infiltrazione o dedalo, fonte) e `ombra_voce` (quale voce Persona della guida descrive quale Ombra) non avevano
// scrittori: si cambiavano solo sostituendo il pacchetto. Il servizio unico di correzione (`ripristinoService`, registro `righeOmbra.ts`, tipi `ombra-luogo` e
// `ombra-voce`) legge `seed_json` come «i valori della guida presi alla prima correzione», e `NULL` quando la riga non è corretta: la stessa convenzione di
// quartieri, trofei, esami e Ombre. Qui si aggiungono a entrambe le tabelle:
//   - `origine` ('seed' | 'utente', default 'seed'): nessuna riga è già una correzione dell'utente, quindi tutte restano 'seed';
//   - `seed_json` (NULL): la fotografia si prende alla prima correzione;
//   - `updated_at` (NULL): l'ora dell'ultima correzione.
// Nessuna colonna di dati cambia: la migrazione controlla che l'impronta di ogni colonna diversa da `origine`, `seed_json` e `updated_at` sia identica prima e dopo,
// che le tabelle vicine (le Ombre, i pin, i Palazzi e i dedali) e la vista `ombra_luogo_dedalo` non cambino, e che nessuna riga risulti corretta.
// Idempotente: una colonna già presente non si ricrea. Scrive solo in `main`; ogni anomalia lancia, e il runner annulla la transazione.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { conta, esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';

const errore = (motivo: string): never => { throw new Error(`225: ${motivo}; nessuna modifica applicata.`); };

const TABELLE = ['ombra_luogo', 'ombra_voce'] as const;
const VICINE = ['ombra', 'punto_interesse', 'dungeon', 'dungeon_area', 'area_dedalo', 'persona_area_dedalo'] as const;
const SENZA = ['origine', 'seed_json', 'updated_at'];

/** Impronta delle righe della vista (conteggio e SHA-256, in un ordine fisso): la vista non ha `rowid`. */
function improntaVista(db: Parameters<Migration['up']>[0]): string {
  const h = createHash('sha256');
  let n = 0;
  for (const r of db.prepare('SELECT ombra_chiave, dungeon_chiave, dedalo_chiave, area_dedalo_chiave, voce_chiave FROM main.ombra_luogo_dedalo ORDER BY ombra_chiave, dedalo_chiave, area_dedalo_chiave, voce_chiave').iterate()) { h.update(JSON.stringify(r) + '\n'); n++; }
  return `${n}:${h.digest('hex')}`;
}

export const migration225: Migration = {
  id: 225, name: 'ombra_luoghi_e_voci_correggibili',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!TABELLE.every((t) => esisteTabella(db, t))) return;

    const prima = new Map(TABELLE.map((t) => [t, improntaTabella(db, t, SENZA)]));
    const righe = new Map(TABELLE.map((t) => [t, conta(db, `SELECT COUNT(*) FROM main.${t}`)]));
    const vicine = new Map(VICINE.filter((t) => esisteTabella(db, t)).map((t) => [t, improntaTabella(db, t)]));
    const vista = db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'view' AND name = 'ombra_luogo_dedalo'").get() ? improntaVista(db) : null;

    for (const t of TABELLE) {
      if (!haColonna(db, t, 'origine')) db.exec(`ALTER TABLE main.${t} ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed', 'utente'))`);
      if (!haColonna(db, t, 'seed_json')) db.exec(`ALTER TABLE main.${t} ADD COLUMN seed_json TEXT CHECK (seed_json IS NULL OR json_valid(seed_json))`);
      if (!haColonna(db, t, 'updated_at')) db.exec(`ALTER TABLE main.${t} ADD COLUMN updated_at TEXT`);
    }

    for (const t of TABELLE) {
      if (improntaTabella(db, t, SENZA) !== prima.get(t)) errore(`le colonne di dati di ${t} sono cambiate`);
      if (conta(db, `SELECT COUNT(*) FROM main.${t}`) !== righe.get(t)) errore(`il numero di righe di ${t} è cambiato`);
      const corrette = conta(db, `SELECT COUNT(*) FROM main.${t} WHERE origine <> 'seed' OR seed_json IS NOT NULL OR updated_at IS NOT NULL`);
      if (corrette !== 0) errore(`${corrette} righe di ${t} risultano già corrette`);
    }
    for (const [t, imp] of vicine) if (improntaTabella(db, t) !== imp) errore(`la tabella ${t} è cambiata`);
    if (vista !== null && improntaVista(db) !== vista) errore('la vista ombra_luogo_dedalo è cambiata');
    logger.info({ migrazione: 'L11-R11-17-1-225', luoghi: righe.get('ombra_luogo'), voci: righe.get('ombra_voce') }, 'ombra_luogo e ombra_voce correggibili');
  },
};
