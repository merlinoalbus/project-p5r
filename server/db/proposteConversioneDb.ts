// ============================================================
// Svuotamento delle proposte «da completare» sulla COPIA DI LAVORO dell'edizione (L13, ondata 4a)
// ============================================================
//
// La tabella `proposta_conversione_voce` è append-only (migrazione 237: una riga non si cancella se non insieme alla sua voce). L'edizione
// di rilascio però esce senza proposte: sulla sua copia di lavoro toglie il trigger che vieta la cancellazione, svuota la tabella e rimette
// il trigger, nella stessa transazione. Non va chiamata su una connessione dei dati dell'istanza: l'unico chiamante è `edizioneService`.
// ============================================================

import type Database from 'better-sqlite3';
import { TRIGGER_NON_SI_CANCELLA } from './migrations/237_proposte_da_completare_append_only.js';

/** Cancella tutte le proposte e restituisce quante erano. Solo su una copia di lavoro. */
export function svuotaProposteConversione(db: Database.Database): number {
  return db.transaction(() => {
    db.exec('DROP TRIGGER IF EXISTS main.proposta_conversione_voce_non_si_cancella');
    const cancellate = db.prepare('DELETE FROM main.proposta_conversione_voce').run().changes;
    db.exec(TRIGGER_NON_SI_CANCELLA);
    return cancellate;
  })();
}
