import { createHash } from 'node:crypto';
import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { ATTIVITA_PESCA_DOPO_138, ATTIVITA_PESCA_PRIMA_138, REGOLA_PESCA_138 } from './pesca138Manifest.js';

type Riga = Record<string, unknown>;
type Esito = 'rettificata' | 'gia-corretta' | 'assente' | 'esclusa';
const CHIAVI = ATTIVITA_PESCA_PRIMA_138.map(r => r.chiave);
const q = (nome: string) => `"${nome.replaceAll('"', '""')}"`;
const oggetto = (x: unknown): x is Riga => x !== null && typeof x === 'object' && !Array.isArray(x);
const identica = (r: Riga | undefined, firma: Riga): boolean => !!r && Object.keys(r).length === Object.keys(firma).length && Object.entries(firma).every(([c, v]) => Object.hasOwn(r, c) && r[c] === v);
const errore = (motivo: string): never => { throw new Error(`138 pesca: ${motivo}; transazione annullata senza bonifica parziale.`); };

const DDL_REGOLA = `CREATE TABLE regola_pesca (
  chiave TEXT PRIMARY KEY NOT NULL,
  versione INTEGER NOT NULL CHECK(versione=1), nome TEXT NOT NULL,
  dati_json TEXT NOT NULL CHECK(json_valid(dati_json) AND json_type(dati_json)='object'), fonti_json TEXT NOT NULL CHECK(json_valid(fonti_json) AND json_type(fonti_json)='array'),
  origine TEXT NOT NULL CHECK(origine IN ('seed','utente')),
  seed_json TEXT CHECK(seed_json IS NULL OR json_valid(seed_json)), updated_at TEXT NOT NULL
)`;
const DDL_AUDIT = `CREATE TABLE audit_pesca_138 (
  id INTEGER PRIMARY KEY CHECK(id=1), versione INTEGER NOT NULL CHECK(versione=1),
  regola_chiave TEXT NOT NULL CHECK(regola_chiave='ichigaya-royal-v1'),
  esito TEXT NOT NULL CHECK(esito IN ('rettificata','gia-corretta','assente','esclusa')),
  motivo TEXT NOT NULL, attivita_json TEXT NOT NULL CHECK(json_valid(attivita_json)),
  prima_json TEXT NOT NULL CHECK(json_valid(prima_json)), dopo_json TEXT NOT NULL CHECK(json_valid(dopo_json)),
  copertura_json TEXT NOT NULL CHECK(json_valid(copertura_json)), creato_il TEXT NOT NULL
)`;

function normalizzaDDL(sql: string): string {
  const s = sql.replace(/^CREATE TABLE (?:IF NOT EXISTS )?(?:main\.)?/i, 'CREATE TABLE ').replace(/^CREATE TABLE "([a-z_0-9]+)"/, 'CREATE TABLE $1');
  let out = '', citazione = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "'") { out += c; if (citazione && s[i + 1] === "'") { out += "'"; i++; continue; } citazione = !citazione; }
    else if (citazione || !/[\s;]/.test(c)) out += c;
  }
  return out;
}

function assicuraTabella(db: AppDatabase, nome: string, ddl: string): void {
  const esistente = db.prepare('SELECT type,sql FROM main.sqlite_master WHERE name=?').get(nome) as { type: string; sql: string | null } | undefined;
  if (esistente && (esistente.type !== 'table' || !esistente.sql || normalizzaDDL(esistente.sql) !== normalizzaDDL(ddl))) errore(`struttura ${nome} preesistente diversa dal contratto`);
  if (!esistente) db.exec(ddl);
  if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='trigger' AND tbl_name=?").get(nome)) errore(`trigger inatteso su ${nome}`);
  if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='index' AND tbl_name=? AND sql IS NOT NULL").get(nome)) errore(`indice aggiuntivo su ${nome}`);
}

