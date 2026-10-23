// ============================================================
// 169 — schema per le Persona del gruppo (L8, B2, R8-20): ricostruzione conservativa di `persona` e `persona_skill`
// ============================================================
//
// Le 27 forme dei Ladri (9 membri × 3 forme, `persona-del-gruppo.json`) entrano nel compendio come righe di `persona`, ma non sono
// fondibili e non hanno oggetti d'esecuzione. Servono quindi tre cambi che SQLite non ammette con un ALTER:
//   - `persona.oggetto` e `persona.oggetto_allarme` possono essere NULL, solo per `del_party = 1` (CHECK di tabella);
//   - `persona.nome` non è più UNIQUE per tutte le righe: l'unicità è un indice parziale sulle ordinarie (`del_party = 0`) e uno,
//     separato, sulle Persona del gruppo; un omonimo del gruppo non obbliga a rinominare né ad adottare una Persona fondibile;
//   - `persona_skill.livello` può essere NULL quando la skill non si impara a un livello (`modo` risveglio / rango / terza-forma).
// Colonne aggiunte a `persona`: del_party, personaggio, forma, forma_di (radice della catena), deriva_da (predecessore effettivo:
// Ervardo ha radice Robin Hood e deriva da Loki), chiave_forma (identità della forma, univoca), forma_condizioni_json.
// Colonna aggiunta a `persona_skill`: modo ('livello', 'iniziale', 'risveglio', 'rango', 'terza-forma'); le righe di oggi con
// livello 0 («innata») diventano 'iniziale', tutte le altre 'livello'.
//
// Conservativa (stesso perimetro del runner: chiavi esterne spente, `foreign_key_check` prima/dopo dentro la transazione):
//   - verifica puntuale del vecchio schema (colonne, tipi, NOT NULL, default, indici, trigger): se non è quello atteso si ferma
//     PRIMA di scrivere;
//   - tabelle nuove con tutte le colonne esistenti, copia con colonne nominate (ID invariati), confronto riga per riga nei due versi
//     (EXCEPT) e dei conteggi PRIMA di sostituire; niente DELETE né INSERT OR REPLACE sulle dipendenze, nessuna cascata;
//   - indici e trigger esistenti ricreati con il loro SQL; `legacy_alter_table` letto, acceso per la rinomina e ripristinato;
//   - le tabelle che puntano a `persona` (affinità, ricette, tesori, DLC, fonti d'esecuzione) non si toccano; `partite.db` neppure.
// Con le chiavi esterne accese la DROP cancellerebbe a cascata le dipendenze: la migrazione rifiuta di partire se lo sono.
// Idempotente: se lo schema è già quello nuovo non fa nulla.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';

interface InfoColonna { cid: number; name: string; type: string; notnull: number; dflt_value: string | null; pk: number }

/** Lo schema di `persona` prima della 169: nome, tipo, NOT NULL, default, chiave primaria, nell'ordine delle colonne. */
const PERSONA_PRIMA: ReadonlyArray<readonly [string, string, number, string | null, number]> = [
  ['id', 'INTEGER', 0, null, 1], ['nome', 'TEXT', 1, null, 0], ['arcana', 'TEXT', 1, null, 0], ['livello', 'INTEGER', 1, null, 0],
  ['eredita', 'TEXT', 0, null, 0], ['speciale', 'INTEGER', 1, '0', 0], ['rara', 'INTEGER', 1, '0', 0], ['dlc', 'INTEGER', 1, '0', 0],
  ['richiede_confidente_max', 'INTEGER', 1, '0', 0], ['nota', 'TEXT', 0, null, 0], ['oggetto', 'TEXT', 1, null, 0], ['oggetto_allarme', 'TEXT', 1, null, 0],
  ['oggetto_e_carta', 'INTEGER', 1, '0', 0], ['tratto', 'TEXT', 1, null, 0], ['forza', 'INTEGER', 1, null, 0], ['magia', 'INTEGER', 1, null, 0],
  ['resistenza', 'INTEGER', 1, null, 0], ['agilita', 'INTEGER', 1, null, 0], ['fortuna', 'INTEGER', 1, null, 0],
  ['aree_mementos_json', 'TEXT', 1, "'[]'", 0], ['piani_mementos', 'TEXT', 0, null, 0], ['descrizione', 'TEXT', 1, "''", 0], ['fonte_descrizione', 'TEXT', 1, "''", 0],
];
const PERSONA_SKILL_PRIMA: ReadonlyArray<readonly [string, string, number, string | null, number]> = [
  ['persona_id', 'INTEGER', 1, null, 1], ['skill_id', 'INTEGER', 1, null, 2], ['livello', 'INTEGER', 1, null, 0],
];
const COLONNE_PERSONA = PERSONA_PRIMA.map((c) => c[0]);
const COLONNE_PERSONA_SKILL = PERSONA_SKILL_PRIMA.map((c) => c[0]);

