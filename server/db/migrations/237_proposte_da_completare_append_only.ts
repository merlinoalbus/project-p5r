// ============================================================
// Migrazione 237 — le proposte «da completare» diventano davvero append-only (L13, ondata 4a, correzioni dopo la verifica)
// ============================================================
//
// La 236 vietava già di cambiare il contenuto di una proposta e di riaprirne una decisa, ma `esito_json` e `decisa_il` si potevano ancora
// riscrivere su una proposta già decisa e la riga si poteva cancellare. Qui i due buchi si chiudono con due trigger:
//
//   - `proposta_conversione_voce_decisione_fissa`: su una proposta già decisa (`stato` ≠ 'aperta') `esito_json` e `decisa_il` non cambiano più.
//     (La decisione di una proposta aperta continua a scrivere stato, data ed esito in un solo `UPDATE`: il trigger non scatta perché `OLD.stato = 'aperta'`.)
//   - `proposta_conversione_voce_non_si_cancella`: la riga non si cancella MAI direttamente. Resta ammessa solo la cancellazione in cascata dalla voce
//     (`ON DELETE CASCADE`: nel momento in cui scatta, la voce è già sparita e il cestino ha già la fotografia della riga) e lo svuotamento della
//     copia di lavoro dell'edizione, che passa dalla funzione `svuotaProposteConversione` (`server/db/proposteConversioneDb.ts`): toglie il
//     trigger, cancella e lo rimette, tutto nella stessa transazione e SOLO sulla copia, mai sui dati dell'istanza.
//
// Il testo del trigger di cancellazione sta in `TRIGGER_NON_SI_CANCELLA`, condiviso con la funzione dell'edizione. Idempotente: `IF NOT EXISTS`.
// ============================================================

import type { Migration } from '../migrationRunner.js';

/** Il trigger che vieta la cancellazione diretta (la funzione dell'edizione lo toglie e lo rimette con questo stesso testo). */
export const TRIGGER_NON_SI_CANCELLA = `
  CREATE TRIGGER IF NOT EXISTS main.proposta_conversione_voce_non_si_cancella
    BEFORE DELETE ON proposta_conversione_voce
    WHEN EXISTS (SELECT 1 FROM voce_giornata WHERE uid = OLD.voce_uid)
    BEGIN SELECT RAISE(ABORT, 'proposta_conversione_voce: una proposta non si cancella (si cancella solo insieme alla sua voce)'); END;
`;

export const TRIGGER_DECISIONE_FISSA = `
  CREATE TRIGGER IF NOT EXISTS main.proposta_conversione_voce_decisione_fissa
    BEFORE UPDATE OF esito_json, decisa_il ON proposta_conversione_voce WHEN OLD.stato <> 'aperta'
    BEGIN SELECT RAISE(ABORT, 'proposta_conversione_voce: la decisione di una proposta già decisa non si modifica'); END;
`;

export const migration237: Migration = {
  id: 237,
  name: 'proposte_da_completare_append_only',
  up(db) {
    db.exec(TRIGGER_DECISIONE_FISSA);
    db.exec(TRIGGER_NON_SI_CANCELLA);
  },
};
