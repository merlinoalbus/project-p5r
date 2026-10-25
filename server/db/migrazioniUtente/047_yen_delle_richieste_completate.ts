// ============================================================
// Utente 047 — le proposte possono nascere da una Richiesta completata (L13, ondata 3, decisione 3)
// ============================================================
//
// Decisione 3 dell'utente (2026-10-25): «Ricompense di una Richiesta completata ripetute nella voce: le applica solo la Richiesta completata».
// Gli yen della Richiesta (`richiesta.yen`) nascono quindi come proposta «Applica» con il movimento registrato, come gli yen di una voce:
// la causa della proposta è la Richiesta (`causa_tipo = 'richiesta'`, `causa_chiave` = chiave della Richiesta). Il vocabolario chiuso di
// `utente.da_applicare.causa_tipo` (028, esteso a 'pesca' dalla 029) non la ammette: si allarga di quel solo valore.
//
// Come la 029, conservativa e verificata: la tabella si ricostruisce SOLO se la sua DDL è esattamente quella della 029 (nessun trigger,
// vista o chiave esterna entrante, gli stessi tre indici); le righe passano identiche (firma prima e dopo), con l'epoca AUTOINCREMENT e le
// statistiche degli indici conservate; ogni altra tabella resta com'era (firma). Nessuna riga nasce: le proposte delle Richieste le crea il
// servizio quando una Richiesta si completa. Se qualcosa non torna, la migrazione si ferma senza toccare nulla (la transazione si annulla).
// Idempotente: con la DDL già estesa non fa niente. `movimento_yen` e `beneficio_ciclo` non hanno un vocabolario chiuso della causa.
// ============================================================

import type { AppDatabase } from '../dbService.js';
import type { Migration } from '../migrationRunner.js';
import { firmaTabella, normalizzaDDL, oggetti } from './029_pesca.js';
import { ddlPropostePesca029, INDICI_PROPOSTE_029 } from './pesca029Schema.js';

const q = (nome: string) => `"${nome.replaceAll('"', '""')}"`;
const errore = (motivo: string): never => { throw new Error(`utente 047: ${motivo}; nessuna modifica applicata.`); };

const CAUSE_029 = "CHECK(causa_tipo IN ('acquisto','voce','pesca'))";
const CAUSE_047 = "CHECK(causa_tipo IN ('acquisto','voce','pesca','richiesta'))";

/** La DDL delle proposte dopo la 047: quella della 029 con la sola causa «richiesta» in più. */
export function ddlProposte047(nome: string): string {
  const base = ddlPropostePesca029(nome, true);
  if (!base.includes(CAUSE_029)) errore('vocabolario delle cause della 029 non trovato');
  return base.replace(CAUSE_029, CAUSE_047);
}

/** L'epoca AUTOINCREMENT delle proposte, verificata (una riga al più, interi sicuri, mai sotto l'id più alto). */
function epoca(db: AppDatabase): Array<{ rowid: number; seq: number }> {
  const righe = db.prepare("SELECT rowid,seq FROM utente.sqlite_sequence WHERE name='da_applicare'").all() as Array<{ rowid: number; seq: number }>;
  const massimo = (db.prepare('SELECT MAX(id) AS id FROM utente.da_applicare').get() as { id: number | null }).id;
  if (righe.length > 1 || (righe.length === 1 && (!Number.isSafeInteger(righe[0]!.rowid) || !Number.isSafeInteger(righe[0]!.seq) || righe[0]!.seq < 0 || righe[0]!.seq < (massimo ?? 0)))
    || (!righe.length && massimo !== null)) errore('epoca AUTOINCREMENT delle proposte non riconoscibile');
  return righe;
}

