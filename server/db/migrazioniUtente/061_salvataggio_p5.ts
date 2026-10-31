// ============================================================
// Utente 061 — il salvataggio di Persona 5, impostazione della partita
// ============================================================
//
// Richiesta dell'utente: «Al Leblanc, esaminare lo Scaffale con lo scatolone in mansarda per riscattare i contenuti aggiuntivi e le ricompense da
// salvataggio di Persona 5»: le impostazioni di partita «Salvataggio di P5» e «Pacchetti DLC posseduti», e gli effetti della voce con la
// condizione. I contenuti scaricabili posseduti ci sono già (`partita.dlc_posseduti_json`, migrazione utente 001, letti dalla Fusione): un dato
// solo, che ora leggono anche le condizioni `dlc-posseduto`. Manca il salvataggio: una colonna nuova, `partita.salvataggio_p5` (0/1, 0 di
// partenza), letta dalla condizione `salvataggio-p5` (`semaforiService.contenutiDellaPartita`) e scritta solo dalla finestra «Modifica» della
// partita (`partiteService.aggiornaPartita`). Le righe esistenti valgono 0 dal valore predefinito, senza riscritture: nessuna partita cambia.
// Idempotente (la colonna si aggiunge solo se manca), dentro la transazione della migrazione. Nessun audit: nessuna riga si tocca.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente061: Migration = {
  id: 61,
  name: 'salvataggio_p5',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 061: manca la transazione della migrazione; nessuna modifica applicata.');
    const colonne = (db.prepare('PRAGMA utente.table_info(partita)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('salvataggio_p5')) db.exec('ALTER TABLE utente.partita ADD COLUMN salvataggio_p5 INTEGER NOT NULL DEFAULT 0 CHECK (salvataggio_p5 IN (0, 1))');
  },
};
