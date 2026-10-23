import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';

/**
 * R10-23/3: il Cestino accetta anche le righe del catalogo create dall'utente (articoli, libri, film, attività, domande, cruciverba):
 * la loro eliminazione passa dal Cestino invece di una cancellazione a mano. Ricostruzione della tabella `cestino` con il solo
 * elenco dei tipi esteso, sul modello della 137: stessi ID, stessa epoca AUTOINCREMENT, righe identiche (firma prima/dopo), nessun
 * import da `server/services/`. Se la tabella non è quella nota, o è già estesa, non si tocca.
 */
const COLONNE = ['id', 'uid', 'tipo', 'chiave', 'nome', 'contesto', 'riepilogo_json', 'registro_json', 'con_partite', 'vicini_json', 'eliminato_il'];
const TIPI137 = "'area','voce','mappa','area-dedalo','area-fisica','luogo','negozio','richiesta','oggetto','voce-diario','pin'";
const TIPI160 = `${TIPI137},'articolo','libro','film','attivita','domanda','cruciverba'`;
const ddl = (nome: string, tipi: string) => `CREATE TABLE ${nome} (
  id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL CHECK(tipo IN (${tipi})),
  chiave TEXT NOT NULL,nome TEXT NOT NULL,contesto TEXT NOT NULL DEFAULT '',riepilogo_json TEXT NOT NULL DEFAULT '{}',
  registro_json TEXT NOT NULL,con_partite INTEGER NOT NULL DEFAULT 0 CHECK(con_partite IN (0,1)),vicini_json TEXT,eliminato_il TEXT NOT NULL)`;
const indice = 'CREATE INDEX idx_cestino_eliminato ON cestino(eliminato_il)';
const errore = (motivo: string): never => { throw new Error(`160: ${motivo}; nessuna ricostruzione parziale del Cestino.`); };

/** Solo spazi esterni ai letterali; nessuna equivalenza inventata fra vincoli SQL. */
function normalizza(s: string): string {
  let out = '', citazione = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "'") {
      out += c;
      if (citazione && s[i + 1] === "'") { out += "'"; i++; continue; }
      citazione = !citazione;
    } else if (citazione || !/[\s;]/.test(c)) out += c;
  }
  return out;
}

function sequenza(db: AppDatabase): Array<{ seq: number }> {
  const righe = db.prepare("SELECT seq FROM main.sqlite_sequence WHERE name='cestino'").all() as Array<{ seq: number }>;
  const massimo = (db.prepare('SELECT MAX(id) AS id FROM main.cestino').get() as { id: number | null }).id;
  if (righe.length > 1 || (righe.length === 1 && (!Number.isSafeInteger(righe[0]!.seq) || righe[0]!.seq < 0 || righe[0]!.seq < (massimo ?? 0)))
    || (!righe.length && massimo !== null)) errore('epoca AUTOINCREMENT assente o illeggibile');
  return righe;
}

function firma(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const r of db.prepare(`SELECT ${COLONNE.join(',')} FROM main.cestino ORDER BY id`).iterate()) h.update(JSON.stringify(r) + '\n');
  return h.digest('hex');
}

export const migration160: Migration = {
  id: 160, name: 'cestino_catalogo',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const sql = (db.prepare("SELECT sql FROM main.sqlite_master WHERE name='cestino' AND type='table'").get() as { sql: string } | undefined)?.sql;
    if (!sql) return errore('tabella Cestino assente');
    const dichiarazione = normalizza(sql.replace(/^CREATE TABLE\s+"cestino"/, 'CREATE TABLE cestino'));
    const giaEsteso = dichiarazione === normalizza(ddl('cestino', TIPI160));
    if (!giaEsteso && dichiarazione !== normalizza(ddl('cestino', TIPI137))) errore('DDL diverso dalla versione137 nota');
    const colonne = (db.prepare('PRAGMA main.table_info(cestino)').all() as Array<{ name: string }>).map(c => c.name);
    if (JSON.stringify(colonne) !== JSON.stringify(COLONNE)) errore('colonne inattese');
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='trigger' AND tbl_name='cestino'").get()) errore('trigger aggiuntivo');
    const indici = db.prepare('PRAGMA main.index_list(cestino)').all() as Array<{ name: string; unique: number; origin: string; partial: number }>;
    if (indici.length !== 2) errore('insieme degli indici inatteso');
    let unico = 0, eliminato = 0;
    for (const i of indici) {
      const colonneIndice = db.prepare('SELECT name FROM pragma_index_info(?,?) ORDER BY seqno').all(i.name, 'main') as Array<{ name: string }>;
      if (i.origin === 'u' && i.unique === 1 && i.partial === 0 && JSON.stringify(colonneIndice.map(c => c.name)) === '["uid"]') { unico++; continue; }
      const sqlIndice = (db.prepare("SELECT sql FROM main.sqlite_master WHERE type='index' AND name=?").get(i.name) as { sql: string | null } | undefined)?.sql;
      if (i.name !== 'idx_cestino_eliminato' || i.origin !== 'c' || i.unique !== 0 || i.partial !== 0 || !sqlIndice || normalizza(sqlIndice) !== normalizza(indice)) errore('indice diverso o aggiuntivo');
      eliminato++;
    }
    if (unico !== 1 || eliminato !== 1) errore('indici obbligatori non riconosciuti');
    for (const t of db.prepare("SELECT name FROM main.sqlite_master WHERE type='table'").all() as Array<{ name: string }>) {
      const fk = db.prepare('SELECT "table" AS padre FROM pragma_foreign_key_list(?,?)').all(t.name, 'main') as Array<{ padre: string }>;
      if (fk.some(f => f.padre.toLowerCase() === 'cestino')) errore('chiave esterna entrante sul Cestino');
    }
    const prima = firma(db), epoca = sequenza(db);
    if (giaEsteso) return;
    if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE name='cestino_catalogo_160'").get()) errore('nome della tabella temporanea già occupato');
    db.exec(`${ddl('main.cestino_catalogo_160', TIPI160)};
      INSERT INTO main.cestino_catalogo_160 (${COLONNE.join(',')}) SELECT ${COLONNE.join(',')} FROM main.cestino;
      DROP TABLE main.cestino;
      ALTER TABLE main.cestino_catalogo_160 RENAME TO cestino;
      CREATE INDEX main.idx_cestino_eliminato ON cestino(eliminato_il);`);
    // Anche l'assenza è preservata; nessun MAX o reset che renda riusabile un CAS precedente.
    db.prepare("DELETE FROM main.sqlite_sequence WHERE name='cestino'").run();
    if (epoca.length) db.prepare("INSERT INTO main.sqlite_sequence(name,seq) VALUES('cestino',?)").run(epoca[0]!.seq);
    if (firma(db) !== prima || JSON.stringify(sequenza(db)) !== JSON.stringify(epoca)) errore('righe o epoca non conservate integralmente');
  },
};
