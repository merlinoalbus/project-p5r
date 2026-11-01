// ============================================================
// Migrazione 334 — due indici di lettura: registro delle operazioni sugli effetti e destinazioni dei pin
// ============================================================
//
// Voce di piano L5-01 (prestazioni lato server). Due tabelle di gioco si leggevano per intero ad ogni richiesta (EXPLAIN QUERY PLAN: SCAN):
//   - `operazione_effetti_voce` (registro delle operazioni sugli effetti, `yenAutomaticiService.effettiAggiuntiDopo`): ricerca per
//     `voce_uid` e `creata_il >= ?`, in ordine di `creata_il`;
//   - `spillo_destinazione` (`mappeService.arriviVerso`): la sottoquery `WHERE mappa_chiave = ?` a ogni apertura di mappa.
// Si aggiungono solo gli indici: nessuna riga si legge, si scrive o si toglie, e le risposte non cambiano (stessi dati, stesso ordine
// dato dalla stessa ORDER BY). Idempotente (`IF NOT EXISTS`) e dentro la transazione della migrazione; una tabella assente (schema di
// prima, nei test che caricano il seed a scaglioni) non è un errore: niente da fare. Le ricevute degli effetti applicati (file delle
// partite) restano con l'indice per partita: sulla copia `effetto_applicato` ha 0 righe, e la misura non giustifica un indice completo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';

/** Gli indici: nome, tabella, colonne (la tabella e le colonne devono esserci). */
const INDICI = [
  { nome: 'idx_operazione_effetti_voce_voce', tabella: 'operazione_effetti_voce', colonne: ['voce_uid', 'creata_il'] },
  { nome: 'idx_spillo_destinazione_mappa', tabella: 'spillo_destinazione', colonne: ['mappa_chiave'] },
] as const;

export const migration334: Migration = {
  id: 334,
  name: 'indici_registro_effetti_e_destinazioni',
  up(db) {
    if (!db.inTransaction) throw new Error('334: manca la transazione della migrazione; nessuna modifica applicata.');
    for (const i of INDICI) {
      if (!esisteTabella(db, i.tabella) || !i.colonne.every((c) => haColonna(db, i.tabella, c))) {
        logger.warn({ migrazione: 334, tabella: i.tabella }, 'tabella o colonne assenti: indice non creato');
        continue;
      }
      db.exec(`CREATE INDEX IF NOT EXISTS main.${i.nome} ON ${i.tabella} (${i.colonne.join(', ')})`);
    }
  },
};
