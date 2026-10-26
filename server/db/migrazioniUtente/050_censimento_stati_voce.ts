// ============================================================
// Utente 050 — il censimento degli effetti di stato mai applicati (L13, decisione 19)
// ============================================================
//
// Decisione 19 dell'utente (2026-10-26, risposte «Subito al salvataggio» e «Elenco da approvare»): gli effetti di stato salvati su una voce già
// spuntata si applicano subito; per le voci spuntate in passato con effetti mai applicati (aggiunti alla voce quando il salvataggio li ignorava:
// «al momento non viene aggiornato il Compendio Personale») si prepara un elenco voce per voce di ciò che manca in ogni partita, e si applica
// solo ciò che l'utente approva.
//
// L'elenco sono le proposte «da applicare» della partita (`utente.da_applicare`, tipo `effetto-voce`, `dati.passato`), scritte dal censimento
// (`statiMancantiService.proponiStatiMancanti`, a ogni avvio e dopo l'importazione di un gioco.db): mai applicate da sole. Questa tabella è il
// suo registro: per ogni coppia partita/voce/effetto l'ultimo esito del censimento (`proposta`: entrato nell'elenco; `gia-presente`: lo stato era
// già vero nella partita, niente da proporre) e quando è stato rilevato. Il «già vero» è una decisione presa una volta sola: il censimento
// non ripropone più quella coppia (con lo stesso tipo e la stessa chiave), anche se lo stato cambia dopo nella partita.
//
// Solo schema, append-only, idempotente (IF NOT EXISTS): nessuna riga esistente cambia. Essendo nuova, al primo avvio la copia di sicurezza
// automatica (`runBootBackup`) salva partite.db prima del primo censimento.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const utente050: Migration = {
  id: 50,
  name: 'censimento_stati_voce',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 050: manca la transazione della migrazione; nessuna modifica applicata.');
    db.exec(`CREATE TABLE IF NOT EXISTS utente.censimento_stato_voce (
      partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      voce_uid TEXT NOT NULL CHECK (length(voce_uid) BETWEEN 1 AND 64),
      effetto_uid TEXT NOT NULL CHECK (length(effetto_uid) BETWEEN 1 AND 64),
      tipo TEXT NOT NULL CHECK (length(tipo) BETWEEN 1 AND 40),
      chiave TEXT,
      esito TEXT NOT NULL CHECK (esito IN ('proposta', 'gia-presente')),
      rilevato_il TEXT NOT NULL,
      PRIMARY KEY (partita_id, voce_uid, effetto_uid)
    )`);
  },
};
