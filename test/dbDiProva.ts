// ============================================================
// dbDiProva — il database dei test del backend: in memoria, con il pacchetto iniziale caricato e migrato
// ============================================================
//
// Lo stesso blocco («initDb(':memory:')», «caricaPacchetto(db)», spesso con un «invalidaCacheTraduzioni()» che caricaPacchetto
// fa già, perché invalida tutte le cache di gioco registrate) era copiato in un centinaio di file di test (rilievo T2 della
// verifica completa, 2026-10-04). Per un test che vuole un file su disco, o lo schema fermo a una migrazione, restano
// `initDb` e `caricaPacchetto` a mano.
// ============================================================

import { initDb, type AppDatabase } from '../server/db/dbService.js';
import { caricaPacchetto } from '../server/services/pacchetto/pacchettoGioco.js';

/** Apre un database di gioco in memoria (con `partite.db` in memoria accanto) e ci carica il pacchetto iniziale. */
export function dbDiProva(): AppDatabase {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  return db;
}
