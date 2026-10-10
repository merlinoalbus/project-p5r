// ============================================================
// 098 — Un pin può appartenere a più voci della guida
// ============================================================
//
// Richiesta dell'utente (2026-10-09): «i pin dei luoghi possono essere agganciati anche a più di un evento area per volta»;
// poi, alla domanda se lo stesso pin deve potersi collegare a più voci della guida, anche di aree diverse, «sì». Scelte
// dell'utente: «Voci indipendenti» (ogni voce si segna da sola; il pin è fatto quando tutte le sue voci sono segnate) e
// «Guida ed editor» (si collega dalla guida e dall'editor delle mappe).
//   - `spillo_voce(spillo_id, voce_chiave)`: il collegamento, molti a molti; tolto il pin o la voce, se ne va anche lui;
//   - i collegamenti di `spillo.voce_chiave` (094) passano qui, solo verso voci che esistono;
//   - `spillo.voce_chiave` esce dallo schema: la tabella si ricostruisce come nella 042 (copia, rimozione, rinomina, indici
//     ricreati), perché SQLite non toglie una colonna con un vincolo di chiave esterna.
// Gli elementi della guida senza mappa (lo strato di prima) restano col riferimento «punto», come dalla 094.
// Gli stati delle partite (`spillo_partita`, `punto_partita`) non cambiano.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** La definizione della colonna aggiunta dalla 094, così come SQLite l'ha scritta nello schema della tabella. */
const COLONNA_VOCE = /,\s*"?voce_chiave"?\s+TEXT\s+REFERENCES\s+punto_interesse\s*\(\s*chiave\s*\)\s+ON\s+DELETE\s+SET\s+NULL/i;

export const migration098: Migration = {
  id: 98,
  name: 'voci_dei_pin',
  up(db) {
    db.exec(`CREATE TABLE IF NOT EXISTS spillo_voce (
      spillo_id   INTEGER NOT NULL REFERENCES spillo(id) ON DELETE CASCADE,
      voce_chiave TEXT NOT NULL REFERENCES punto_interesse(chiave) ON DELETE CASCADE,
      PRIMARY KEY (spillo_id, voce_chiave)
    ) WITHOUT ROWID`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_spillo_voce_voce ON spillo_voce(voce_chiave)');
    const colonne = (db.prepare('PRAGMA table_info(spillo)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('voce_chiave')) return;
    const copiati = db.prepare(`INSERT OR IGNORE INTO spillo_voce (spillo_id, voce_chiave)
      SELECT id, voce_chiave FROM spillo WHERE voce_chiave IS NOT NULL AND voce_chiave IN (SELECT chiave FROM punto_interesse)`).run().changes;
    const schema = (db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'spillo'").get() as { sql: string }).sql;
    if (!COLONNA_VOCE.test(schema)) throw new Error('Migrazione 098: la colonna voce_chiave di spillo non ha la forma attesa; schema non toccato.');
    const nuovo = schema.replace(COLONNA_VOCE, '').replace(/^CREATE TABLE\s+"?spillo"?/i, 'CREATE TABLE spillo_nuovo');
    const indici = (db.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'spillo' AND sql IS NOT NULL").all() as Array<{ name: string; sql: string }>)
      .filter((i) => i.name !== 'idx_spillo_voce');
    const tenute = colonne.filter((c) => c !== 'voce_chiave').map((c) => `"${c}"`).join(', ');
    db.exec(nuovo);
    db.exec(`INSERT INTO spillo_nuovo (${tenute}) SELECT ${tenute} FROM spillo; DROP TABLE spillo; ALTER TABLE spillo_nuovo RENAME TO spillo;`);
    for (const i of indici) db.exec(i.sql);
    logger.info({ copiati }, 'migrazione 098: le voci della guida dei pin stanno in spillo_voce, una o più per pin');
  },
};
