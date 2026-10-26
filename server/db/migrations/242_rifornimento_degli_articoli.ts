// ============================================================
// Migrazione 242 — la regola di rifornimento degli articoli (Ondata 5, Lotto A; decisione 21 dell'utente)
// ============================================================
//
// Decisione 21 (26 ottobre): «rigenerazione per tutte le categorie», con la regola della guida articolo per articolo e, dove la guida tace,
// la regola dell'utente (il segno «comprato» vale fino al cambio di giornata). Il dato vive in un punto solo, sull'articolo: la quantità per
// ciclo è la colonna che c'è già (`articolo.quantita`), la regola è la colonna nuova `rifornimento_json` (`shared/rifornimento.ts`:
// `{ tipo, giorno?, giorni?, origine, daVerificare? }`). Il ciclo si calcola in lettura (`scorteService`), mai al cambio di giornata.
//
// Solo schema: la colonna nasce vuota (null = nessuna regola, come oggi) su ogni articolo; le regole le scrive la 243. Append-only,
// idempotente (la colonna si aggiunge solo se manca), nessun valore esistente cambia. Audit in `dati_guida.audit-242-rifornimento`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const AUDIT = 'audit-242-rifornimento';

export const migration242: Migration = {
  id: 242,
  name: 'rifornimento_degli_articoli',
  up(db) {
    if (!db.inTransaction) throw new Error('242: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 242 }, 'tabella articolo assente: colonna del rifornimento non aggiunta'); return; }
    const colonne = (db.prepare('PRAGMA main.table_info(articolo)').all() as Array<{ name: string }>).map((c) => c.name);
    const aggiunta = !colonne.includes('rifornimento_json');
    if (aggiunta) db.exec('ALTER TABLE main.articolo ADD COLUMN rifornimento_json TEXT');
    const conRegola = db.prepare('SELECT COUNT(*) FROM main.articolo WHERE rifornimento_json IS NOT NULL').pluck().get() as number;
    if (aggiunta && conRegola !== 0) throw new Error('242: la colonna nuova non è vuota; nessuna modifica applicata.');
    if (esisteTabella(db, 'dati_guida')) {
      const esecuzione = { il: new Date().toISOString(), colonnaAggiunta: aggiunta, articoli: db.prepare('SELECT COUNT(*) FROM main.articolo').pluck().get(), conRegola };
      const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
      const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
      db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
        .run(AUDIT, JSON.stringify({ migrazione: 242, decisione: 'L13-21', esecuzioni: [...esecuzioni, esecuzione] }));
    }
    logger.info({ migrazione: 242, colonnaAggiunta: aggiunta }, 'Articoli: colonna della regola di rifornimento');
  },
};