function auditValido(audit: Riga): boolean {
  if (Object.keys(audit).length !== 10 || audit.id !== 1 || audit.versione !== 1 || audit.regola_chiave !== REGOLA_PESCA_138.chiave
    || typeof audit.esito !== 'string' || !['rettificata','gia-corretta','assente','esclusa'].includes(audit.esito)
    || typeof audit.motivo !== 'string' || !audit.motivo || typeof audit.creato_il !== 'string' || !Number.isFinite(Date.parse(audit.creato_il))) return false;
  const json = (raw: unknown): unknown => { try { return typeof raw === 'string' ? JSON.parse(raw) as unknown : undefined; } catch { return undefined; } };
  const attivita = json(audit.attivita_json), prima = json(audit.prima_json), dopo = json(audit.dopo_json), copertura = json(audit.copertura_json);
  return Array.isArray(attivita) && attivita.length === 2 && attivita.every((r, i) => oggetto(r) && Object.keys(r).length === 3 && r.chiave === CHIAVI[i]
    && typeof r.esito === 'string' && ['rettificata','gia-corretta','assente','esclusa'].includes(r.esito) && typeof r.motivo === 'string')
    && Array.isArray(prima) && prima.length === 2 && prima.every(r => r === null || oggetto(r))
    && Array.isArray(dopo) && dopo.length === 2 && dopo.every(r => r === null || oggetto(r))
    && oggetto(copertura) && Object.keys(copertura).length === 4 && typeof copertura.leggibile === 'boolean'
    && ['registri','passi','pertinenti'].every(c => Number.isSafeInteger(copertura[c]) && Number(copertura[c]) >= 0);
}

interface Copertura { leggibile: boolean; registri: number; passi: number; pertinenti: number }
/** Nessun registro o fotografia è riscritto: incertezza o riferimenti pertinenti escludono il gruppo. */
function coperturaCestino(db: AppDatabase): Copertura {
  const esito: Copertura = { leggibile: true, registri: 0, passi: 0, pertinenti: 0 };
  if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='table' AND name='cestino'").get()) return { ...esito, leggibile: false };
  const riferisce = (v: unknown): boolean => {
    if (typeof v === 'string') return CHIAVI.some(chiave => v.includes(chiave));
    if (Array.isArray(v)) return v.some(riferisce);
    return oggetto(v) && Object.entries(v).some(([k, x]) => CHIAVI.some(chiave => k.includes(chiave)) || riferisce(x));
  };
  for (const registro of db.prepare('SELECT registro_json FROM main.cestino ORDER BY id').iterate() as Iterable<{ registro_json: unknown }>) {
    esito.registri++;
    let passi: unknown; try { passi = typeof registro.registro_json === 'string' ? JSON.parse(registro.registro_json) as unknown : null; } catch { passi = null; }
    if (!Array.isArray(passi)) { esito.leggibile = false; continue; }
    const sequenze = new Set<number>();
    for (const p of passi) {
      esito.passi++;
      if (!oggetto(p) || !Number.isSafeInteger(p.seq) || Number(p.seq) < 0 || sequenze.has(Number(p.seq)) || typeof p.tabella !== 'string'
        || (p.op !== 'D' && p.op !== 'I' && p.op !== 'U') || Object.keys(p).some(k => !['seq','tabella','op','prima','dopo'].includes(k))
        || (p.op === 'D' && Object.hasOwn(p, 'dopo')) || (p.op === 'I' && Object.hasOwn(p, 'prima'))) { esito.leggibile = false; continue; }
      sequenze.add(Number(p.seq));
      const tabella = db.prepare("SELECT sql FROM main.sqlite_master WHERE type='table' AND name=?").get(p.tabella) as { sql: string } | undefined;
      const struttura = db.prepare('SELECT name,pk,type,"notnull" AS obbligatorio FROM pragma_table_info(?,?)').all(p.tabella, 'main') as Array<{ name: string; pk: number; type: string; obbligatorio: number }>;
      if (!tabella || !struttura.length) { esito.leggibile = false; continue; }
      const pk = struttura.filter(c => c.pk > 0);
      const identita = pk.length ? pk.map(c => ({ nome: c.name, nullable: c.obbligatorio === 0 && !/\bWITHOUT\s+ROWID\b|\bSTRICT\b/i.test(tabella.sql)
        && !(pk.length === 1 && c.type.trim().toUpperCase() === 'INTEGER') })) : [{ nome: 'rowid', nullable: false }];
      for (const lato of p.op === 'D' ? ['prima'] : p.op === 'I' ? ['dopo'] : ['prima','dopo']) {
        const r = p[lato];
        if (!oggetto(r) || identita.some(c => !Object.hasOwn(r, c.nome) || (r[c.nome] === null ? !c.nullable : typeof r[c.nome] !== 'string'
          && !(typeof r[c.nome] === 'number' && Number.isSafeInteger(r[c.nome]))))) { esito.leggibile = false; continue; }
        if (Object.values(r).some(v => !(v === null || typeof v === 'string' || typeof v === 'number' && Number.isFinite(v)
          || oggetto(v) && Object.keys(v).length === 1 && typeof v.$blob === 'string' && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v.$blob)))) esito.leggibile = false;
        if (riferisce(r)) esito.pertinenti++;
      }
    }
  }
  return esito;
}

