// ============================================================
// 119 — i requisiti dei Confidenti come li dà la guida, per «Ripristina» (L6 «Condizioni uniche», lotti/L6/modifiche.md §6.1)
// ============================================================
//
// Da L6 i requisiti dei Confidenti si modificano dalla pagina del Confidente, un rango per riga, con «Ripristina» al valore della guida.
// `confidente_requisito` non ha una copia della guida (`seed_json`): qui se ne fa una, `confidente_requisito_guida`, con le righe di adesso,
// cioè quelle della guida corrette dalla 118 (Richieste per chiave, Tae 04-18, Ohya 07-05). Nessuna riga esistente cambia. Idempotente:
// la copia si fa una volta sola (tabella vuota).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const migration119: Migration = {
  id: 119,
  name: 'requisiti_della_guida',
  up(db) {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'confidente_requisito'").get()) return;
    db.exec(`CREATE TABLE IF NOT EXISTS confidente_requisito_guida (
      confidente_chiave TEXT NOT NULL,
      rango             INTEGER NOT NULL,
      indice            INTEGER NOT NULL,
      tipo              TEXT NOT NULL,
      dati_json         TEXT NOT NULL,
      testo             TEXT NOT NULL,
      PRIMARY KEY (confidente_chiave, rango, indice)
    )`);
    if ((db.prepare('SELECT COUNT(*) AS n FROM confidente_requisito_guida').get() as { n: number }).n > 0) return;
    const copiate = db.prepare(`INSERT INTO confidente_requisito_guida (confidente_chiave, rango, indice, tipo, dati_json, testo)
      SELECT confidente_chiave, rango, indice, tipo, dati_json, testo FROM confidente_requisito`).run().changes;
    logger.info({ copiate }, '[migration119] requisiti della guida copiati');
  },
};
