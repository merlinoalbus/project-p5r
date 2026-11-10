// ============================================================
// 372 — via le tre frasi di date del Palazzo (L9-01)
// ============================================================
//
// Le date di un Palazzo stanno in colonne strutturate dalla 308: `finestra_dal`, `finestra_al`, `furto_consigliato_data`, `lettera_entro`. Le tre
// colonne di testo di prima (`data_sblocco`, `data_scadenza`, `furto_consigliato`) sono vuote in tutti i 10 dungeon dei dati di oggi e nessun
// servizio le legge più (solo le migrazioni 183, 232 e 308, che girano prima di questa).
//
// Un backup vecchio può avere ancora un testo: la 308 saltava i Palazzi con `seed_json` non nullo. Ogni valore non vuoto va in
// `dati_guida.archivio-frasi-l11` prima del drop, nulla si perde. `furto_consigliato_data` è un'altra colonna e resta intatta: il controllo
// con le impronte confronta tutte le colonne di `dungeon` tranne le tre tolte. Il Cestino e i backup vecchi leggono le voci di `fontiTolte.ts`.
//
// Idempotente: si salta se le colonne non ci sono più. Verbale: `dati_guida.audit-l9-01-frasi-date`. Non si scrive in `utente`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna, improntaTabella } from './pulizieL11.js';
import { archiviaSenzaSovrascrivere, righeArchiviate, registraAudit } from './archivioL1.js';

const COLONNE = ['data_sblocco', 'data_scadenza', 'furto_consigliato'] as const;

const errore = (motivo: string): never => { throw new Error(`372: ${motivo}; nessuna modifica applicata.`); };

export const migration372: Migration = {
  id: 372,
  name: 'dungeon_tolte_tre_frasi_di_date',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'dungeon')) return;
    const daTogliere = COLONNE.filter((c) => haColonna(db, 'dungeon', c));
    if (daTogliere.length === 0) return;
    if (!esisteTabella(db, 'dati_guida')) errore('manca la tabella dati_guida');

    const impronta = improntaTabella(db, 'dungeon', COLONNE);
    const archiviate: Record<string, number> = {};
    for (const colonna of daTogliere) {
      const righe = (db.prepare(`SELECT chiave, "${colonna}" AS v FROM main.dungeon ORDER BY rowid`).all() as Array<{ chiave: string; v: string | null }>).filter((r) => (r.v ?? '').trim() !== '');
      archiviate[colonna] = righe.length;
      if (righe.length === 0) continue;
      archiviaSenzaSovrascrivere(db, 'L9-01 · 372', `dungeon.${colonna}`, Object.fromEntries(righe.map((r) => [r.chiave, r.v as string])));
      const presenti = righeArchiviate(db, `dungeon.${colonna}`);
      if (!righe.every((r) => r.chiave in presenti)) errore(`l’archivio di dungeon.${colonna} non ha tutte le righe`);
    }

    for (const colonna of daTogliere) {
      db.exec(`ALTER TABLE main.dungeon DROP COLUMN "${colonna}"`);
      if (haColonna(db, 'dungeon', colonna)) errore(`la colonna dungeon.${colonna} esiste ancora`);
    }
    if (improntaTabella(db, 'dungeon', COLONNE) !== impronta) errore('le altre colonne di dungeon sono cambiate');

    registraAudit(db, 'audit-l9-01-frasi-date', { migrazione: 'L9-01 · 372', colonneTolte: daTogliere.map((c) => `dungeon.${c}`), righeArchiviate: archiviate, impronta });
    logger.info({ migrazione: 'L9-01-372', tolte: daTogliere, archiviate }, 'dungeon: tolte le tre frasi di date');
  },
};