function dipendenza124(db: AppDatabase): boolean {
  const raw = db.prepare('SELECT json FROM main.dati_guida WHERE chiave=?').get('bonifica-condizioni-attivita-124') as { json: string } | undefined;
  let audit: unknown; try { audit = raw ? JSON.parse(raw.json) as unknown : null; } catch { return false; }
  if (!oggetto(audit) || !Array.isArray(audit.convertite) || !Array.isArray(audit.giaCorrette) || !Array.isArray(audit.escluse)
    || audit.convertite.some(x => typeof x !== 'string') || audit.giaCorrette.some(x => typeof x !== 'string')
    || audit.escluse.some(x => !oggetto(x) || typeof x.origine !== 'string' || typeof x.motivo !== 'string')) return false;
  const identita = 'attivita:pesca-ichigaya';
  if (![...audit.convertite, ...audit.giaCorrette].includes(identita)
    || audit.escluse.some(x => (x as Riga).origine === identita || String((x as Riga).origine).startsWith(`${identita}/`))) return false;
  const sede = db.prepare('SELECT origine,quartiere_chiave,condizioni_json,orari_json FROM main.luogo WHERE chiave=?').get('ichigaya/laghetto-ichigaya') as Riga | undefined;
  const quartiere = db.prepare('SELECT condizioni_json FROM main.quartiere WHERE chiave=?').get('ichigaya') as Riga | undefined;
  const invito = db.prepare('SELECT origine,confidente_chiave,data,apre_tipo,apre_chiave,condizioni_json FROM main.confidente_invito WHERE chiave=?').get('ryuji/07-03') as Riga | undefined;
  const sblocco = '[{"tipo":"lettura","categoria":"libro","chiave":"vedetta-lacustre"}]';
  return sede?.origine === 'seed' && sede.quartiere_chiave === 'ichigaya' && sede.condizioni_json === sblocco
    && sede.orari_json === '{"giorni":[],"fasce":[],"chiusoConPioggia":false,"nota":null}' && quartiere?.condizioni_json === sblocco
    && invito?.origine === 'seed' && invito.confidente_chiave === 'ryuji' && invito.data === '07-03' && invito.apre_tipo === 'luogo'
    && invito.apre_chiave === 'ichigaya/laghetto-ichigaya'
    && invito.condizioni_json === '[{"tipo":"palazzo","dungeon":"kaneshiro"},{"tipo":"confidente","confidente":"kawakami","rango":1}]';
}

