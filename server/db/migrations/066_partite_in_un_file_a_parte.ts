// ============================================================
// 066 — le partite escono dal file dei dati di gioco
// ============================================================
//
// Decisione dell'utente (2026-09-12): «il file del DB viene manutenuto con import ed export. I
// dati utente delle partite vanno gestiti separatamente (non devono essere influenzati dal DB così
// che se io devo fare replace del DB non perdo l'avanzamento)». Da qui in poi `gioco.db` porta
// compendio, guida, catalogo e mappe; `partite.db` (schema `utente`, attaccato da `initDb`) porta
// le 32 tabelle delle partite.
//
// Questa migrazione, su un'istanza nata dal file unico, crea le tabelle nel file delle partite
// (stessa DDL di `schemaUtente.ts`, senza i vincoli verso le tabelle di gioco che ora stanno in un
// altro file), copia tutte le righe conservando gli id, cancella le tabelle dal file di gioco e
// segna il file delle partite alla sua versione 1. Su un `gioco.db` senza tabelle di partita (un
// pacchetto) non c'è nulla da spostare.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { DDL_UTENTE, TABELLE_UTENTE } from '../schemaUtente.js';
import { assegnaUidMancanti } from '../../services/mappe/identitaSpillo.js';
import { logger } from '../../utils/logger.js';

export const migration066: Migration = {
  id: 66,
  name: 'partite_in_un_file_a_parte',
  up(db) {
    const inMain = new Set((db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
    const inUtente = new Set((db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table'").all() as Array<{ name: string }>).map((r) => r.name));
    for (const sql of DDL_UTENTE) db.exec(sql);
    // Le tabelle si copiano in ordine di dipendenza: prima `partita`, poi le altre (i vincoli sono
    // spenti durante la migrazione, ma l'ordine rende leggibile un eventuale errore).
    const ordinate = ['partita', ...TABELLE_UTENTE.filter((t) => t !== 'partita' && t !== 'persona_posseduta_skill' && t !== 'persona_posseduta'), 'persona_posseduta', 'persona_posseduta_skill'];
    let righe = 0;
    for (const tabella of ordinate) {
      if (!inMain.has(tabella)) continue;
      const colonne = (db.prepare(`PRAGMA main.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name);
      const colonneUtente = new Set((db.prepare(`PRAGMA utente.table_info(${tabella})`).all() as Array<{ name: string }>).map((c) => c.name));
      const comuni = colonne.filter((c) => colonneUtente.has(c));
      if (!inUtente.has(tabella) || (db.prepare(`SELECT COUNT(*) AS n FROM utente.${tabella}`).get() as { n: number }).n === 0) {
        if (tabella === 'spillo_partita' && colonneUtente.has('spillo_uid') && colonne.includes('spillo_id')) {
          // il file delle partite è già alla forma per uid (migrazione «utente» 002): si traduce l'id con il file di gioco
          // se il file di gioco non ha ancora gli uid (067), li assegna qui: la 067 è idempotente e non li rifà
          if (inMain.has('spillo') && !(db.prepare('PRAGMA main.table_info(spillo)').all() as Array<{ name: string }>).some((c) => c.name === 'uid')) {
            db.exec('ALTER TABLE main.spillo ADD COLUMN uid TEXT');
            assegnaUidMancanti(db);
          }
          if (inMain.has('spillo')) righe += db.prepare(`INSERT OR IGNORE INTO utente.spillo_partita (partita_id, spillo_uid, raccolto, updated_at)
            SELECT p.partita_id, s.uid, p.raccolto, p.updated_at FROM main.spillo_partita p JOIN main.spillo s ON s.id = p.spillo_id`).run().changes;
        } else {
          const elenco = comuni.map((c) => `"${c}"`).join(', ');
          righe += db.prepare(`INSERT INTO utente.${tabella} (${elenco}) SELECT ${elenco} FROM main.${tabella}`).run().changes;
        }
      } else {
        // il file delle partite ha già le sue righe: quelle rimaste nel file di gioco non si copiano, ma non spariscono in silenzio
        const scartate = (db.prepare(`SELECT COUNT(*) AS n FROM main.${tabella}`).get() as { n: number }).n;
        if (scartate > 0) logger.warn({ tabella, righe: scartate }, 'migrazione 066: il file delle partite è già popolato, le righe rimaste nel file di gioco vengono scartate');
      }
      db.exec(`DROP TABLE main.${tabella}`);
    }
    if ((righe > 0 || inMain.has('partita')) && (db.pragma('utente.user_version', { simple: true }) as number) < 1) {
      // le partite sono nel loro file, alla prima versione del loro schema (mai indietro: il file può essere già oltre)
      db.pragma('utente.user_version = 1');
    }
  },
};
