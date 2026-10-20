// ============================================================
// 116 — via la frase fissa «Pin nativo del gioco.» dalle descrizioni dei pin (ordine dell'utente, 2026-10-20)
// ============================================================
//
// L'utente: «puoi rimuovere la scritta "Pin nativo del gioco" e sbiancare il valore». La frase non dice niente a chi gioca, e con L5 sarebbe
// diventata la «nota del pin» dei pin di luogo. Si svuota il valore **solo dove il campo è esattamente quella frase** (decisione del PM): le
// descrizioni che la contengono insieme ad altro testo restano come sono. La frase sta solo in `spillo.descrizione`. Non nasce dal codice
// dell'app: arriva dai dati (il pacchetto di gioco), quindi la stessa regola gira anche fra le regole di ogni avvio e dopo ogni caricamento
// del pacchetto (`regoleAllAvvio`), così un pacchetto di prima non la riporta. Idempotente.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

/** La frase fissa da togliere, esattamente com'è scritta nei dati. */
export const FRASE_PIN_NATIVO = 'Pin nativo del gioco.';

/** Svuota le descrizioni dei pin che sono esattamente la frase fissa; restituisce quante righe ha toccato. */
export function svuotaFrasePinNativo(db: AppDatabase): number {
  if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'spillo'").get()) return 0;
  return db.prepare("UPDATE spillo SET descrizione = '' WHERE descrizione = ?").run(FRASE_PIN_NATIVO).changes;
}

export const migration116: Migration = {
  id: 116,
  name: 'frase_pin_nativo',
  up(db) {
    const toccate = svuotaFrasePinNativo(db);
    logger.info({ toccate }, 'migrazione 116: tolta la frase fissa «Pin nativo del gioco.» dalle descrizioni dei pin');
  },
};