/** Il Cestino e la sua epoca non sono toccati neppure indirettamente da questa append. */
function firmaCestino(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const r of db.prepare('SELECT * FROM main.cestino ORDER BY id').safeIntegers(true).iterate()) h.update(JSON.stringify(r, (_, v: unknown) => typeof v === 'bigint' ? { $interoSQLite: v.toString() } : v) + '\n');
  const epoca = db.prepare("SELECT rowid,name,seq FROM main.sqlite_sequence WHERE name='cestino' ORDER BY rowid").safeIntegers(true).all();
  h.update(JSON.stringify(epoca, (_, v: unknown) => typeof v === 'bigint' ? { $interoSQLite: v.toString() } : v));
  return h.digest('hex');
}

export const migration138: Migration = {
  id: 138, name: 'pesca',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const primaCestino = firmaCestino(db);
    assicuraTabella(db, 'regola_pesca', DDL_REGOLA);
    assicuraTabella(db, 'audit_pesca_138', DDL_AUDIT);
    const colonne = db.prepare("SELECT name,type,\"notnull\" AS obbligatorio,dflt_value FROM pragma_table_info('attivita','main')").all() as Array<{ name: string; type: string; obbligatorio: number; dflt_value: unknown }>;
    for (const [nome, ddl] of [
      ['pesca_regola_chiave', 'TEXT REFERENCES regola_pesca(chiave) ON DELETE RESTRICT'],
      ['pesca_ruolo', "TEXT CHECK(pesca_ruolo IS NULL OR pesca_ruolo IN ('visita','obiettivi'))"],
    ] as const) {
      const presente = colonne.find(c => c.name === nome);
      if (!presente) db.exec(`ALTER TABLE main.attivita ADD COLUMN ${nome} ${ddl}`);
      else if (presente.type !== 'TEXT' || presente.obbligatorio !== 0 || presente.dflt_value !== null) errore(`colonna ${nome} preesistente diversa dal contratto`);
    }
    const sqlAttivita = (db.prepare("SELECT sql FROM main.sqlite_master WHERE name='attivita' AND type='table'").get() as { sql: string }).sql;
    const fk = db.prepare("SELECT \"table\" AS padre,\"from\" AS figlio,\"to\" AS colonna,on_delete FROM pragma_foreign_key_list('attivita','main')").all() as Array<{ padre: string; figlio: string; colonna: string; on_delete: string }>;
    if (fk.filter(f => f.figlio === 'pesca_regola_chiave').length !== 1 || !fk.some(f => f.figlio === 'pesca_regola_chiave' && f.padre === 'regola_pesca' && f.colonna === 'chiave' && f.on_delete === 'RESTRICT')
      || !normalizzaDDL(sqlAttivita).includes(normalizzaDDL("pesca_ruolo TEXT CHECK(pesca_ruolo IS NULL OR pesca_ruolo IN ('visita','obiettivi'))"))) errore('vincoli delle colonne pesca diversi dal contratto');
    const audit = db.prepare('SELECT * FROM main.audit_pesca_138 WHERE id=1').get() as Riga | undefined;
    if (audit) {
      if (!auditValido(audit)) errore('audit preesistente non riconoscibile');
      if (firmaCestino(db) !== primaCestino) errore('Cestino modificato prima del replay dell’audit');
      return;
    }
    const adesso = new Date().toISOString();
    const regola = db.prepare('SELECT * FROM main.regola_pesca WHERE chiave=?').get(REGOLA_PESCA_138.chiave) as Riga | undefined;
    const regolaValida = !regola || identica(regola, { ...REGOLA_PESCA_138, updated_at: regola.updated_at }) && typeof regola.updated_at === 'string' && Number.isFinite(Date.parse(regola.updated_at));
    if (!regola) db.prepare('INSERT INTO main.regola_pesca(chiave,versione,nome,dati_json,fonti_json,origine,seed_json,updated_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(REGOLA_PESCA_138.chiave, REGOLA_PESCA_138.versione, REGOLA_PESCA_138.nome, REGOLA_PESCA_138.dati_json, REGOLA_PESCA_138.fonti_json, REGOLA_PESCA_138.origine, REGOLA_PESCA_138.seed_json, adesso);
    const correnti = CHIAVI.map(chiave => db.prepare('SELECT * FROM main.attivita WHERE chiave=?').get(chiave) as Riga | undefined);
    const copertura = coperturaCestino(db);
    const prima = correnti.map((r, i) => identica(r, ATTIVITA_PESCA_PRIMA_138[i]!));
    const dopo = correnti.map((r, i) => identica(r, ATTIVITA_PESCA_DOPO_138[i]!));
    let esito: Esito = 'esclusa', motivo = 'Firma RAW completa o provenienza diversa: gruppo operativo conservato.';
    if (correnti.some(r => !r)) { esito = 'assente'; motivo = 'Una delle due attività manca: nessuna ricreazione o collegamento parziale.'; }
    else if (!regolaValida) motivo = 'Regola preesistente diversa: nessuna sostituzione o collegamento operativo.';
    else if (!copertura.leggibile || copertura.pertinenti !== 0) motivo = 'Fotografie pertinenti o copertura Cestino incerta: intero gruppo conservato.';
    else if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type='trigger' AND tbl_name='attivita'").get()) motivo = 'Trigger sulle attività non previsto: nessuna bonifica indiretta.';
    else if (!dipendenza124(db)) motivo = 'Rendiconto124 o dipendenze di sede/quartiere/invito non attestati: gruppo conservato.';
    else if (prima.every((p, i) => p || dopo[i])) { esito = dopo.every(Boolean) ? 'gia-corretta' : 'rettificata'; motivo = 'Due firme complete e dipendenze attestate: collegamento atomico A02+A10, nessun dato personale inizializzato.'; }
    const attivita = CHIAVI.map((chiave, i) => ({ chiave, esito: esito === 'rettificata' || esito === 'gia-corretta' ? dopo[i] ? 'gia-corretta' : 'rettificata' : correnti[i] ? 'esclusa' : 'assente', motivo }));
    const risultanti = correnti.map((r, i) => esito === 'rettificata' ? ATTIVITA_PESCA_DOPO_138[i]! : r ?? null);
    // L'audit si registra prima di entrambi gli UPDATE. Un CAS fallito annulla anche schema e audit.
    if (db.prepare('INSERT INTO main.audit_pesca_138(id,versione,regola_chiave,esito,motivo,attivita_json,prima_json,dopo_json,copertura_json,creato_il) VALUES(1,1,?,?,?,?,?,?,?,?)')
      .run(REGOLA_PESCA_138.chiave, esito, motivo, JSON.stringify(attivita), JSON.stringify(correnti.map(r => r ?? null)), JSON.stringify(risultanti), JSON.stringify(copertura), adesso).changes !== 1) errore('audit non registrato');
    if (esito === 'rettificata') for (const [i, r] of correnti.entries()) {
      if (dopo[i]) continue;
      const attuale = r!, previsto = ATTIVITA_PESCA_DOPO_138[i]! as Riga;
      const campi = Object.keys(previsto).filter(c => attuale[c] !== previsto[c]);
      const identita = Object.keys(attuale);
      if (db.prepare(`UPDATE main.attivita SET ${campi.map(c => `${q(c)}=?`).join(',')} WHERE ${identita.map(c => `${q(c)} IS ?`).join(' AND ')}`)
        .run(...campi.map(c => previsto[c]), ...identita.map(c => attuale[c])).changes !== 1) errore(`CAS completo non riuscito per ${CHIAVI[i]}`);
    }
    if (firmaCestino(db) !== primaCestino) errore('righe o epoca Cestino modificate');
  },
};
