// ============================================================
// Svuotamento delle proposte «da completare» sulla COPIA DI LAVORO dell'edizione (L13, ondata 4a)
// ============================================================
//
// La tabella `proposta_conversione_voce` è append-only: il trigger `proposta_conversione_voce_non_si_cancella` vieta di cancellare una
// riga se non insieme alla sua voce (`ON DELETE CASCADE`: quando scatta, la voce è già sparita). L'edizione di rilascio però esce senza
// proposte: sulla sua copia di lavoro toglie il trigger, svuota la tabella e lo rimette con lo stesso testo, nella stessa transazione.
// Non va chiamata su una connessione dei dati dell'istanza: l'unico chiamante è `edizioneService`.
// ============================================================

import type Database from 'better-sqlite3';

/** Il trigger che vieta la cancellazione diretta di una proposta, con il testo che ha nei dati di gioco. */
export const TRIGGER_NON_SI_CANCELLA = `
  CREATE TRIGGER IF NOT EXISTS main.proposta_conversione_voce_non_si_cancella
    BEFORE DELETE ON proposta_conversione_voce
    WHEN EXISTS (SELECT 1 FROM voce_giornata WHERE uid = OLD.voce_uid)
    BEGIN SELECT RAISE(ABORT, 'proposta_conversione_voce: una proposta non si cancella (si cancella solo insieme alla sua voce)'); END;
`;

/** Cancella tutte le proposte e restituisce quante erano. Solo su una copia di lavoro. */
export function svuotaProposteConversione(db: Database.Database): number {
  return db.transaction(() => {
    db.exec('DROP TRIGGER IF EXISTS main.proposta_conversione_voce_non_si_cancella');
    const cancellate = db.prepare('DELETE FROM main.proposta_conversione_voce').run().changes;
    db.exec(TRIGGER_NON_SI_CANCELLA);
    return cancellate;
  })();
}
