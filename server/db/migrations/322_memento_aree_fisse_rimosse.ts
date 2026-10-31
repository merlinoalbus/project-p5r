// ============================================================
// Migrazione 322 — le 8 planimetrie «Memento - aree fisse — Strutture che i Memento riusano» e i loro 19 pin tolti, nel Cestino (L13, O9-4)
// ============================================================
//
// Istruzione dell'utente (31 ottobre): «Planimetrie delle aree fisse dei Memento si possono rimuovere» e, dalla pagina Luoghi della guida,
// «Vanno tolte le seguenti: [le 8 planimetrie «Memento - aree fisse — Strutture che i Memento riusano»] si possono proprio rimuovere»
// (già il 30 ottobre: «Memento - aree fisse — Strutture che i Memento riusano si può rimuovere»).
//
// Dati di gioco (`gioco.db`), conservativa e idempotente. Le 8 mappe sono quelle lette sulla copia della produzione e sul pacchetto
// iniziale migrato (identiche): tipo «area», figlie di `dungeon-mementos`, senza Area, d'origine «seed», con l'immagine nativa come asset
// (`mappe/native/<chiave>`, ambito «mappe» di `immagine`, con le sue miniature in cache) e 19 pin del gioco (id 396-414) senza voci,
// immagini, destinazioni, pezzi né stati nelle partite. L'elenco è chiuso qui sotto: una mappa si toglie solo se è ancora quella
// (origine, nome, etichetta, genitore, dimensioni, asset, pin con id, uid, tipo e nome) e niente le resta collegato; altrimenti resta e
// l'audit dice perché.
//
// La strada è quella delle rimozioni dell'app: una riga del Cestino per mappa (`conCestino`, tipo «mappa», con lo stesso nome e contesto
// che darebbe la pagina), dentro la quale lavora `eliminaMappa` (stati dei pin, voci riallineate, percorsi delle mappe ricalcolati). In
// più, nello stesso registro, l'asset predefinito della mappa con le sue miniature (che `eliminaMappa` non tocca: toglie solo l'immagine
// caricata, ambito «mappa»): così il ripristino dal Cestino rimette mappa, pin, asset, miniature e percorso insieme. Durante le migrazioni
// il runner spegne le chiavi esterne, e le cascate di `eliminaMappa` non scatterebbero: i figli (miniature, asset, pin, alias,
// presentazione, percorso) si tolgono qui in modo esplicito, PRIMA della mappa, come li annoterebbe la cascata (figlio prima del
// genitore): il ripristino, che riapplica il registro al contrario, rimette così prima la mappa e poi i figli. La rimozione si scrive
// solo con i servizi, quindi solo se la connessione della migrazione è quella dei servizi (`getDb()`, come la 241); su un'altra
// connessione nessuna scrittura, e l'audit lo dice.
//
// Controlli (uno che non torna annulla tutto): dopo, delle mappe tolte nessuna riga in nessuna tabella dei due file (chiave, asset,
// percorso pubblico, uid e id dei pin), fuori dal Cestino e dagli archivi storici e dagli audit di `dati_guida` (l'archivio
// «archivio-legami-e-presentazione-mappe-l11» resta com'è: è storia); le altre mappe, i loro pin, percorsi e presentazioni identici, i
// loro alias tutti al loro posto (gli unici nuovi possono essere quelli che il ricalcolo dei percorsi aggiunge per regola: il percorso
// corrente di una mappa che non lo aveva ancora fra i suoi alias, e l'audit li elenca); lo schema `utente` identico. Audit in `dati_guida.audit-322-memento-aree-fisse`, scritto al primo giro e poi solo se un giro
// toglie qualcosa; annota anche quante righe dei registri del Cestino già presenti citano le mappe tolte (sono righe derivate dei
// percorsi: al ripristino di quegli elementi si saltano e i percorsi si ricalcolano, `DERIVATE` di `cestinoService`).
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import { getDb, type AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { eliminaMappa } from '../../services/mappe/mappeService.js';
import { conCestino } from '../../services/cestinoService.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-322-memento-aree-fisse';
const GENITORE = 'dungeon-mementos';
const BASE = 'Memento - aree fisse — Strutture che i Memento riusano';
const AMBITO_ASSET = 'mappe';
const errore = (motivo: string): never => { throw new Error(`322: ${motivo}; nessuna modifica applicata.`); };

/** Un pin com'è nel gioco: id, identità stabile, tipo e nome. */
type PinAtteso = readonly [id: number, uid: string, tipo: string, nome: string];
interface MappaAttesa { chiave: string; etichetta: string; larghezza: number; altezza: number; percorso: string; pin: readonly PinAtteso[] }

/** Le 8 mappe e i loro 19 pin come sono (letti il 31/10 sulla copia della produzione e sul pacchetto iniziale migrato). */
const MAPPE: readonly MappaAttesa[] = [
  { chiave: 'nativo-rmap-190-1-0', etichetta: 'tela quadrata, disegno minuto — la meno estesa', larghezza: 512, altezza: 512,
    percorso: 'memento-memento-aree-fisse-strutture-che-i-memento-riusano', pin: [
      [396, '98080310d1b0a08ce304315ab1b98191', 'uscita', 'Uscita'],
      [397, 'f07352fe705a73c6422ae28f661654d3', 'nota', 'Da identificare (tipo 20) — minimappa: Velluto'],
      [398, 'ca1db171aec6655f389fec562431f9f2', 'passaggio', 'Passaggio'],
    ] },
  { chiave: 'nativo-rmap-190-2-0', etichetta: 'tela quadrata, disegno medio — la più estesa', larghezza: 512, altezza: 512,
    percorso: 'memento-memento-aree-fisse-strutture-che-i-memento-riusano-tela-quadrata-disegno-medio-la-piu-estesa', pin: [
      [399, 'b6f9d5171453278f4f214c321a9585ae', 'scala', 'Salita'],
      [400, 'ee8850f98b6e1d31ccb35d6e4200eae2', 'scala', 'Discesa'],
      [401, 'ffd287e210637c5ba683aecd58d240a4', 'porta', 'Porta'],
      [402, '5f374d1ef30fb665813d966fd1b08410', 'timbro', 'Timbro dei Memento'],
      [403, 'eb9687fc7c578fe5900735b4111bc0e5', 'timbro', 'Timbro dei Memento'],
    ] },
  { chiave: 'nativo-rmap-190-3-0', etichetta: 'tela quadrata, disegno medio — la meno estesa', larghezza: 512, altezza: 512,
    percorso: 'memento-memento-aree-fisse-strutture-che-i-memento-riusano-tela-quadrata-disegno-medio-la-meno-estesa', pin: [
      [404, '02915fbdd4014a32b38fc5636f1373c8', 'scala', 'Salita'],
      [405, '1f510528e6200c4332b5e394e5bd1527', 'scala', 'Discesa'],
      [406, 'b1771ed1fe1ee484a26e9554f0072f1a', 'porta', 'Porta'],
      [407, 'ab5d00b9feccb3a8aaa3ff2cae32d55f', 'nota', 'Da identificare (tipo 5) — minimappa: destinazione, punto di blocco cognitivo'],
      [408, '2f890c6891ed30835bd571098465f0c4', 'timbro', 'Timbro dei Memento'],
      [409, '5d1f5e35eef0e9be68b021bbf78a8f1e', 'timbro', 'Timbro dei Memento'],
    ] },
  { chiave: 'nativo-rmap-190-51-0', etichetta: 'tela alta, disegno minuto', larghezza: 256, altezza: 1024,
    percorso: 'memento-memento-aree-fisse-strutture-che-i-memento-riusano-tela-alta-disegno-minuto', pin: [
      [410, 'af67206f54605963d4c04926a0436a19', 'sicura', 'Stanza sicura'],
      [411, '4cbb974ce652accc7de4179f1e8537e9', 'scala', 'Salita'],
      [412, 'faba2415079cc333cd132a1b71d02da2', 'scala', 'Discesa'],
      [413, '572741222e6c6833bc251d1f033c5fc9', 'scala', 'Discesa'],
      [414, '319665605f480358174da0190a2f947f', 'scala', 'Salita'],
    ] },
  { chiave: 'nativo-rmap-190-61-0', etichetta: 'tela alta, disegno medio — la più estesa', larghezza: 256, altezza: 1024,
    percorso: 'memento-memento-aree-fisse-strutture-che-i-memento-riusano-tela-alta-disegno-medio-la-piu-estesa', pin: [] },
  { chiave: 'nativo-rmap-190-62-0', etichetta: 'tela alta, disegno medio — la meno estesa', larghezza: 256, altezza: 1024,
    percorso: 'memento-memento-aree-fisse-strutture-che-i-memento-riusano-tela-alta-disegno-medio-la-meno-estesa', pin: [] },
  { chiave: 'nativo-rmap-192-62-0', etichetta: 'tela quadrata, disegno esteso', larghezza: 1024, altezza: 1024,
    percorso: 'memento-memento-aree-fisse-strutture-che-i-memento-riusano-tela-quadrata-disegno-esteso', pin: [] },
  { chiave: 'nativo-rmap-195-11-0', etichetta: 'tela quadrata, disegno minuto — la più estesa', larghezza: 2048, altezza: 2048,
    percorso: 'memento-memento-aree-fisse-strutture-che-i-memento-riusano-tela-quadrata-disegno-minuto-la-piu-estesa', pin: [] },
];
/** Il nome che l'estrattore ha dato a ciascuna: la prima porta il solo nome della struttura, le altre anche l'etichetta. */
const nomeDi = (m: MappaAttesa, indice: number): string => indice === 0 ? BASE : `${BASE} — ${m.etichetta}`;
const chiaveAsset = (chiave: string): string => `native/${chiave}`;

type Schema = 'main' | 'utente';
const conUtente = (db: AppDatabase): boolean => (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
const schemi = (db: AppDatabase): Schema[] => (conUtente(db) ? ['main', 'utente'] : ['main']);
const tabelleDi = (db: AppDatabase, schema: Schema): string[] =>
  (db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as Array<{ name: string }>).map((r) => r.name);
const colonneDi = (db: AppDatabase, schema: Schema, tabella: string): string[] =>
  (db.prepare('SELECT name FROM pragma_table_info(?, ?)').all(tabella, schema) as Array<{ name: string }>).map((c) => c.name);
const chiaviEsterne = (db: AppDatabase, schema: Schema, tabella: string): Array<{ da: string; verso: string }> =>
  db.prepare('SELECT "from" AS da, "table" AS verso FROM pragma_foreign_key_list(?, ?)').all(tabella, schema) as Array<{ da: string; verso: string }>;
const q = (nome: string): string => `"${nome.replace(/"/g, '""')}"`;
const segnaposto = (n: number): string => Array.from({ length: n }, () => '?').join(',');
/** Le tabelle del Cestino: la rimozione sta lì, per il ripristino. */
const delCestino = (schema: Schema, t: string): boolean => (schema === 'main' && t === 'cestino') || (schema === 'utente' && t === 'cestino_partite');

/** L'impronta di tutto lo schema `utente` (schema e righe), o null se non è attaccato: dopo la migrazione deve essere identica. */
function improntaPartite(db: AppDatabase): string | null {
  if (!conUtente(db)) return null;
  const h = createHash('sha256');
  for (const r of db.prepare('SELECT type, name, sql FROM utente.sqlite_master ORDER BY type, name').all() as Array<{ type: string; name: string; sql: string | null }>) {
    h.update(`${r.type}|${r.name}|${r.sql}\n`);
    if (r.type === 'table') for (const x of db.prepare(`SELECT * FROM utente.${q(r.name)}`).iterate()) h.update(JSON.stringify(x) + '\n');
  }
  return h.digest('hex');
}

/**
 * L'impronta delle righe dell'albero delle mappe che NON riguardano le 8 mappe dell'elenco: dopo deve essere identica. Gli alias si
 * controllano a parte (`aliasDelleAltre`): il ricalcolo dei percorsi (`sincronizzaPercorsiMappe`, dentro `eliminaMappa`) annota come
 * alias di ogni mappa il suo percorso corrente, se manca.
 */
function improntaAltreMappe(db: AppDatabase): string {
  const fuori = MAPPE.map((m) => m.chiave);
  const h = createHash('sha256');
  const letture: Array<[string, string]> = [
    ['mappa', `SELECT * FROM main.mappa WHERE chiave NOT IN (${segnaposto(fuori.length)}) ORDER BY chiave`],
    ['spillo', `SELECT * FROM main.spillo WHERE mappa_chiave IS NULL OR mappa_chiave NOT IN (${segnaposto(fuori.length)}) ORDER BY id`],
    ['mappa_percorso', `SELECT * FROM main.mappa_percorso WHERE mappa_chiave NOT IN (${segnaposto(fuori.length)}) ORDER BY mappa_chiave`],
    ['mappa_presentazione', `SELECT * FROM main.mappa_presentazione WHERE mappa_chiave NOT IN (${segnaposto(fuori.length)}) ORDER BY mappa_chiave`],
  ];
  for (const [t, sql] of letture) {
    if (!esisteTabella(db, t)) continue;
    h.update(`#${t}\n`);
    for (const r of db.prepare(sql).iterate(...fuori)) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

/** Gli alias delle mappe fuori dall'elenco, come «chiave→mappa». */
function aliasDelleAltre(db: AppDatabase): Set<string> {
  if (!esisteTabella(db, 'mappa_alias')) return new Set();
  const fuori = MAPPE.map((m) => m.chiave);
  return new Set((db.prepare(`SELECT chiave, mappa_chiave FROM main.mappa_alias WHERE mappa_chiave NOT IN (${segnaposto(fuori.length)})`).all(...fuori) as Array<{ chiave: string; mappa_chiave: string }>)
    .map((r) => `${r.chiave}→${r.mappa_chiave}`));
}

/**
 * Gli alias delle altre mappe dopo la rimozione: nessuno tolto o cambiato; gli unici nuovi sono quelli che il ricalcolo dei percorsi
 * aggiunge per regola (il percorso corrente della mappa, se non era ancora fra i suoi alias). Restituisce i nuovi; un altro cambio annulla.
 */
function aliasAggiuntiDalRicalcolo(db: AppDatabase, prima: ReadonlySet<string>): string[] {
  const dopo = aliasDelleAltre(db);
  for (const a of prima) if (!dopo.has(a)) errore(`l'alias ${a} di un'altra mappa è sparito`);
  const nuovi = [...dopo].filter((a) => !prima.has(a)).sort();
  const percorsoDi = db.prepare('SELECT chiave FROM main.mappa_percorso WHERE mappa_chiave = ?').pluck();
  for (const a of nuovi) {
    const [chiave, mappa] = a.split('→');
    if (percorsoDi.get(mappa) !== chiave) errore(`l'alias nuovo ${a} non è il percorso corrente della sua mappa`);
  }
  return nuovi;
}

/**
 * Le righe che resterebbero legate alla mappa (o ai suoi pin) dopo la rimozione: figli per chiave esterna verso `mappa` (mappe figlie
 * comprese) o verso `spillo` in qualunque tabella del file di gioco, colonne `spillo_id`/`spillo_arrivo_id`/`spillo_uid` nei due file
 * (gli stati delle partite), colonne che nominano una mappa senza chiave esterna (ingressi dei quartieri, regole d'atterraggio,
 * planimetrie predefinite o iniziali). Le tabelle che la rimozione stessa toglie (pin, alias, percorso, presentazione) non contano.
 */
function legamiDellaMappa(db: AppDatabase, chiave: string, id: readonly number[], uid: readonly string[]): string[] {
  const proprie = new Set(['spillo', 'mappa_alias', 'mappa_percorso', 'mappa_presentazione']);
  const trovate: string[] = [];
  const conta = (schema: Schema, t: string, c: string, valori: readonly unknown[]): void => {
    if (!valori.length) return;
    const n = db.prepare(`SELECT COUNT(*) FROM ${schema}.${q(t)} WHERE ${q(c)} IN (${segnaposto(valori.length)})`).pluck().get(...valori) as number;
    if (n) trovate.push(`${schema}.${t}.${c}=${n}`);
  };
  for (const schema of schemi(db)) {
    for (const t of tabelleDi(db, schema)) {
      if (delCestino(schema, t)) continue;
      const colonne = colonneDi(db, schema, t);
      const fk = chiaviEsterne(db, schema, t);
      for (const f of fk) {
        if (f.verso === 'mappa' && !(proprie.has(t) && f.da === 'mappa_chiave')) conta(schema, t, f.da, [chiave]);
        if (f.verso === 'spillo') conta(schema, t, f.da, id);
      }
      const giaContate = new Set(fk.filter((f) => f.verso === 'mappa' || f.verso === 'spillo').map((f) => f.da));
      for (const c of colonne.filter((x) => !giaContate.has(x))) {
        if (c === 'spillo_id' || c === 'spillo_arrivo_id') conta(schema, t, c, id);
        else if (c === 'spillo_uid') conta(schema, t, c, uid);
        else if (/(^|_)mappa(_chiave)?$|^planimetria/.test(c) && !(proprie.has(t) && c === 'mappa_chiave')) conta(schema, t, c, [chiave]);
      }
    }
  }
  return trovate;
}

/**
 * Il censimento finale: le righe di qualunque tabella dei due file che nominano ancora, in una colonna di testo, una delle mappe tolte
 * (chiave, asset, percorso pubblico) o uno dei loro pin (uid), o che hanno l'id di uno dei loro pin in una colonna di pin. Fuori conto il
 * Cestino (la rimozione sta lì, per il ripristino) e gli archivi storici e gli audit di `dati_guida` (sono storia).
 */
function censimento(db: AppDatabase, aghi: readonly string[], id: readonly number[]): string[] {
  const trovate: string[] = [];
  if (!aghi.length) return trovate;
  for (const schema of schemi(db)) {
    for (const t of tabelleDi(db, schema)) {
      if (delCestino(schema, t)) continue;
      const fuoriStoria = schema === 'main' && t === 'dati_guida' ? " AND chiave NOT LIKE 'archivio-%' AND chiave NOT LIKE 'audit-%'" : '';
      const versoPin = new Set(chiaviEsterne(db, schema, t).filter((f) => f.verso === 'spillo').map((f) => f.da));
      for (const c of colonneDi(db, schema, t)) {
        const testo = aghi.map(() => `instr(${q(c)}, ?) > 0`).join(' OR ');
        let n = db.prepare(`SELECT COUNT(*) FROM ${schema}.${q(t)} WHERE typeof(${q(c)}) = 'text' AND (${testo})${fuoriStoria}`).pluck().get(...aghi) as number;
        if (id.length && (versoPin.has(c) || c === 'spillo_id' || c === 'spillo_arrivo_id')) {
          n += db.prepare(`SELECT COUNT(*) FROM ${schema}.${q(t)} WHERE ${q(c)} IN (${segnaposto(id.length)})`).pluck().get(...id) as number;
        }
        if (n) trovate.push(`${schema}.${t}.${c}=${n}`);
      }
    }
  }
  return trovate;
}

/** Quante righe dei registri del Cestino già presenti (fino all'id dato) citano le mappe tolte, per tabella e operazione (solo lettura). */
function citazioniNelCestino(db: AppDatabase, aghi: readonly string[], finoA: number): Array<{ cestino: number; tipo: string; chiave: string; passi: Record<string, number> }> {
  if (!aghi.length) return [];
  const righe = db.prepare(`SELECT id, tipo, chiave, registro_json FROM main.cestino WHERE id <= ? AND (${aghi.map(() => 'instr(registro_json, ?) > 0').join(' OR ')}) ORDER BY id`)
    .all(finoA, ...aghi) as Array<{ id: number; tipo: string; chiave: string; registro_json: string }>;
  return righe.map((r) => {
    const passi: Record<string, number> = {};
    for (const p of JSON.parse(r.registro_json) as Array<{ tabella: string; op: string; prima?: unknown; dopo?: unknown }>) {
      const s = JSON.stringify([p.prima ?? null, p.dopo ?? null]);
      if (aghi.some((a) => s.includes(a))) passi[`${p.tabella}:${p.op}`] = (passi[`${p.tabella}:${p.op}`] ?? 0) + 1;
    }
    return { cestino: r.id, tipo: r.tipo, chiave: r.chiave, passi };
  });
}

interface RigaMappa322 {
  chiave: string; nome: string; tipo: string; genitore_chiave: string | null; area_chiave: string | null; origine: string;
  versione_etichetta: string | null; larghezza: number | null; altezza: number | null; asset: string | null; immagine_chiave: string | null;
}

/** Perché la mappa non si toglie (null se va tolta): non è più quella dell'elenco, o ha qualcosa che la rimozione lascerebbe orfano. */
function problemaDellaMappa(db: AppDatabase, m: MappaAttesa, indice: number, r: RigaMappa322): string | null {
  const asset = `${AMBITO_ASSET}/${chiaveAsset(m.chiave)}`;
  if (r.origine !== 'seed') return `la mappa non è più del gioco (origine «${r.origine}»): l'ha cambiata l'utente`;
  if (r.nome !== nomeDi(m, indice)) return `il nome è «${r.nome}» invece di «${nomeDi(m, indice)}»`;
  if ((r.versione_etichetta ?? '') !== m.etichetta) return `l'etichetta è «${r.versione_etichetta ?? ''}» invece di «${m.etichetta}»`;
  if (r.tipo !== 'area' || r.genitore_chiave !== GENITORE || r.area_chiave !== null) {
    return `non è più una mappa dei Memento senza Area (tipo ${r.tipo}, genitore ${r.genitore_chiave ?? '—'}, Area ${r.area_chiave ?? '—'})`;
  }
  if (r.larghezza !== m.larghezza || r.altezza !== m.altezza) return `le dimensioni sono ${r.larghezza ?? '—'}×${r.altezza ?? '—'} invece di ${m.larghezza}×${m.altezza}`;
  if (r.asset !== asset) return `l'asset è «${r.asset ?? '—'}» invece di «${asset}»`;
  if (r.immagine_chiave !== null || db.prepare("SELECT 1 FROM main.immagine WHERE ambito = 'mappa' AND chiave = ?").get(m.chiave)) return 'la mappa ha un\'immagine caricata dall\'utente';
  const pin = db.prepare('SELECT id, uid, tipo, nome, origine FROM main.spillo WHERE mappa_chiave = ? ORDER BY id').all(m.chiave) as Array<{ id: number; uid: string | null; tipo: string; nome: string; origine: string }>;
  if (JSON.stringify(pin.map((p) => [p.id, p.uid, p.tipo, p.nome, p.origine])) !== JSON.stringify(m.pin.map(([id, uid, tipo, nome]) => [id, uid, tipo, nome, 'seed']))) {
    return `i pin non sono più quelli del gioco (${pin.length} invece di ${m.pin.length}, o con identità, tipo o nome cambiati)`;
  }
  const altriConAsset = db.prepare('SELECT chiave FROM main.mappa WHERE asset = ? AND chiave <> ?').pluck().all(asset, m.chiave) as string[];
  if (altriConAsset.length) return `l'asset è usato anche da ${altriConAsset.join(', ')}`;
  const legami = legamiDellaMappa(db, m.chiave, m.pin.map((p) => p[0]), m.pin.map((p) => p[1]));
  if (legami.length) return `la mappa o i suoi pin hanno dati collegati (${legami.join(', ')}): serve la rimozione ordinaria dell'app`;
  return null;
}

export const migration322: Migration = {
  id: 322,
  name: 'memento_aree_fisse_rimosse',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['mappa', 'spillo', 'immagine', 'cestino', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 322, tabella: t }, 'tabella assente: aree fisse dei Memento non toccate'); return; }
    }
    const stessaConnessione = (() => { try { return getDb() === db; } catch { return false; } })();
    const adesso = new Date().toISOString();
    const partitePrima = improntaPartite(db);
    const altrePrima = improntaAltreMappe(db);
    const aliasPrima = aliasDelleAltre(db);
    const ultimoCestino = db.prepare('SELECT COALESCE(MAX(id), 0) FROM main.cestino').pluck().get() as number;
    const conMiniature = esisteTabella(db, 'immagine_miniatura');

    const esiti: Array<{ chiave: string; esito: string; pin?: number; asset?: { id: number; byte: number; miniature: number } | null; cestino?: number }> = [];
    const tolte: MappaAttesa[] = [];
    MAPPE.forEach((m, indice) => {
      const r = db.prepare(`SELECT chiave, nome, tipo, genitore_chiave, area_chiave, origine, versione_etichetta, larghezza, altezza, asset, immagine_chiave
          FROM main.mappa WHERE chiave = ?`).get(m.chiave) as RigaMappa322 | undefined;
      const asset = db.prepare('SELECT id, byte FROM main.immagine WHERE ambito = ? AND chiave = ?').get(AMBITO_ASSET, chiaveAsset(m.chiave)) as { id: number; byte: number } | undefined;
      if (!r) {
        esiti.push({ chiave: m.chiave, esito: asset ? 'mappa già assente; il suo asset è rimasto e non si tocca senza la sua mappa' : 'già tolta' });
        return;
      }
      const problema = problemaDellaMappa(db, m, indice, r);
      if (problema) { esiti.push({ chiave: m.chiave, esito: `${problema}: resta` }); return; }
      if (!stessaConnessione) { esiti.push({ chiave: m.chiave, esito: 'connessione diversa da quella dei servizi: nessuna scrittura (la rimozione si fa solo con i servizi, nel Cestino)' }); return; }

      const miniature = asset && conMiniature ? db.prepare('SELECT COUNT(*) FROM main.immagine_miniatura WHERE immagine_id = ?').pluck().get(asset.id) as number : 0;
      const genitore = (db.prepare('SELECT nome FROM main.mappa WHERE chiave = ?').get(GENITORE) as { nome: string } | undefined)?.nome ?? '';
      // una riga del Cestino per mappa, con lo stesso elemento che darebbe la pagina (`eliminaMappa`): la registrazione di `eliminaMappa`,
      // dentro questa, non ne apre un'altra. Figli prima del genitore, come li annoterebbe la cascata (vedi l'intestazione).
      conCestino({ tipo: 'mappa', chiave: m.chiave, nome: r.nome, contesto: genitore }, () => {
        if (asset) {
          if (conMiniature) db.prepare('DELETE FROM main.immagine_miniatura WHERE immagine_id = ?').run(asset.id);
          db.prepare('DELETE FROM main.immagine WHERE id = ?').run(asset.id);
        }
        db.prepare('DELETE FROM main.spillo WHERE mappa_chiave = ?').run(m.chiave);
        for (const t of ['mappa_alias', 'mappa_presentazione', 'mappa_percorso']) {
          if (esisteTabella(db, t)) db.prepare(`DELETE FROM main.${t} WHERE mappa_chiave = ?`).run(m.chiave);
        }
        eliminaMappa(m.chiave);
      });
      if (db.prepare('SELECT 1 FROM main.mappa WHERE chiave = ?').get(m.chiave)) errore(`la mappa ${m.chiave} è ancora lì`);
      const riga = db.prepare("SELECT id FROM main.cestino WHERE tipo = 'mappa' AND chiave = ? AND id > ? ORDER BY id DESC LIMIT 1").pluck().get(m.chiave, ultimoCestino) as number | undefined;
      if (riga === undefined) errore(`la mappa ${m.chiave} non ha la sua riga nel Cestino`);
      tolte.push(m);
      esiti.push({ chiave: m.chiave, esito: 'tolta (nel Cestino)', pin: m.pin.length, asset: asset ? { ...asset, miniature } : null, cestino: riga });
    });
    // mappe tolte: le letture in memoria dei servizi si svuotano, così le prime letture dopo l'avvio non le vedono più
    if (tolte.length) invalidaCacheDiGioco();

    // ---- controlli
    if (partitePrima !== null && improntaPartite(db) !== partitePrima) errore('lo schema delle partite è cambiato');
    if (improntaAltreMappe(db) !== altrePrima) errore('le altre mappe, i loro pin, percorsi o presentazioni sono cambiati');
    const aliasNuovi = aliasAggiuntiDalRicalcolo(db, aliasPrima);
    const aghi = tolte.flatMap((m) => [m.chiave, m.percorso, ...m.pin.map((p) => p[1])]);
    const residui = censimento(db, aghi, tolte.flatMap((m) => m.pin.map((p) => p[0])));
    if (residui.length) errore(`restano righe che nominano le mappe tolte o i loro pin (${residui.join(', ')})`);

    // ---- audit: al primo giro sempre; poi solo se un giro toglie qualcosa
    const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
    if (vecchio && !tolte.length) return;
    const esecuzione = {
      il: adesso, stessaConnessione,
      conteggi: {
        mappe: MAPPE.length, tolte: tolte.length, pinTolti: tolte.reduce((n, m) => n + m.pin.length, 0),
        restano: esiti.filter((e) => e.esito.endsWith(': resta')).length,
      },
      esiti,
      // il ricalcolo dei percorsi dell'app annota come alias il percorso corrente di una mappa che non lo aveva ancora (nel registro del Cestino)
      aliasAggiuntiDalRicalcolo: aliasNuovi,
      registriDelCestinoCheLeCitano: citazioniNelCestino(db, aghi, ultimoCestino),
      nota: 'Le righe dei registri già nel Cestino che citano le mappe tolte sono percorsi delle mappe (derivati): ripristinando quegli elementi si saltano e i percorsi si ricalcolano. L’archivio «archivio-legami-e-presentazione-mappe-l11» resta com’è (storia).',
    };
    const esecuzioni = vecchio ? (JSON.parse(vecchio) as { esecuzioni?: unknown[] }).esecuzioni ?? [] : [];
    db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
      .run(AUDIT, JSON.stringify({ migrazione: 322, lotto: 'L13 O9-4', istruzione: 'Planimetrie delle aree fisse dei Memento si possono rimuovere', esecuzioni: [...esecuzioni, esecuzione] }));
    logger.info({ migrazione: 322, ...esecuzione.conteggi }, 'Memento: aree fisse tolte, nel Cestino');
  },
};
