import type { Migration } from '../migrationRunner.js';

/** Solo strutture vuote: nessuna presenza o spunta storica diventa una consumazione. */
export const utente028: Migration = {
  id: 28, name: 'acquisti_e_proposte',
  up(db) {
    db.exec(`
CREATE TABLE utente.acquisto_registrato (
  id TEXT PRIMARY KEY CHECK(length(id)=32),
  partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  articolo_chiave TEXT NOT NULL,
  giorno TEXT NOT NULL, fascia TEXT NOT NULL CHECK(fascia IN ('giorno','sera')),
  ordine INTEGER NOT NULL CHECK(ordine>=0), prezzo_yen INTEGER NOT NULL CHECK(prezzo_yen>=0),
  identita_json TEXT NOT NULL CHECK(json_valid(identita_json)),
  dati_json TEXT NOT NULL CHECK(json_valid(dati_json)),
  legacy_firma TEXT, legacy_raw_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE(partita_id,id),
  CHECK((legacy_firma IS NULL AND legacy_raw_json IS NULL) OR
        (length(legacy_firma)=64 AND legacy_raw_json IS NOT NULL AND json_valid(legacy_raw_json)))
);
CREATE UNIQUE INDEX utente.acquisto_legacy_unica ON acquisto_registrato(partita_id,articolo_chiave,legacy_firma) WHERE legacy_firma IS NOT NULL;
CREATE INDEX utente.acquisto_registrato_articolo ON acquisto_registrato(partita_id,articolo_chiave);
CREATE TABLE utente.acquisto_provenienza (
  id TEXT PRIMARY KEY CHECK(length(id)=32), partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  acquisto_id TEXT NOT NULL, tipo TEXT NOT NULL CHECK(tipo IN ('manuale','diario')),
  voce_uid TEXT, effetto_uid TEXT, effetto_ordine INTEGER, fonte_json TEXT NOT NULL CHECK(json_valid(fonte_json)),
  operazione_id TEXT NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY(partita_id,acquisto_id) REFERENCES acquisto_registrato(partita_id,id) ON DELETE RESTRICT,
  CHECK((tipo='manuale' AND voce_uid IS NULL AND effetto_uid IS NULL AND effetto_ordine IS NULL) OR
        (tipo='diario' AND length(voce_uid)=32 AND length(effetto_uid)=32 AND effetto_ordine>=0))
);
CREATE UNIQUE INDEX utente.acquisto_fonte_diario ON acquisto_provenienza(partita_id,voce_uid,effetto_uid) WHERE tipo='diario';
CREATE INDEX utente.acquisto_fonti ON acquisto_provenienza(partita_id,acquisto_id);
CREATE TABLE utente.acquisto_operazione (
  partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE, operazione_id TEXT NOT NULL CHECK(length(operazione_id)=32),
  azione TEXT NOT NULL, payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), ricevuta_json TEXT NOT NULL CHECK(json_valid(ricevuta_json)),
  created_at TEXT NOT NULL, PRIMARY KEY(partita_id,operazione_id)
);
CREATE TABLE utente.effetto_applicato (
  id TEXT PRIMARY KEY CHECK(length(id)=32), partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  voce_uid TEXT NOT NULL, effetto_uid TEXT NOT NULL, effetto_ordine INTEGER NOT NULL,
  formato INTEGER NOT NULL CHECK(formato=1), tipo TEXT NOT NULL, chiave TEXT,
  prima_json TEXT, ricevuta_json TEXT NOT NULL CHECK(json_valid(ricevuta_json)),
  creato INTEGER NOT NULL CHECK(creato IN (0,1)), applicato_il TEXT NOT NULL, annullato_il TEXT, sostituita_da TEXT, assorbita_da TEXT,
  CHECK(sostituita_da IS NULL OR assorbita_da IS NULL),
  UNIQUE(partita_id,id)
);
CREATE UNIQUE INDEX utente.effetto_attivo_unico ON effetto_applicato(partita_id,voce_uid,effetto_uid) WHERE annullato_il IS NULL;
CREATE TABLE utente.da_applicare (
  id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE CHECK(length(uid)=32),
  partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  voce_uid TEXT, causa_tipo TEXT NOT NULL CHECK(causa_tipo IN ('acquisto','voce')), causa_chiave TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN ('dote','yen','effetto-voce')), chiave TEXT NOT NULL DEFAULT '',
  unita TEXT NOT NULL CHECK(unita IN ('punti-interni','yen','azione')),
  ciclo INTEGER NOT NULL CHECK(ciclo>=1), revisione_causa TEXT NOT NULL,
  delta INTEGER NOT NULL, dati_json TEXT NOT NULL CHECK(json_valid(dati_json)), motivo TEXT NOT NULL,
  stato TEXT NOT NULL DEFAULT 'aperta' CHECK(stato IN ('aperta','applicata','scartata')),
  verifica TEXT NOT NULL DEFAULT 'da-dichiarare' CHECK(verifica IN ('da-dichiarare','non-conteggiata','ignota')),
  chiusa_da TEXT CHECK(chiusa_da IN ('utente','causa')), motivo_chiusura TEXT,
  delta_applicato INTEGER NOT NULL DEFAULT 0, delta_riconosciuto INTEGER NOT NULL DEFAULT 0,
  applicazione_json TEXT, proposte_origine_json TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(proposte_origine_json)),
  creata_il TEXT NOT NULL, decisa_il TEXT
);
CREATE UNIQUE INDEX utente.proposta_aperta_unica ON da_applicare(partita_id,causa_tipo,causa_chiave,tipo,chiave) WHERE stato='aperta';
CREATE INDEX utente.proposte_partita_stato ON da_applicare(partita_id,stato,id);
CREATE TABLE utente.beneficio_ciclo (
  partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  causa_tipo TEXT NOT NULL, causa_chiave TEXT NOT NULL, tipo TEXT NOT NULL, chiave TEXT NOT NULL,
  ciclo INTEGER NOT NULL CHECK(ciclo>=1), attiva INTEGER NOT NULL CHECK(attiva IN (0,1)),
  impronta_target TEXT NOT NULL, updated_at TEXT NOT NULL,
  PRIMARY KEY(partita_id,causa_tipo,causa_chiave,tipo,chiave)
);
CREATE TABLE utente.proposta_operazione (
  partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE, operazione_id TEXT NOT NULL CHECK(length(operazione_id)=32),
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)), ricevuta_json TEXT NOT NULL CHECK(json_valid(ricevuta_json)),
  created_at TEXT NOT NULL, PRIMARY KEY(partita_id,operazione_id)
);
CREATE TABLE utente.movimento_yen (
  id TEXT PRIMARY KEY CHECK(length(id)=32), partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
  proposta_uid TEXT NOT NULL UNIQUE, causa_tipo TEXT NOT NULL, causa_chiave TEXT NOT NULL,
  prima INTEGER NOT NULL, delta INTEGER NOT NULL, dopo INTEGER NOT NULL,
  operazione_id TEXT NOT NULL, creato_il TEXT NOT NULL, CHECK(dopo=prima+delta)
);
`);
    // Le righe vecchie restano byte-per-byte; metadati solo per cestini personali autonomi.
    const colonne = new Set((db.prepare('PRAGMA utente.table_info(cestino_partite)').all() as Array<{ name: string }>).map((r) => r.name));
    for (const [nome, tipo] of [
      ['tipo', 'TEXT'], ['chiave', 'TEXT'], ['nome', 'TEXT'], ['contesto', 'TEXT'],
      ['partita_id', 'INTEGER'], ['riepilogo_json', 'TEXT'], ['formato', 'INTEGER'],
    ]) if (!colonne.has(nome!)) db.exec(`ALTER TABLE utente.cestino_partite ADD COLUMN ${nome} ${tipo}`);
  },
};