const NUOVE_PERSONA = ['del_party', 'personaggio', 'forma', 'forma_di', 'deriva_da', 'chiave_forma', 'forma_condizioni_json'];

const DDL_PERSONA = `CREATE TABLE main.persona_nuova (
  id                       INTEGER PRIMARY KEY,
  nome                     TEXT NOT NULL,
  arcana                   TEXT NOT NULL REFERENCES arcana(chiave),
  livello                  INTEGER NOT NULL,
  eredita                  TEXT,
  speciale                 INTEGER NOT NULL DEFAULT 0,
  rara                     INTEGER NOT NULL DEFAULT 0,
  dlc                      INTEGER NOT NULL DEFAULT 0,
  richiede_confidente_max  INTEGER NOT NULL DEFAULT 0,
  nota                     TEXT,
  oggetto                  TEXT,
  oggetto_allarme          TEXT,
  oggetto_e_carta          INTEGER NOT NULL DEFAULT 0,
  tratto                   TEXT NOT NULL,
  forza                    INTEGER NOT NULL,
  magia                    INTEGER NOT NULL,
  resistenza               INTEGER NOT NULL,
  agilita                  INTEGER NOT NULL,
  fortuna                  INTEGER NOT NULL,
  aree_mementos_json       TEXT NOT NULL DEFAULT '[]',
  piani_mementos           TEXT,
  descrizione              TEXT NOT NULL DEFAULT '',
  fonte_descrizione        TEXT NOT NULL DEFAULT '',
  del_party                INTEGER NOT NULL DEFAULT 0 CHECK (del_party IN (0, 1)),
  personaggio              TEXT,
  forma                    INTEGER CHECK (forma IN (1, 2, 3)),
  forma_di                 INTEGER REFERENCES persona(id),
  deriva_da                INTEGER REFERENCES persona(id),
  chiave_forma             TEXT,
  forma_condizioni_json    TEXT,
  CHECK (del_party = 1 OR (oggetto IS NOT NULL AND oggetto_allarme IS NOT NULL)),
  CHECK (del_party = 0 OR (personaggio IS NOT NULL AND forma IS NOT NULL AND chiave_forma IS NOT NULL)),
  CHECK (forma_di IS NULL OR forma > 1),
  CHECK (deriva_da IS NULL OR forma > 1),
  CHECK (del_party = 0 OR forma = 1 OR (forma_di IS NOT NULL AND deriva_da IS NOT NULL))
)`;

const DDL_PERSONA_SKILL = `CREATE TABLE main.persona_skill_nuova (
  persona_id  INTEGER NOT NULL REFERENCES persona(id) ON DELETE CASCADE,
  skill_id    INTEGER NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  livello     INTEGER,                 -- 0 = innata; NULL solo per le skill che non si imparano a un livello
  modo        TEXT NOT NULL DEFAULT 'livello' CHECK (modo IN ('livello', 'iniziale', 'risveglio', 'rango', 'terza-forma')),
  PRIMARY KEY (persona_id, skill_id),
  CHECK ((modo IN ('livello', 'iniziale') AND livello IS NOT NULL) OR (modo IN ('risveglio', 'rango', 'terza-forma') AND livello IS NULL))
)`;

