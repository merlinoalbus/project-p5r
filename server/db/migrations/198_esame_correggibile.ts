// ============================================================
// 198 — gli esami si correggono e si ripristinano (L11 · R11-15/7)
// ============================================================
//
// Dopo R9-18 (migrazione 191) le domande e i giorni d'esame stanno solo nelle righe `domanda`, che hanno già «Modifica» e «Ripristina» (catalogo:
// `origine`, `seed_json`). All'esame restano il nome, la data dei risultati e le note: erano in sola lettura. Qui `esame` riceve le tre colonne
// delle altre righe correggibili (178): `origine` ('seed' | 'utente'), `seed_json` (la fotografia dei campi alla prima correzione, presa dal
// servizio di correzione, non qui) e `updated_at`.
// Conservativa: le colonne nascono con `origine = 'seed'` e `seed_json = NULL` per ogni riga, perché finora nessuno poteva correggere un esame:
// non c'è una modifica dell'utente da proteggere né da fotografare; la fotografia della guida si prende alla prima correzione (com'è per
// quartieri, trofei e Doti). Nessun dato si sposta: la migrazione controlla che ogni colonna di prima di `esame` e le tabelle collegate
// (`domanda`, `domanda_partita`, `esame_premi`, `esame_piazzamento_partita`) siano identiche, riga per riga, prima e dopo.
// Idempotente. Scrive solo in `main`; ogni anomalia lancia prima di cambiare qualcosa.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { colonneDi, esisteTabella, improntaTabella } from './pulizieL11.js';

const errore = (motivo: string): never => { throw new Error(`198: ${motivo}; nessuna modifica applicata.`); };
const NUOVE = ['origine', 'seed_json', 'updated_at'] as const;
const INTATTE = ['domanda', 'domanda_partita', 'esame_premi', 'esame_piazzamento_partita'] as const;

export const migration198: Migration = {
  id: 198, name: 'esame_correggibile',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'esame')) return;
    const prima = colonneDi(db, 'esame');
    if (NUOVE.every((c) => prima.includes(c))) return;

    const impronteEsame = improntaTabella(db, 'esame', NUOVE);
    const altre = new Map<string, string>();
    for (const t of INTATTE) if (esisteTabella(db, t)) altre.set(t, improntaTabella(db, t));

    if (!prima.includes('origine')) db.exec("ALTER TABLE main.esame ADD COLUMN origine TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed','utente'))");
    if (!prima.includes('seed_json')) db.exec('ALTER TABLE main.esame ADD COLUMN seed_json TEXT');
    if (!prima.includes('updated_at')) db.exec('ALTER TABLE main.esame ADD COLUMN updated_at TEXT');

    const dopo = colonneDi(db, 'esame');
    for (const c of NUOVE) if (!dopo.includes(c)) errore(`manca la colonna esame.${c}`);
    const nonDiSeed = db.prepare("SELECT count(*) FROM main.esame WHERE origine <> 'seed' OR seed_json IS NOT NULL OR updated_at IS NOT NULL").pluck().get() as number;
    if (nonDiSeed !== 0) errore(`${nonDiSeed} esami risultano già corretti: la modifica degli esami non esisteva`);
    if (improntaTabella(db, 'esame', NUOVE) !== impronteEsame) errore('le colonne di prima di esame sono cambiate');
    for (const [t, impronta] of altre) if (improntaTabella(db, t) !== impronta) errore(`la tabella ${t} è cambiata`);
    logger.info({ migrazione: 'L11-R11-15-7-198', esami: db.prepare('SELECT count(*) FROM main.esame').pluck().get() }, 'esame: colonne di correzione aggiunte');
  },
};
