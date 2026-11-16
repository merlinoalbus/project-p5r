// ============================================================
// dbDiProva — il database dei test del backend: in memoria, con il pacchetto iniziale caricato
// ============================================================
//
// Lo stesso blocco («initDb(':memory:')», «caricaPacchetto(db)», spesso con un «invalidaCacheTraduzioni()» che caricaPacchetto
// fa già, perché invalida tutte le cache di gioco registrate) era copiato in un centinaio di file di test (rilievo T2 della
// verifica completa, 2026-10-04). Per un test che vuole un file su disco restano `initDb` e `caricaPacchetto` a mano.
// ============================================================

import { initDb, type AppDatabase } from '../server/db/dbService.js';
import { caricaPacchetto } from '../server/services/pacchetto/pacchettoGioco.js';
import { invalidaCacheDiGioco } from '../server/services/cacheDiGioco.js';

/** Apre un database di gioco in memoria (con `partite.db` in memoria accanto) e ci carica il pacchetto iniziale. */
export function dbDiProva(): AppDatabase {
  const db = initDb(':memory:');
  caricaPacchetto(db);
  return db;
}

/**
 * Come `dbDiProva`, ma con l'atlante vuoto: nessuna mappa e nessuno spillo (anche quelli della guida senza mappa), e con loro se
 * ne vanno (chiavi esterne) schermate, destinazioni, voci dei pin, percorsi, alias, presentazioni, pezzi e atterraggi. Per i test che
 * caricano un loro piccolo atlante e contano o confrontano tutte le righe di `mappa` e `spillo`: con le mappe della guida accanto
 * non proverebbero la stessa cosa.
 */
export function dbDiProvaSenzaMappe(): AppDatabase {
  const db = dbDiProva();
  db.prepare('DELETE FROM spillo').run();
  db.prepare('DELETE FROM mappa').run();
  invalidaCacheDiGioco();
  return db;
}
