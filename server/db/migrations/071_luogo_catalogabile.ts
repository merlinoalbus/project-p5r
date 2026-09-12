// ============================================================
// 071 — un luogo della città è una voce del catalogo come le altre
// ============================================================
//
// `luogo` era l'unica tabella della guida senza `origine`, `nascosto`, `seed_json` e
// `condizioni_json`: non si poteva aggiungere un luogo, nasconderlo o ripristinarlo, e la sua
// regola di presenza stava in `dati_guida.sblocco-luoghi` invece che sulla riga. Qui la tabella
// riceve le stesse colonne del resto del catalogo; `condizioni_json` prende le regole scritte a
// mano in `sblocco-luoghi` (la colonna, quando non è nulla, vince sul JSON della guida) e
// `seed_json` fotografa la riga com'è, per il «ripristina dalla guida».
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna, haTabella } from '../colonne.js';
import { normalizzaCondizioniSpillo } from '../../../shared/condizioniSpillo.js';

export const migration071: Migration = {
  id: 71,
  name: 'luogo_catalogabile',
  up(db) {
    aggiungiColonna(db, 'luogo', 'origine', "TEXT NOT NULL DEFAULT 'seed' CHECK (origine IN ('seed','utente'))");
    aggiungiColonna(db, 'luogo', 'nascosto', 'INTEGER NOT NULL DEFAULT 0 CHECK (nascosto IN (0,1))');
    aggiungiColonna(db, 'luogo', 'seed_json', 'TEXT');
    aggiungiColonna(db, 'luogo', 'updated_at', 'TEXT');
    aggiungiColonna(db, 'luogo', 'condizioni_json', 'TEXT');

    const adesso = new Date().toISOString();
    db.prepare('UPDATE luogo SET updated_at = ? WHERE updated_at IS NULL').run(adesso);

    // la regola di presenza dal JSON della guida, solo dove la riga non ne ha già una
    const regole = new Map<string, unknown>();
    if (haTabella(db, 'dati_guida')) {
      const riga = db.prepare("SELECT json FROM dati_guida WHERE chiave = 'sblocco-luoghi'").get() as { json: string } | undefined;
      if (riga) {
        try {
          const dati = JSON.parse(riga.json) as { luoghi?: Array<{ chiave: string; condizioni: unknown }> };
          for (const l of dati.luoghi ?? []) regole.set(l.chiave, l.condizioni);
        } catch { /* trascrizione illeggibile: nessuna regola, non si indovina */ }
      }
    }
    const scriviCondizioni = db.prepare("UPDATE luogo SET condizioni_json = ? WHERE chiave = ? AND (condizioni_json IS NULL OR condizioni_json = '')");
    let conRegola = 0;
    for (const [chiave, condizioni] of regole) {
      const pulite = normalizzaCondizioniSpillo(condizioni);
      if (pulite.length === 0) continue;
      conRegola += scriviCondizioni.run(JSON.stringify(pulite), chiave).changes;
    }
    db.prepare("UPDATE luogo SET condizioni_json = '[]' WHERE condizioni_json IS NULL").run();

    // la fotografia della riga della guida, per il ripristino
    const colonne = (db.prepare('PRAGMA table_info(luogo)').all() as Array<{ name: string }>).map((c) => c.name).filter((c) => !['origine', 'nascosto', 'seed_json', 'updated_at'].includes(c));
    const righe = db.prepare("SELECT * FROM luogo WHERE origine = 'seed' AND seed_json IS NULL").all() as Array<Record<string, unknown>>;
    const scriviSeed = db.prepare('UPDATE luogo SET seed_json = ? WHERE chiave = ?');
    for (const r of righe) scriviSeed.run(JSON.stringify(Object.fromEntries(colonne.map((c) => [c, r[c] ?? null]))), r.chiave);

    logger.info({ luoghi: righe.length, conRegola }, 'migrazione 071: luogo catalogabile');
  },
};