const INDICI_NUOVI = [
  'CREATE UNIQUE INDEX idx_persona_nome_ordinaria ON persona(nome) WHERE del_party = 0',
  'CREATE UNIQUE INDEX idx_persona_nome_del_gruppo ON persona(nome) WHERE del_party = 1',
  'CREATE UNIQUE INDEX idx_persona_chiave_forma ON persona(chiave_forma) WHERE chiave_forma IS NOT NULL',
  'CREATE UNIQUE INDEX idx_persona_personaggio_forma ON persona(personaggio, forma) WHERE del_party = 1',
];

function colonne(db: AppDatabase, tabella: string): InfoColonna[] {
  return db.prepare(`SELECT * FROM pragma_table_info('${tabella}', 'main')`).all() as InfoColonna[];
}

/** Vero se le colonne di `tabella` sono esattamente quelle attese (nome, tipo, NOT NULL, default, chiave primaria). */
function schemaEsatto(db: AppDatabase, tabella: string, attese: ReadonlyArray<readonly [string, string, number, string | null, number]>): boolean {
  const reali = colonne(db, tabella);
  return reali.length === attese.length && reali.every((c, i) => {
    const a = attese[i];
    return c.name === a[0] && c.type.toUpperCase() === a[1] && c.notnull === a[2] && c.dflt_value === a[3] && c.pk === a[4];
  });
}

/** Righe di `da` non presenti in `a` sulle sole colonne indicate (uguaglianza stretta, NULL compreso): 0 = tutte conservate. */
function righeMancanti(db: AppDatabase, da: string, a: string, cols: string[]): number {
  const elenco = cols.map((c) => `"${c}"`).join(', ');
  return (db.prepare(`SELECT COUNT(*) AS n FROM (SELECT ${elenco} FROM main.${da} EXCEPT SELECT ${elenco} FROM main.${a})`).get() as { n: number }).n;
}

function conta(db: AppDatabase, tabella: string): number {
  return (db.prepare(`SELECT COUNT(*) AS n FROM main.${tabella}`).get() as { n: number }).n;
}

/** Indici e trigger (con SQL) di una tabella, da ricreare dopo la sostituzione. */
function oggettiDi(db: AppDatabase, tabella: string): Array<{ type: string; name: string; sql: string }> {
  return db.prepare("SELECT type, name, sql FROM main.sqlite_master WHERE tbl_name = ? AND type IN ('index', 'trigger') AND sql IS NOT NULL ORDER BY type, name").all(tabella) as Array<{ type: string; name: string; sql: string }>;
}

