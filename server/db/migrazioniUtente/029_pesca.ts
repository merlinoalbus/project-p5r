import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { ddlPropostePesca029, INDICI_PROPOSTE_029, STRUTTURE_PESCA_029, TABELLE_PESCA_029 } from './pesca029Schema.js';

type OggettoSchema = { type: string; name: string; tbl_name: string; sql: string | null };
const q = (nome: string) => `"${nome.replaceAll('"', '""')}"`;
const errore = (motivo: string): never => { throw new Error(`029 pesca: ${motivo}; append annullato senza reset dei dati.`); };

/** Si ignorano soltanto spazi SQL esterni ai letterali e le qualifiche del CREATE. */
function normalizzaDDL(sql: string): string {
  const s = sql.replace(/^CREATE (UNIQUE )?(TABLE|INDEX) (?:IF NOT EXISTS )?(?:utente\.)?/i, (_, unico: string | undefined, tipo: string) => `CREATE ${unico ?? ''}${tipo} `)
    .replace(/^CREATE TABLE "([a-z_0-9]+)"/, 'CREATE TABLE $1');
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

function oggetti(db: AppDatabase): OggettoSchema[] {
  return db.prepare('SELECT type,name,tbl_name,sql FROM utente.sqlite_master ORDER BY type,name').all() as OggettoSchema[];
}

/** Le firme rimangono in RAM. Gli interi SQLite non passano attraverso Number. */
function firmaTabella(db: AppDatabase, tabella: string, colonne: string[]): string {
  const h = createHash('sha256');
  const struttura = db.prepare('SELECT name,pk FROM pragma_table_info(?,?) ORDER BY pk').all(tabella, 'utente') as Array<{ name: string; pk: number }>;
  const pk = struttura.filter(c => c.pk > 0).map(c => c.name);
  const ordine = pk.length ? pk.map(q).join(',') : 'rowid';
  for (const r of db.prepare(`SELECT ${colonne.map(q).join(',')} FROM utente.${q(tabella)} ORDER BY ${ordine}`).safeIntegers(true).iterate()) {
    h.update(JSON.stringify(r, (_, v: unknown) => typeof v === 'bigint' ? { $interoSQLite: v.toString() } : v) + '\n');
  }
  return h.digest('hex');
}

function sequenza(db: AppDatabase): Array<{ rowid: number; seq: number }> {
  const righe = db.prepare("SELECT rowid,seq FROM utente.sqlite_sequence WHERE name='da_applicare'").all() as Array<{ rowid: number; seq: number }>;
  const massimo = (db.prepare('SELECT MAX(id) AS id FROM utente.da_applicare').get() as { id: number | null }).id;
  if (righe.length > 1 || (righe.length === 1 && (!Number.isSafeInteger(righe[0]!.rowid) || !Number.isSafeInteger(righe[0]!.seq) || righe[0]!.seq < 0 || righe[0]!.seq < (massimo ?? 0)))
    || (!righe.length && massimo !== null)) errore('epoca AUTOINCREMENT delle proposte non riconoscibile');
  return righe;
}

function estendiProposte(db: AppDatabase): void {
  const schema = oggetti(db);
  const tabella = schema.find(o => o.type === 'table' && o.name === 'da_applicare');
  if (!tabella?.sql || normalizzaDDL(tabella.sql) !== normalizzaDDL(ddlPropostePesca029('da_applicare', false))) errore('DDL delle proposte diverso dalla028 nota');
  if (schema.some(o => o.type === 'trigger' && o.tbl_name === 'da_applicare')) errore('trigger sulle proposte non previsto');
  if (schema.some(o => (o.type === 'view' || o.type === 'trigger') && o.sql !== null
    && /(?:^|[^a-z0-9_])(?:"da_applicare"|da_applicare)(?:$|[^a-z0-9_])/i.test(o.sql))) errore('query correlata alle proposte non prevista dalla028');
  const indici = db.prepare('PRAGMA utente.index_list(da_applicare)').all() as Array<{ name: string; unique: number; origin: string; partial: number }>;
  if (indici.length !== 3) errore('insieme indici delle proposte diverso dalla028');
  let uid = 0;
  for (const indice of indici) {
    const campi = db.prepare('SELECT name FROM pragma_index_info(?,?) ORDER BY seqno').all(indice.name, 'utente') as Array<{ name: string }>;
    if (indice.origin === 'u' && indice.unique === 1 && indice.partial === 0 && JSON.stringify(campi.map(c => c.name)) === '["uid"]') { uid++; continue; }
    const atteso = INDICI_PROPOSTE_029.find(([nome]) => nome === indice.name);
    const ddl = schema.find(o => o.type === 'index' && o.name === indice.name)?.sql;
    if (!atteso || indice.origin !== 'c' || !ddl || normalizzaDDL(ddl) !== normalizzaDDL(atteso[1])) errore('indice delle proposte sconosciuto o modificato');
  }
  if (uid !== 1) errore('indice unico UID delle proposte assente');
  for (const t of schema.filter(o => o.type === 'table')) {
    const fk = db.prepare('SELECT "table" AS padre FROM pragma_foreign_key_list(?,?)').all(t.name, 'utente') as Array<{ padre: string }>;
    if (fk.some(f => f.padre.toLowerCase() === 'da_applicare')) errore('chiave esterna entrante sulle proposte non prevista');
  }
  if (schema.some(o => o.name === 'da_applicare_pesca_029')) errore('nome temporaneo già occupato');
  const colonne = (db.prepare('PRAGMA utente.table_info(da_applicare)').all() as Array<{ name: string }>).map(c => c.name);
  const prima = firmaTabella(db, 'da_applicare', colonne), epoca = sequenza(db);
  // DROP TABLE rimuove anche le statistiche degli indici. Gli stessi dati e
  // indici vengono ricostruiti: conserviamo tutte le statistiche già presenti,
  // con rowid e tipi SQLite originali, senza crearne o ricalcolarne altre.
  const statistiche = ['sqlite_stat1', 'sqlite_stat2', 'sqlite_stat3', 'sqlite_stat4']
    .filter(nome => schema.some(o => o.type === 'table' && o.name === nome))
    .map(nome => {
      const campi = ['rowid', ...(db.prepare('SELECT name FROM pragma_table_info(?,?) ORDER BY cid').all(nome, 'utente') as Array<{ name: string }>).map(c => c.name)];
      const righe = db.prepare(`SELECT ${campi.map(q).join(',')} FROM utente.${q(nome)} WHERE tbl='da_applicare' ORDER BY rowid`).raw().safeIntegers(true).all() as unknown[][];
      return { nome, campi, righe };
    });
  db.exec(`${ddlPropostePesca029('utente.da_applicare_pesca_029', true)};
    INSERT INTO utente.da_applicare_pesca_029 (${colonne.map(q).join(',')}) SELECT ${colonne.map(q).join(',')} FROM utente.da_applicare;
    DROP TABLE utente.da_applicare;
    ALTER TABLE utente.da_applicare_pesca_029 RENAME TO da_applicare;`);
  for (const [, ddl] of INDICI_PROPOSTE_029) db.exec(ddl.replace('INDEX ', 'INDEX utente.'));
  for (const { nome, campi, righe } of statistiche) {
    const inserisci = db.prepare(`INSERT INTO utente.${q(nome)} (${campi.map(q).join(',')}) VALUES (${campi.map(() => '?').join(',')})`);
    for (const riga of righe) inserisci.run(...riga);
  }
  db.prepare("DELETE FROM utente.sqlite_sequence WHERE name='da_applicare'").run();
  // sequenza() ha già verificato gli interi sicuri: BigInt conserva INTEGER anche
  // in seq, priva di affinità; better-sqlite3 legherebbe Number come REAL.
  if (epoca.length) db.prepare("INSERT INTO utente.sqlite_sequence(rowid,name,seq) VALUES(?,'da_applicare',?)").run(BigInt(epoca[0]!.rowid), BigInt(epoca[0]!.seq));
  const dopo = oggetti(db).find(o => o.type === 'table' && o.name === 'da_applicare')?.sql;
  if (!dopo || normalizzaDDL(dopo) !== normalizzaDDL(ddlPropostePesca029('da_applicare', true))
    || firmaTabella(db, 'da_applicare', colonne) !== prima || JSON.stringify(sequenza(db)) !== JSON.stringify(epoca)) errore('righe, DDL o epoca delle proposte non conservate integralmente');
}

export const utente029: Migration = {
  id: 29, name: 'pesca',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const schemaPrima = oggetti(db);
    // Il bootstrap può aver già creato la stessa DDL vuota: mai adottare tabelle popolate o varianti.
    for (const [tipo, nome, ddl] of STRUTTURE_PESCA_029) {
      const presente = schemaPrima.find(o => o.name === nome);
      if (presente && (presente.type !== tipo || !presente.sql || normalizzaDDL(presente.sql) !== normalizzaDDL(ddl))) errore(`struttura ${nome} preesistente diversa dal contratto`);
      if (tipo === 'table' && presente && db.prepare(`SELECT 1 FROM utente.${q(nome)} LIMIT 1`).get()) errore(`tabella nuova ${nome} già popolata`);
    }
    const nuove = new Set<string>(TABELLE_PESCA_029);
    if (schemaPrima.some(o => nuove.has(o.tbl_name) && o.type === 'trigger')) errore('trigger preesistente sulle nuove tabelle pesca');
    if (schemaPrima.some(o => nuove.has(o.tbl_name) && o.type === 'index' && o.sql !== null
      && !STRUTTURE_PESCA_029.some(([tipo, nome]) => tipo === 'index' && nome === o.name))) errore('indice aggiuntivo sulle nuove tabelle pesca');
    const vecchie = schemaPrima.filter(o => o.type === 'table' && !nuove.has(o.name)).map(t => {
      const colonne = (db.prepare('SELECT name FROM pragma_table_info(?,?) ORDER BY cid').all(t.name, 'utente') as Array<{ name: string }>).map(c => c.name);
      return { nome: t.name, colonne, firma: firmaTabella(db, t.name, colonne) };
    });
    const esterni = (elenco: OggettoSchema[]) => elenco.filter(o => !nuove.has(o.tbl_name) && o.tbl_name !== 'da_applicare' && o.name !== 'turno_partita' && o.name !== 'turno_uid_unico');
    const schemaEsternoPrima = JSON.stringify(esterni(schemaPrima));
    const turno = schemaPrima.find(o => o.type === 'table' && o.name === 'turno_partita');
    const ddlTurno = `CREATE TABLE turno_partita (
      partita_id INTEGER NOT NULL REFERENCES partita(id) ON DELETE CASCADE,
      attivita_chiave TEXT NOT NULL, ordine INTEGER NOT NULL CHECK (ordine >= 1),
      created_at TEXT NOT NULL, PRIMARY KEY (partita_id, attivita_chiave, ordine)
    )`;
    if (!turno?.sql || normalizzaDDL(turno.sql) !== normalizzaDDL(ddlTurno)) errore('DDL dei turni pregressi diverso da quello noto');
    if (schemaPrima.some(o => o.name === 'turno_uid_unico')) errore('nome indice UID turni già occupato');
    estendiProposte(db);
    db.exec('ALTER TABLE utente.turno_partita ADD COLUMN uid TEXT CHECK(uid IS NULL OR (length(uid)=32 AND uid NOT GLOB \'*[^0-9a-f]*\')); CREATE UNIQUE INDEX utente.turno_uid_unico ON turno_partita(uid);');
    for (const [, , ddl] of STRUTTURE_PESCA_029) db.exec(ddl);
    if (db.prepare('SELECT 1 FROM utente.turno_partita WHERE uid IS NOT NULL LIMIT 1').get()) errore('un vecchio turno ha ricevuto un UID senza consenso');
    for (const t of vecchie) if (firmaTabella(db, t.nome, t.colonne) !== t.firma) errore(`righe o epoca di ${t.nome} non conservate`);
    const schemaDopo = oggetti(db);
    if (JSON.stringify(esterni(schemaDopo)) !== schemaEsternoPrima) errore('oggetto esterno, indice o query correlata alterati');
    for (const [tipo, nome, ddl] of STRUTTURE_PESCA_029) {
      const creato = schemaDopo.find(o => o.type === tipo && o.name === nome);
      if (!creato?.sql || normalizzaDDL(creato.sql) !== normalizzaDDL(ddl)) errore(`DDL finale di ${nome} non riconosciuto`);
      if (tipo === 'table' && db.prepare(`SELECT 1 FROM utente.${q(nome)} LIMIT 1`).get()) errore(`inizializzazione non autorizzata di ${nome}`);
    }
  },
};