export const utente047: Migration = {
  id: 47,
  name: 'yen_delle_richieste_completate',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    const schema = oggetti(db);
    const tabella = schema.find((o) => o.type === 'table' && o.name === 'da_applicare');
    if (!tabella?.sql) errore('tabella delle proposte assente');
    // già estesa (una seconda esecuzione): niente da fare
    if (normalizzaDDL(tabella!.sql!) === normalizzaDDL(ddlProposte047('da_applicare'))) return;
    if (normalizzaDDL(tabella!.sql!) !== normalizzaDDL(ddlPropostePesca029('da_applicare', true))) errore('DDL delle proposte diverso da quello della 029');
    if (schema.some((o) => o.type === 'trigger' && o.tbl_name === 'da_applicare')) errore('trigger sulle proposte non previsto');
    if (schema.some((o) => (o.type === 'view' || o.type === 'trigger') && o.sql !== null
      && /(?:^|[^a-z0-9_])(?:"da_applicare"|da_applicare)(?:$|[^a-z0-9_])/i.test(o.sql))) errore('query correlata alle proposte non prevista');
    const indici = db.prepare('PRAGMA utente.index_list(da_applicare)').all() as Array<{ name: string; unique: number; origin: string; partial: number }>;
    if (indici.length !== 3) errore('insieme degli indici delle proposte diverso da quello della 029');
    let uid = 0;
    for (const indice of indici) {
      const campi = db.prepare('SELECT name FROM pragma_index_info(?,?) ORDER BY seqno').all(indice.name, 'utente') as Array<{ name: string }>;
      if (indice.origin === 'u' && indice.unique === 1 && indice.partial === 0 && JSON.stringify(campi.map((c) => c.name)) === '["uid"]') { uid++; continue; }
      const atteso = INDICI_PROPOSTE_029.find(([nome]) => nome === indice.name);
      const ddl = schema.find((o) => o.type === 'index' && o.name === indice.name)?.sql;
      if (!atteso || indice.origin !== 'c' || !ddl || normalizzaDDL(ddl) !== normalizzaDDL(atteso[1])) errore('indice delle proposte sconosciuto o modificato');
    }
    if (uid !== 1) errore('indice unico UID delle proposte assente');
    for (const t of schema.filter((o) => o.type === 'table')) {
      const fk = db.prepare('SELECT "table" AS padre FROM pragma_foreign_key_list(?,?)').all(t.name, 'utente') as Array<{ padre: string }>;
      if (fk.some((f) => f.padre.toLowerCase() === 'da_applicare')) errore('chiave esterna entrante sulle proposte non prevista');
    }
    if (schema.some((o) => o.name === 'da_applicare_047')) errore('nome temporaneo già occupato');

    // fotografia di tutto prima: le proposte (firma e epoca) e ogni altra tabella (firma), lo schema esterno alle proposte
    const colonne = (db.prepare('PRAGMA utente.table_info(da_applicare)').all() as Array<{ name: string }>).map((c) => c.name);
    const firmaPrima = firmaTabella(db, 'da_applicare', colonne), epocaPrima = epoca(db);
    const altre = schema.filter((o) => o.type === 'table' && o.name !== 'da_applicare' && !o.name.startsWith('sqlite_')).map((t) => {
      const c = (db.prepare('SELECT name FROM pragma_table_info(?,?) ORDER BY cid').all(t.name, 'utente') as Array<{ name: string }>).map((x) => x.name);
      return { nome: t.name, colonne: c, firma: firmaTabella(db, t.name, c) };
    });
    const esterni = (elenco: ReturnType<typeof oggetti>) => JSON.stringify(elenco.filter((o) => o.tbl_name !== 'da_applicare' && !o.name.startsWith('sqlite_')));
    const schemaEsternoPrima = esterni(schema);
    // DROP TABLE toglie anche le statistiche degli indici: si conservano com'erano (stessi dati e indici), senza ricalcolarle
    const statistiche = ['sqlite_stat1', 'sqlite_stat2', 'sqlite_stat3', 'sqlite_stat4']
      .filter((nome) => schema.some((o) => o.type === 'table' && o.name === nome))
      .map((nome) => {
        const campi = ['rowid', ...(db.prepare('SELECT name FROM pragma_table_info(?,?) ORDER BY cid').all(nome, 'utente') as Array<{ name: string }>).map((c) => c.name)];
        const righe = db.prepare(`SELECT ${campi.map(q).join(',')} FROM utente.${q(nome)} WHERE tbl='da_applicare' ORDER BY rowid`).raw().safeIntegers(true).all() as unknown[][];
        return { nome, campi, righe };
      });

    db.exec(`${ddlProposte047('utente.da_applicare_047')};
      INSERT INTO utente.da_applicare_047 (${colonne.map(q).join(',')}) SELECT ${colonne.map(q).join(',')} FROM utente.da_applicare;
      DROP TABLE utente.da_applicare;
      ALTER TABLE utente.da_applicare_047 RENAME TO da_applicare;`);
    for (const [, ddl] of INDICI_PROPOSTE_029) db.exec(ddl.replace('INDEX ', 'INDEX utente.'));
    for (const { nome, campi, righe } of statistiche) {
      const inserisci = db.prepare(`INSERT INTO utente.${q(nome)} (${campi.map(q).join(',')}) VALUES (${campi.map(() => '?').join(',')})`);
      for (const riga of righe) inserisci.run(...riga);
    }
    db.prepare("DELETE FROM utente.sqlite_sequence WHERE name='da_applicare'").run();
    // epoca() ha verificato gli interi sicuri: BigInt conserva INTEGER anche in seq (senza affinità; Number diventerebbe REAL)
    if (epocaPrima.length) db.prepare("INSERT INTO utente.sqlite_sequence(rowid,name,seq) VALUES(?,'da_applicare',?)").run(BigInt(epocaPrima[0]!.rowid), BigInt(epocaPrima[0]!.seq));

    // verifica: DDL nuova, righe ed epoca identiche, ogni altra tabella e lo schema esterno com'erano
    const dopo = oggetti(db);
    const ddlDopo = dopo.find((o) => o.type === 'table' && o.name === 'da_applicare')?.sql;
    if (!ddlDopo || normalizzaDDL(ddlDopo) !== normalizzaDDL(ddlProposte047('da_applicare'))
      || firmaTabella(db, 'da_applicare', colonne) !== firmaPrima || JSON.stringify(epoca(db)) !== JSON.stringify(epocaPrima)) errore('righe, DDL o epoca delle proposte non conservate integralmente');
    for (const [nome, ddl] of INDICI_PROPOSTE_029) {
      const ricreato = dopo.find((o) => o.type === 'index' && o.name === nome)?.sql;
      if (!ricreato || normalizzaDDL(ricreato) !== normalizzaDDL(ddl)) errore(`indice ${nome} non ricreato com'era`);
    }
    for (const t of altre) if (firmaTabella(db, t.nome, t.colonne) !== t.firma) errore(`righe di ${t.nome} non conservate`);
    if (esterni(dopo) !== schemaEsternoPrima) errore('oggetto esterno alle proposte alterato');
  },
};