export const migration169: Migration = {
  id: 169,
  name: 'persona_del_gruppo_schema',
  up(db) {
    const haDelParty = colonne(db, 'persona').some((c) => c.name === 'del_party');
    const haModo = colonne(db, 'persona_skill').some((c) => c.name === 'modo');
    if (haDelParty && haModo) return;
    if (haDelParty !== haModo) throw new Error('Migrazione 169: schema a metà (una sola delle due tabelle è già ricostruita): fermata prima di scrivere.');

    if ((db.pragma('foreign_keys', { simple: true }) as number) !== 0) {
      throw new Error('Migrazione 169: le chiavi esterne sono accese; la sostituzione di `persona` cancellerebbe a cascata le dipendenze. Fermata.');
    }
    if (!schemaEsatto(db, 'persona', PERSONA_PRIMA)) throw new Error('Migrazione 169: lo schema di `persona` non è quello atteso. Fermata prima di scrivere.');
    if (!schemaEsatto(db, 'persona_skill', PERSONA_SKILL_PRIMA)) throw new Error('Migrazione 169: lo schema di `persona_skill` non è quello atteso. Fermata prima di scrivere.');
    // Una vista che cita proprio la tabella `persona` (parola intera: `persona_area_dedalo` e simili sono altre tabelle).
    const vistePersona = (db.prepare("SELECT name, sql FROM main.sqlite_master WHERE type = 'view'").all() as Array<{ name: string; sql: string }>).filter((v) => /\bpersona\b/i.test(v.sql));
    if (vistePersona.length > 0) throw new Error(`Migrazione 169: viste che citano \`persona\` (${vistePersona.map((v) => v.name).join(', ')}): da esaminare prima di ricostruire. Fermata.`);

    const oggettiPersona = oggettiDi(db, 'persona');
    const oggettiSkill = oggettiDi(db, 'persona_skill');
    const prima = { persona: conta(db, 'persona'), personaSkill: conta(db, 'persona_skill') };
    const legacy = db.pragma('legacy_alter_table', { simple: true }) as number;

    // ---- persona ----
    db.exec(DDL_PERSONA);
    const elencoP = COLONNE_PERSONA.map((c) => `"${c}"`).join(', ');
    db.exec(`INSERT INTO main.persona_nuova (${elencoP}) SELECT ${elencoP} FROM main.persona`);
    if (conta(db, 'persona_nuova') !== prima.persona) throw new Error('Migrazione 169: conteggio di `persona` diverso dopo la copia. Annullata.');
    if (righeMancanti(db, 'persona', 'persona_nuova', COLONNE_PERSONA) !== 0 || righeMancanti(db, 'persona_nuova', 'persona', COLONNE_PERSONA) !== 0) {
      throw new Error('Migrazione 169: le righe di `persona` copiate non coincidono con le originali. Annullata.');
    }

    // ---- persona_skill ----
    db.exec(DDL_PERSONA_SKILL);
    const elencoS = COLONNE_PERSONA_SKILL.map((c) => `"${c}"`).join(', ');
    db.exec(`INSERT INTO main.persona_skill_nuova (${elencoS}, modo) SELECT ${elencoS}, CASE WHEN livello = 0 THEN 'iniziale' ELSE 'livello' END FROM main.persona_skill`);
    if (conta(db, 'persona_skill_nuova') !== prima.personaSkill) throw new Error('Migrazione 169: conteggio di `persona_skill` diverso dopo la copia. Annullata.');
    if (righeMancanti(db, 'persona_skill', 'persona_skill_nuova', COLONNE_PERSONA_SKILL) !== 0 || righeMancanti(db, 'persona_skill_nuova', 'persona_skill', COLONNE_PERSONA_SKILL) !== 0) {
      throw new Error('Migrazione 169: le righe di `persona_skill` copiate non coincidono con le originali. Annullata.');
    }

    // ---- sostituzione (chiavi esterne spente: nessuna cascata; legacy_alter_table: nessuna riscrittura dei riferimenti altrui) ----
    try {
      db.pragma('legacy_alter_table = ON');
      db.exec('DROP TABLE main.persona_skill');
      db.exec('DROP TABLE main.persona');
      db.exec('ALTER TABLE main.persona_nuova RENAME TO persona');
      db.exec('ALTER TABLE main.persona_skill_nuova RENAME TO persona_skill');
    } finally {
      db.pragma(`legacy_alter_table = ${legacy ? 'ON' : 'OFF'}`);
    }
    for (const o of [...oggettiPersona, ...oggettiSkill]) db.exec(o.sql);
    for (const sql of INDICI_NUOVI) db.exec(sql);

    // ---- controlli finali ----
    const dopo = { persona: conta(db, 'persona'), personaSkill: conta(db, 'persona_skill') };
    if (dopo.persona !== prima.persona || dopo.personaSkill !== prima.personaSkill) throw new Error('Migrazione 169: conteggi diversi dopo la sostituzione. Annullata.');
    const attese = new Set([...COLONNE_PERSONA, ...NUOVE_PERSONA]);
    const reali = colonne(db, 'persona').map((c) => c.name);
    if (reali.length !== attese.size || reali.some((c) => !attese.has(c))) throw new Error('Migrazione 169: colonne di `persona` inattese dopo la ricostruzione. Annullata.');
    logger.info({ persona: dopo.persona, personaSkill: dopo.personaSkill, indiciRicreati: oggettiPersona.length + oggettiSkill.length }, '[migration169] schema delle Persona del gruppo');
  },
};
