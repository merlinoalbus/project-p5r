// ============================================================
// Utente 044 — `requisito_partita` tolta: le conferme a mano dei requisiti non si leggono più (L11 · R11-01/1, decisione del PM del 24/10)
// ============================================================
//
// `requisito_partita` conteneva le conferme a mano dei requisiti dei Confidenti; dalla R6-01b non si leggono più (nessun `SELECT`, nessun `INSERT`:
// solo tre `DELETE` di pulizia in `requisitiConfidentiService`, tolti insieme alla tabella). GUARDIA: la tabella si toglie solo se è vuota; se ha righe
// la migrazione non fa niente, lo scrive nel log e la tabella resta (le partite sono dati dell'utente: mai si perde una riga). Non scrive in `main`.
// Il registro `FONTI_TOLTE` ha la voce della tabella e `RIFERIMENTI_PARTITE` non la cita più. Idempotente: se la tabella non c'è non fa niente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const utente044: Migration = {
  id: 44,
  name: 'toglie_requisito_partita',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 044: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'requisito_partita'").get()) return;
    const righe = db.prepare('SELECT COUNT(*) FROM utente.requisito_partita').pluck().get() as number;
    if (righe > 0) {
      logger.warn({ migrazione: 'utente-044', righeRequisitoPartita: righe }, 'requisito_partita non vuota: la tabella resta, nessuna modifica');
      return;
    }
    db.exec('DROP TABLE utente.requisito_partita');
    if (db.prepare("SELECT 1 FROM utente.sqlite_master WHERE name = 'requisito_partita'").get()) throw new Error('utente 044: la tabella requisito_partita esiste ancora; nessuna modifica applicata.');
    logger.info({ migrazione: 'utente-044' }, 'requisito_partita tolta (vuota)');
  },
};
