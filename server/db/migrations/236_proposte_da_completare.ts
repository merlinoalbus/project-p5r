// ============================================================
// Migrazione 236 — proposte «da completare» sulle voci del Diario (L13, ondata 4a)
// ============================================================
//
// Una tabella di gioco dedicata alle proposte di conversione di una voce (collegamento, tipo, effetti da aggiungere e da togliere, certezza,
// motivo): vedi `shared/proposteConversione.ts`. Questa migrazione crea SOLO il meccanismo, vuoto: le proposte reali le carica la sottofase
// 4b con le sue migrazioni (una riga per proposta, `INSERT`), dopo l'approvazione dell'utente.
//
// Il contenuto di una proposta non cambia mai dopo l'inserimento (append-only, garantito dai trigger): la decisione cambia soltanto
// `stato` (da «aperta» ad «applicata» o «scartata», mai indietro), `decisa_il` e `esito_json` (che cosa è stato scritto). Una proposta
// sbagliata non si corregge: se ne inserisce un'altra e si scarta la prima. La voce eliminata si porta via le sue proposte (cascata, e il
// cestino le conserva con la voce). La vecchia `proposta_effetto_voce` (migrazione 136) resta com'è: ha solo i 20 candidati Aojiru, già
// decisi, e un formato di un solo effetto senza collegamento.
//
// Idempotente: `IF NOT EXISTS` su tabella, indice e trigger.
// ============================================================

import type { Migration } from '../migrationRunner.js';

export const migration236: Migration = {
  id: 236,
  name: 'proposte_da_completare',
  up(db) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS main.proposta_conversione_voce (
        id                  TEXT PRIMARY KEY CHECK (length(id) BETWEEN 1 AND 120),
        voce_uid            TEXT NOT NULL REFERENCES voce_giornata(uid) ON DELETE CASCADE,
        lotto               TEXT NOT NULL DEFAULT '',
        tipo_proposto       TEXT,
        riferimento_tipo    TEXT,
        riferimento_chiave  TEXT,
        effetti_json        TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(effetti_json) AND json_type(effetti_json) = 'array'),
        togli_json          TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(togli_json) AND json_type(togli_json) = 'array'),
        motivo              TEXT NOT NULL CHECK (length(trim(motivo)) > 0),
        certezza            TEXT NOT NULL CHECK (certezza IN ('certa','probabile','da-verificare')),
        stato               TEXT NOT NULL DEFAULT 'aperta' CHECK (stato IN ('aperta','applicata','scartata')),
        esito_json          TEXT CHECK (esito_json IS NULL OR json_valid(esito_json)),
        creata_il           TEXT NOT NULL,
        decisa_il           TEXT,
        CHECK ((riferimento_tipo IS NULL) = (riferimento_chiave IS NULL)),
        CHECK ((stato = 'aperta') = (decisa_il IS NULL))
      );
      CREATE INDEX IF NOT EXISTS main.proposta_conversione_voce_per_voce ON proposta_conversione_voce (voce_uid, stato);
      CREATE TRIGGER IF NOT EXISTS main.proposta_conversione_voce_contenuto_fisso
        BEFORE UPDATE OF id, voce_uid, lotto, tipo_proposto, riferimento_tipo, riferimento_chiave, effetti_json, togli_json, motivo, certezza, creata_il ON proposta_conversione_voce
        BEGIN SELECT RAISE(ABORT, 'proposta_conversione_voce: il contenuto di una proposta non si modifica (se ne inserisce una nuova)'); END;
      CREATE TRIGGER IF NOT EXISTS main.proposta_conversione_voce_decisione_una
        BEFORE UPDATE OF stato ON proposta_conversione_voce WHEN OLD.stato <> 'aperta'
        BEGIN SELECT RAISE(ABORT, 'proposta_conversione_voce: una proposta decisa non si riapre'); END;
    `);
  },
};
