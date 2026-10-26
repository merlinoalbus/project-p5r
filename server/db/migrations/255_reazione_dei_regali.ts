// ============================================================
// Migrazione 255 — la reazione dei regali e i Confidenti a cui si regala: le due colonne (ondata 5, lotto D: RG-08, RG-11)
// ============================================================
//
// Decisione 21 (c) dell'utente (26/10/2026): «reazione dei regali strutturata con i punti attuali finché non verificati in gioco». Fino a
// qui la reazione del Confidente stava soltanto nel testo `confidente_regalo.effetto` («+3», «+2 punti affinità», «+forte», «+normale», con
// commenti in prosa): la guida italiana la dà come colonna «Bonus affinità» con tre valori, +3, +2 e +1 (RG-08). E l'app non sapeva a chi si
// può regalare: il pulsante di ripiego «Regalo» compariva anche per Mishima e Yoshida (RG-11), che la guida esclude.
//
// Solo schema (i dati li scrive la 256):
//   - `confidente_regalo.reazione` (1, 2 o 3; null = non ancora convertita): il valore della guida, l'unico punto da cui si legge la reazione;
//   - `confidente.regalabile` (0/1, 0 di partenza): il Confidente riceve regali.
// Append-only e idempotente: le colonne si aggiungono solo se mancano, nessun valore esistente cambia. Audit in `dati_guida.audit-255-reazione`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { haColonna, scriviAuditRegali } from './regaliOndata5.js';

const AUDIT = 'audit-255-reazione';

export const migration255: Migration = {
  id: 255,
  name: 'reazione_dei_regali',
  up(db) {
    if (!db.inTransaction) throw new Error('255: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const t of ['confidente', 'confidente_regalo', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 255, tabella: t }, 'tabella assente: colonne dei regali non aggiunte'); return; }
    }
    const reazioneAggiunta = !haColonna(db, 'confidente_regalo', 'reazione');
    if (reazioneAggiunta) db.exec('ALTER TABLE main.confidente_regalo ADD COLUMN reazione INTEGER CHECK (reazione IS NULL OR reazione IN (1, 2, 3))');
    const regalabileAggiunta = !haColonna(db, 'confidente', 'regalabile');
    if (regalabileAggiunta) db.exec('ALTER TABLE main.confidente ADD COLUMN regalabile INTEGER NOT NULL DEFAULT 0 CHECK (regalabile IN (0, 1))');
    // la colonna nuova nasce vuota: se non lo fosse, qualcosa l'ha già scritta senza questa migrazione
    if (reazioneAggiunta && (db.prepare('SELECT COUNT(*) FROM main.confidente_regalo WHERE reazione IS NOT NULL').pluck().get() as number) !== 0) throw new Error('255: la colonna nuova non è vuota; nessuna modifica applicata.');
    const conteggi = {
      reazioneAggiunta, regalabileAggiunta,
      righe: db.prepare('SELECT COUNT(*) FROM main.confidente_regalo').pluck().get() as number,
      confidenti: db.prepare('SELECT COUNT(*) FROM main.confidente').pluck().get() as number,
    };
    scriviAuditRegali(db, AUDIT, 255, { conteggi });
    logger.info({ migrazione: 255, ...conteggi }, 'Regali: colonne della reazione e dei Confidenti che ricevono regali');
  },
};
