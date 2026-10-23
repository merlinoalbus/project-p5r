// ============================================================
// schemaNegoziazione — le sei tabelle della negoziazione per umore (L8, B5: R8-07a)
// ============================================================
//
//   negoziazione_domanda        la famiglia: domande dimostrate equivalenti (mai per sola somiglianza del testo)
//   negoziazione_variante       una versione concreta della domanda (Royal, file originale dell'app, ritocco di runtime), con la sua coordinata di fonte
//   negoziazione_risposta       una posizione risposta, con le corrispondenze esplicite verso le risposte delle altre varianti
//   negoziazione_verdetto       un'attestazione atomica per umore: fonte, versione, localizzatore e alternativa sono tutti NOT NULL e ne fanno l'identità
//                               (non la terna risposta/umore/fonte: una stessa fonte può dire due cose, e una cella multi-esito ha più alternative)
//   negoziazione_umore          le quattro carte (descrizione, esempi con il riscontro su Royal, risposte da evitare)
//   negoziazione_importazione   la fotografia e il rapporto dell'importazione effettiva: immutabili (trigger)
//
// Un esito nullo è una cella senza esito documentato (il `-` della fonte): assenza di dato, non esito neutro. Si conserva per l'inventario di
// copertura. Nessuna riga si fonde con un'altra: l'identità è la chiave, il testo non lo è.
// ============================================================

export const NOMI_TABELLE_NEGOZIAZIONE = [
  'negoziazione_domanda', 'negoziazione_variante', 'negoziazione_risposta', 'negoziazione_verdetto', 'negoziazione_umore', 'negoziazione_importazione',
] as const;

export const DDL_NEGOZIAZIONE: readonly string[] = [
  `CREATE TABLE negoziazione_domanda (
    chiave  TEXT PRIMARY KEY,
    ordine  INTEGER NOT NULL UNIQUE
  )`,
  `CREATE TABLE negoziazione_variante (
    chiave          TEXT PRIMARY KEY,
    domanda_chiave  TEXT NOT NULL REFERENCES negoziazione_domanda(chiave) ON DELETE CASCADE,
    testo           TEXT,
    testo_originale TEXT NOT NULL,
    testo_origine   TEXT NOT NULL CHECK (testo_origine IN ('gioco', 'resa-app', 'resa-esperto', 'nessuna')),
    fonte           TEXT NOT NULL CHECK (fonte IN ('royal', 'app-originale', 'runtime')),
    versione_fonte  TEXT NOT NULL,
    localizzatore   TEXT NOT NULL,
    ordine          INTEGER NOT NULL,
    note_json       TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(note_json)),
    UNIQUE (fonte, versione_fonte, localizzatore),
    UNIQUE (domanda_chiave, ordine)
  )`,
  `CREATE TABLE negoziazione_risposta (
    chiave              TEXT PRIMARY KEY,
    variante_chiave     TEXT NOT NULL REFERENCES negoziazione_variante(chiave) ON DELETE CASCADE,
    testo               TEXT,
    testo_originale     TEXT NOT NULL,
    testo_origine       TEXT NOT NULL CHECK (testo_origine IN ('gioco', 'resa-app', 'resa-esperto', 'nessuna')),
    testo_disponibile   INTEGER NOT NULL DEFAULT 1 CHECK (testo_disponibile IN (0, 1)),
    ordine              INTEGER NOT NULL,
    corrispondenze_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(corrispondenze_json)),
    UNIQUE (variante_chiave, ordine)
  )`,
  `CREATE TABLE negoziazione_verdetto (
    chiave                 TEXT PRIMARY KEY,
    risposta_chiave        TEXT NOT NULL REFERENCES negoziazione_risposta(chiave) ON DELETE CASCADE,
    umore                  TEXT NOT NULL CHECK (umore IN ('cupa', 'irritabile', 'timida', 'giocosa')),
    esito                  TEXT CHECK (esito IS NULL OR esito IN ('buona', 'passabile', 'cattiva')),
    incerto                INTEGER NOT NULL DEFAULT 0 CHECK (incerto IN (0, 1)),
    fonte                  TEXT NOT NULL CHECK (fonte IN ('royal', 'app-originale', 'runtime')),
    versione_fonte         TEXT NOT NULL,
    localizzatore          TEXT NOT NULL,
    alternativa            INTEGER NOT NULL DEFAULT 0 CHECK (alternativa >= 0),
    valore_grezzo          TEXT,
    colore_grezzo          TEXT,
    origine_indicata_fonte TEXT CHECK (origine_indicata_fonte IS NULL OR origine_indicata_fonte IN ('confermata', 'ereditata-da-P5-non-confermata', 'app', 'runtime')),
    UNIQUE (fonte, versione_fonte, localizzatore, alternativa),
    CHECK ((esito IS NULL AND origine_indicata_fonte IS NULL) OR (esito IS NOT NULL AND origine_indicata_fonte IS NOT NULL))
  )`,
  'CREATE INDEX idx_neg_variante_domanda ON negoziazione_variante(domanda_chiave, ordine)',
  'CREATE INDEX idx_neg_risposta_variante ON negoziazione_risposta(variante_chiave, ordine)',
  'CREATE INDEX idx_neg_verdetto_risposta ON negoziazione_verdetto(risposta_chiave, umore)',
  `CREATE TABLE negoziazione_umore (
    umore           TEXT PRIMARY KEY CHECK (umore IN ('cupa', 'irritabile', 'timida', 'giocosa')),
    nome            TEXT NOT NULL,
    descrizione     TEXT NOT NULL DEFAULT '',
    esempi_json     TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(esempi_json)),
    da_evitare_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(da_evitare_json)),
    fonte           TEXT NOT NULL,
    versione_fonte  TEXT NOT NULL
  )`,
  `CREATE TABLE negoziazione_importazione (
    chiave             TEXT PRIMARY KEY,
    versione_formato   INTEGER NOT NULL,
    fonti_json         TEXT NOT NULL CHECK (json_valid(fonti_json)),
    input_runtime_json TEXT CHECK (input_runtime_json IS NULL OR json_valid(input_runtime_json)),
    rapporto_json      TEXT NOT NULL CHECK (json_valid(rapporto_json)),
    creata_il          TEXT NOT NULL
  )`,
  `CREATE TRIGGER negoziazione_importazione_non_si_modifica BEFORE UPDATE ON negoziazione_importazione
    BEGIN SELECT RAISE(ABORT, 'La fotografia dell''importazione della negoziazione non si modifica.'); END`,
  `CREATE TRIGGER negoziazione_importazione_non_si_elimina BEFORE DELETE ON negoziazione_importazione
    BEGIN SELECT RAISE(ABORT, 'La fotografia dell''importazione della negoziazione non si elimina.'); END`,
];
