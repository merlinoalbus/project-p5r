// ============================================================
// utente 024 — le tabelle di L4 cadono con la loro partita, come le altre
// ============================================================
//
// `divergenza_partita` (utente 022) e `spillo_partita_infiltrazione` (utente 023) erano nate senza la chiave verso `partita`: eliminando una
// partita le sue righe restavano orfane (difetto trovato da BE nel controllo dell'inventario dei dati, 2026-10-20). Qui si ricostruiscono con
// `partita_id … REFERENCES partita(id) ON DELETE CASCADE`, come `spillo_partita` e le altre tabelle delle partite (utente 002). Le righe si
// copiano tutte e com'erano, tranne quelle di una partita che non c'è più (già orfane). Idempotente: una tabella che ha già la chiave non
// si tocca.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** Le due tabelle, con le colonne e la chiave primaria di prima. */
const TABELLE: ReadonlyArray<{ nome: string; colonne: string; chiave: string; elenco: string }> = [
  { nome: 'divergenza_partita', colonne: 'spillo_uid TEXT NOT NULL, voce_chiave TEXT NOT NULL, rilevata_il TEXT NOT NULL', chiave: 'partita_id, spillo_uid, voce_chiave', elenco: 'partita_id, spillo_uid, voce_chiave, rilevata_il' },
  { nome: 'spillo_partita_infiltrazione', colonne: 'spillo_uid TEXT NOT NULL, infiltrazione_chiave TEXT NOT NULL, raccolto INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL', chiave: 'partita_id, spillo_uid, infiltrazione_chiave', elenco: 'partita_id, spillo_uid, infiltrazione_chiave, raccolto, updated_at' },
];

export const utente024: Migration = {
  id: 24,
  name: 'cascata_delle_tabelle_di_l4',
  up(db) {
    const esito: Record<string, { righe: number; orfaneTolte: number }> = {};
    for (const t of TABELLE) {
      if (!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = ?").get(t.nome)) continue;
      const chiavi = db.prepare(`PRAGMA utente.foreign_key_list(${t.nome})`).all() as Array<{ table: string }>;
      if (chiavi.some((k) => k.table === 'partita')) continue;
      db.exec(`CREATE TABLE utente.${t.nome}_nuova (
        partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
        ${t.colonne},
        PRIMARY KEY (${t.chiave})
      )`);
      const prima = db.prepare(`SELECT COUNT(*) FROM utente.${t.nome}`).pluck().get() as number;
      const copiate = db.prepare(`INSERT INTO utente.${t.nome}_nuova (${t.elenco}) SELECT ${t.elenco} FROM utente.${t.nome} WHERE partita_id IN (SELECT id FROM utente.partita)`).run().changes;
      db.exec(`DROP TABLE utente.${t.nome}`);
      db.exec(`ALTER TABLE utente.${t.nome}_nuova RENAME TO ${t.nome}`);
      esito[t.nome] = { righe: copiate, orfaneTolte: prima - copiate };
    }
    logger.info({ esito }, 'migrazione utente 024: divergenze e stato per infiltrazione con la cascata sulla partita');
  },
};
