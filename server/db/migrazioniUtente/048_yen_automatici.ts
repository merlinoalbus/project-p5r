// ============================================================
// Utente 048 — il registro degli yen che si muovono da soli (L13, decisione 18)
// ============================================================
//
// Decisione 18 dell'utente (2026-10-25): «gli yen possono anche scendere da soli (senza mai andare sotto zero) ma devono restare cmq
// possibili le azioni anche se il denaro disponibile non basta o è a 0», e i guadagni legati a voci ed eventi (paga dei lavori, yen delle
// Richieste, effetto «Yen ricevuti») entrano da soli; restano manuali i soldi dei combattimenti e delle vendite nei Palazzi e nei Memento.
//
// `yen_automatico`: una riga per ogni movimento che l'app fa da sola sul saldo della partita (`partita.yen`), con la sua causa (l'effetto di
// una voce, un turno, una Richiesta completata, un regalo comprato), l'importo chiesto e quello DAVVERO mosso (il saldo non scende sotto
// zero né sale oltre il tetto: saldo 300 e spesa 500 → scalati 300). Togliendo la causa la riga si chiude con il suo inverso, anch'esso
// registrato com'è stato davvero (restituisce solo ciò che era stato scalato; toglie un guadagno al più fino a zero). Una causa ha al più
// una riga aperta (indice unico parziale). Le righe chiuse restano: sono la storia del saldo.
//
// Append-only, idempotente (IF NOT EXISTS), solo schema «utente»: nessuna riga esistente cambia, nessun saldo si riscrive, nessuna proposta
// «Applica» già aperta o già applicata si tocca (restano decidibili come prima).
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente048: Migration = {
  id: 48,
  name: 'yen_automatici',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 048: manca la transazione della migrazione; nessuna modifica applicata.');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.yen_automatico (
      id TEXT PRIMARY KEY CHECK (length(id) = 32),
      partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      causa_tipo TEXT NOT NULL CHECK (causa_tipo IN ('voce', 'turno', 'richiesta', 'regalo')),
      causa_chiave TEXT NOT NULL CHECK (length(causa_chiave) BETWEEN 1 AND 400),
      voce_uid TEXT,
      motivo TEXT NOT NULL,
      richiesto INTEGER NOT NULL CHECK (richiesto <> 0),
      prima INTEGER NOT NULL CHECK (prima >= 0),
      applicato INTEGER NOT NULL,
      dopo INTEGER NOT NULL CHECK (dopo >= 0),
      creato_il TEXT NOT NULL,
      annullato_il TEXT,
      annullo_motivo TEXT,
      annullo_prima INTEGER,
      annullo_applicato INTEGER,
      annullo_dopo INTEGER,
      CHECK (dopo = prima + applicato),
      CHECK ((annullato_il IS NULL AND annullo_motivo IS NULL AND annullo_prima IS NULL AND annullo_applicato IS NULL AND annullo_dopo IS NULL)
        OR (annullato_il IS NOT NULL AND annullo_motivo IS NOT NULL AND annullo_prima >= 0 AND annullo_dopo >= 0 AND annullo_dopo = annullo_prima + annullo_applicato))
    )`);
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS utente.yen_automatico_attivo ON yen_automatico(partita_id, causa_tipo, causa_chiave) WHERE annullato_il IS NULL');
    db.exec('CREATE INDEX IF NOT EXISTS utente.yen_automatico_voce ON yen_automatico(partita_id, voce_uid)');
  },
};
