// ============================================================
// cestinoService — il cestino: ciò che si elimina dalla guida e dalle mappe si può rimettere (migrazioni 104 e utente 021)
// ============================================================
//
// Richiesta dell'utente (2026-10-16), dopo che tre aree del Palazzo di Madarame eliminate per errore si sono dovute ricostruire a
// mano dal WAL di produzione: «Cestino con ripristino», per le aree dei Palazzi, le voci della guida, le planimetrie e le aree dei
// dedali; il cestino sta in Impostazioni e si svuota solo a mano.
//
// **Come si registra un'eliminazione** (`conCestino`). Le eliminazioni toccano molte tabelle, in due file, con cascate e
// riallineamenti (le spunte, i pin, i legami con le planimetrie, l'ordine delle aree che seguono, …), e cambiano col tempo:
// un elenco scritto a mano delle righe da salvare resterebbe indietro. Si fa invece come SQLite stesso col WAL: per la durata
// della transazione dell'eliminazione, trigger temporanei su **ogni** tabella dei due file chiamano una funzione che annota la
// riga com'era prima e com'è diventata (DELETE, UPDATE, INSERT, cascate comprese: i trigger scattano anche sulle righe tolte da
// `ON DELETE CASCADE`), con i BLOB intatti. A transazione chiusa il registro sta in `main.cestino` (righe del file di gioco) e in
// `utente.cestino_partite` (righe delle partite), e i trigger non ci sono più. `recursive_triggers` è acceso per la durata:
// senza, una `INSERT OR REPLACE` che toglie una riga non farebbe scattare il trigger della cancellazione.
//
// **Come si rimette** (`ripristinaDalCestino`). Il registro si riapplica al contrario, in una transazione: le righe tolte si
// reinseriscono (prima i genitori: nelle cascate il figlio è annotato prima del genitore), quelle cambiate tornano com'erano,
// quelle aggiunte se ne vanno. Quel che è successo **dopo** l'eliminazione vince:
//   - di una riga cambiata dall'eliminazione tornano com'erano le sole colonne che l'eliminazione aveva cambiato e nessuno ha
//     toccato dopo (una mappa figlia rinominata dopo torna sotto la sua mappa, col nome nuovo); una colonna toccata di nuovo
//     resta com'è, e l'esito lo dice; una riga aggiunta dall'eliminazione e toccata dopo resta;
//   - una riga del file di gioco da reinserire con la chiave ormai presa da un'altra riga blocca tutto (409, con l'elenco):
//     rimetterla vorrebbe dire sovrascrivere qualcosa di nuovo; nelle partite, invece, lo stato di dopo resta e l'esito lo dice;
//     così anche nelle tabelle che l'app ricalcola da sé (`DERIVATE`: i percorsi delle mappe), che poi si ricalcolano;
//   - una riga che punta a qualcosa che non c'è più (un pin o una planimetria eliminati dopo) non si rimette, e l'esito lo dice.
// Se alla fine l'elemento stesso non c'è (la sua riga non è tornata), non si rimette niente. Dopo, il servizio dell'elemento
// può rimettere a posto ciò che dipende da lui (`registraRipristinoCestino`: l'ordine delle aree, i percorsi delle mappe) e le
// cache dei dati di gioco si svuotano. Per l'ordine conta dove stava: l'eliminazione annota le chiavi dei suoi **vicini**
// (`ElementoCestino.vicini`), perché il vecchio numero d'ordine non dice più niente se nel frattempo altre righe si sono spostate.
// ============================================================

import { randomBytes } from 'node:crypto';
import { getDb, nowIso, type AppDatabase } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { invalidaCacheDiGioco } from './cacheDiGioco.js';
import { riallineaStati } from './mappe/statiGuida.js';
import type { ContenutoCestinoDto, EsitoRipristinoCestinoDto, MotivoSaltataCestinoDto, SaltataCestinoDto, TipoCestino, VoceCestinoDto } from '../../shared/types.js';

type Schema = 'main' | 'utente';
type Operazione = 'D' | 'U' | 'I';
/** Un valore com'è salvato nel registro: i BLOB in base64, il resto com'è. */
type Valore = string | number | null | { $blob: string };
type Riga = Record<string, Valore>;
/** Un passo del registro: la riga com'era (`prima`, per D e U) e com'è diventata (`dopo`, per U e I). */
interface Passo { seq: number; tabella: string; op: Operazione; prima?: Riga; dopo?: Riga }

/** Le chiavi di ciò che stava subito prima e subito dopo l'elemento nel suo elenco (null se era il primo, o l'ultimo). */
export interface ViciniCestino { prima: string | null; dopo: string | null }

/** I tipi di elemento che il server mette nel cestino (da L5, migrazione 115, anche il luogo e il negozio). */
export type TipoElementoCestino = TipoCestino;

/** L'elemento che si elimina, per l'elenco del cestino; `vicini` per rimetterlo al suo posto (aree, voci). */
export interface ElementoCestino { tipo: TipoElementoCestino; chiave: string; nome: string; contesto?: string; vicini?: ViciniCestino }

/** Le tabelle del cestino stesso non si registrano. */
const ESCLUSE: Record<Schema, ReadonlySet<string>> = { main: new Set(['cestino']), utente: new Set(['cestino_partite']) };

/** La riga che è l'elemento: se dopo il ripristino non c'è, non si è rimesso niente. */
const RADICE: Record<TipoElementoCestino, { tabella: string; colonna: string }> = {
  area: { tabella: 'dungeon_area', colonna: 'chiave' },
  voce: { tabella: 'punto_interesse', colonna: 'chiave' },
  mappa: { tabella: 'mappa', colonna: 'chiave' },
  'area-dedalo': { tabella: 'area_dedalo', colonna: 'chiave' },
  // un'Area del mondo con le sue planimetrie (L2, migrazione 109)
  'area-fisica': { tabella: 'area', colonna: 'chiave' },
  // L5 (migrazione 115): un luogo con i suoi pin, un negozio con articoli, acquisti e punti
  luogo: { tabella: 'luogo', colonna: 'chiave' },
  negozio: { tabella: 'negozio', colonna: 'chiave' },
  // L6 (R6-04): una Richiesta dei Mementos; le condizioni che la citano restano (per chiave) e danno «Richiesta eliminata»
  richiesta: { tabella: 'richiesta', colonna: 'chiave' },
};

/**
 * Come si chiamano per l'utente le righe che un'eliminazione si porta via, al singolare e al plurale («1 infiltrazione»,
 * «7 voci della guida»); le altre tabelle col loro nome.
 */
const ETICHETTE: Record<string, readonly [uno: string, molti: string]> = {
  dungeon_area: ['infiltrazione', 'infiltrazioni'], punto_interesse: ['voce della guida', 'voci della guida'],
  marcatore_mappa: ['segnaposto di una voce', 'segnaposto delle voci'], spillo: ['pin', 'pin'], spillo_voce: ['collegamento pin-voce', 'collegamenti pin-voce'],
  spillo_immagine: ['schermata di un pin', 'schermate dei pin'], spillo_destinazione: ['destinazione di un pin', 'destinazioni dei pin'],
  immagine: ['immagine', 'immagini'], mappa: ['planimetria', 'planimetrie'], mappa_entita: ['legame planimetria-infiltrazione', 'legami planimetria-infiltrazione'],
  mappa_alias: ['nome di prima di una mappa', 'nomi di prima delle mappe'], mappa_percorso: ['percorso di una mappa', 'percorsi delle mappe'],
  mappa_presentazione: ['presentazione di una mappa', 'presentazioni delle mappe'], pezzo_mappa: ['pezzo di una planimetria', 'pezzi delle planimetrie'],
  copia_pezzo: ['copia di un pezzo', 'copie dei pezzi'], pianta_area: ['pianta di un’infiltrazione', 'piante delle infiltrazioni'],
  guida_mappa: ['scheda di guida di un’infiltrazione', 'schede di guida delle infiltrazioni'], guida_alias: ['nome di prima di un’infiltrazione', 'nomi di prima delle infiltrazioni'],
  area_dedalo: ['area di un dedalo', 'aree dei dedali'], area: ['area', 'aree'], quartiere_ingresso: ['ingresso di un quartiere', 'ingressi dei quartieri'], persona_area_dedalo: ['Persona di un’area di un dedalo', 'Persona delle aree dei dedali'],
  // L3 (migrazione 110)
  infiltrazione_area: ['legame infiltrazione-area', 'legami infiltrazione-area'], voce_infiltrazione: ['infiltrazione di una voce del diario', 'infiltrazioni delle voci del diario'],
  proposta_infiltrazione_voce: ['proposta d’infiltrazione di una voce del diario', 'proposte d’infiltrazione delle voci del diario'],
  richiesta: ['Richiesta', 'Richieste'], dati_guida: ['dato della guida', 'dati della guida'],
  punto_partita: ['spunta di una voce nelle partite', 'spunte delle voci nelle partite'], spillo_partita: ['stato di un pin nelle partite', 'stati dei pin nelle partite'],
  timbri_dedalo_partita: ['conteggio dei timbri nelle partite', 'conteggi dei timbri nelle partite'],
  spunta_voce_partita: ['spunta del diario nelle partite', 'spunte del diario nelle partite'],
  // L4 (utente 022)
  divergenza_partita: ['divergenza da verificare nelle partite', 'divergenze da verificare nelle partite'],
  // L4 (§8.11, utente 023)
  spillo_partita_infiltrazione: ['stato di un pin in un’infiltrazione nelle partite', 'stati dei pin per infiltrazione nelle partite'],
  // L5 (migrazione 115): luoghi e negozi
  luogo: ['luogo', 'luoghi'], negozio: ['negozio', 'negozi'], articolo: ['articolo', 'articoli'], attivita: ['attività', 'attività'],
  marcatore_luogo: ['segnaposto di un luogo', 'segnaposto dei luoghi'],
  acquisto_partita: ['acquisto nelle partite', 'acquisti nelle partite'], punti_negozio_partita: ['punti di un negozio nelle partite', 'punti dei negozi nelle partite'],
};

/** Il nome per l'utente di `quante` righe di una tabella (al singolare per una sola). */
export function etichettaTabella(tabella: string, quante = 2): string {
  const e = ETICHETTE[tabella];
  return e ? e[quante === 1 ? 0 : 1] : tabella.replace(/_/g, ' ');
}

/**
 * Ciò che riceve chi rimette a posto dopo un ripristino: la chiave dell'elemento, i suoi vicini quando fu eliminato, e le righe
 * non rimesse (per tabella): se il registro è tornato tutto, i dati sono già com'erano e spesso non c'è niente da fare.
 */
export type DopoRipristinoCestino = (chiave: string, vicini: ViciniCestino | null, saltate: readonly SaltataCestinoDto[]) => void;

/** Dopo un ripristino, ciò che dipende dall'elemento (ordine delle aree, percorsi delle mappe): lo registra il servizio del tipo. */
const dopoRipristino = new Map<TipoElementoCestino, DopoRipristinoCestino>();

/** Registra ciò che va rimesso a posto dopo il ripristino di un elemento di un tipo (una funzione per tipo). */
export function registraRipristinoCestino(tipo: TipoElementoCestino, fn: DopoRipristinoCestino): void {
  dopoRipristino.set(tipo, fn);
}

// ---- Le colonne e le chiavi delle tabelle ----

const virgolette = (nome: string): string => `"${nome.replace(/"/g, '""')}"`;
const stringa = (testo: string): string => `'${testo.replace(/'/g, "''")}'`;

/** Le tabelle di uno schema da registrare. */
function tabelle(db: AppDatabase, schema: Schema): string[] {
  return (db.prepare(`SELECT name FROM ${schema}.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`).all() as Array<{ name: string }>)
    .map((r) => r.name).filter((t) => !ESCLUSE[schema].has(t));
}

/** Le colonne di una tabella e quelle della sua chiave primaria (nell'ordine della chiave); null se la tabella non c'è più. */
function strutturaTabella(db: AppDatabase, schema: Schema, tabella: string): { colonne: string[]; chiave: string[] } | null {
  const info = db.prepare('SELECT name, pk FROM pragma_table_info(?, ?) ORDER BY cid').all(tabella, schema) as Array<{ name: string; pk: number }>;
  if (info.length === 0) return null;
  const chiave = info.filter((c) => c.pk > 0).sort((a, b) => a.pk - b.pk).map((c) => c.name);
  // tutte le tabelle dei due file hanno una chiave primaria (verificato sullo schema, 2026-10-16); senza, il rowid si registra
  // come una colonna (i trigger leggono `old."rowid"`) e fa da chiave
  if (chiave.length === 0) return { colonne: ['rowid', ...info.map((c) => c.name)], chiave: ['rowid'] };
  return { colonne: info.map((c) => c.name), chiave };
}

// ---- Valori ----

function serializza(v: unknown): Valore {
  if (v === null || v === undefined) return null;
  if (Buffer.isBuffer(v)) return { $blob: v.toString('base64') };
  if (typeof v === 'bigint') return Number(v);
  return v as string | number;
}

function deserializza(v: Valore): unknown {
  return v !== null && typeof v === 'object' ? Buffer.from(v.$blob, 'base64') : v;
}

/** Lo stesso valore (BLOB compresi, già serializzati). */
const stesso = (a: Valore | undefined, b: Valore | undefined): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
const uguali = (a: Riga, b: Riga, colonne: readonly string[]): boolean => colonne.every((c) => stesso(a[c], b[c]));

/**
 * Le tabelle che l'app ricalcola da sé (i percorsi delle mappe e i loro nomi di prima, da `sincronizzaPercorsiMappe`): una loro riga
 * cambiata dopo l'eliminazione, o con la chiave ormai presa, non blocca il ripristino. Si salta, e chi rimette a posto il tipo le
 * ricalcola (`registraRipristinoCestino`).
 */
const DERIVATE: ReadonlySet<string> = new Set(['mappa_percorso', 'mappa_alias']);

// ---- Registrare un'eliminazione ----

/** Vero mentre un'eliminazione si sta registrando: una dentro l'altra la registra quella di fuori. */
let registrando = false;

/**
 * Esegue `opera` (l'eliminazione) in una transazione registrando ogni riga che tocca nei due file, e mette nel cestino il
 * registro con l'elemento. Se `opera` fallisce non resta niente (né l'eliminazione né il registro). Chiamata dentro un'altra
 * registrazione, esegue solo `opera`: le sue righe finiscono nel registro di quella di fuori.
 */
export function conCestino<T>(elemento: ElementoCestino, opera: () => T): T {
  if (registrando) return opera();
  const db = getDb();
  const passi: Array<Omit<Passo, 'seq'> & { schema: Schema }> = [];
  const colonne = new Map<string, string[]>();
  db.function('cestino_registra', { varargs: true }, (...argomenti: unknown[]) => {
    const [schema, tabella, op] = argomenti as [Schema, string, Operazione];
    const nomi = colonne.get(`${schema}.${tabella}`)!;
    const riga = (da: number): Riga => Object.fromEntries(nomi.map((c, i) => [c, serializza(argomenti[da + i])]));
    if (op === 'D') passi.push({ schema, tabella, op, prima: riga(3) });
    else if (op === 'I') passi.push({ schema, tabella, op, dopo: riga(3) });
    else {
      const prima = riga(3), dopo = riga(3 + nomi.length);
      // un UPDATE che lascia la riga com'era (es. `SET ordine = ordine` o un allineamento che non cambia nulla) non serve
      if (!uguali(prima, dopo, nomi)) passi.push({ schema, tabella, op, prima, dopo });
    }
    return null;
  });
  const ricorsivi = db.pragma('recursive_triggers', { simple: true }) as number;
  db.pragma('recursive_triggers = ON');
  registrando = true;
  try {
    return db.transaction(() => {
      const trigger: string[] = [];
      try {
        for (const schema of ['main', 'utente'] as const) {
          tabelle(db, schema).forEach((tabella, i) => {
            const nomi = strutturaTabella(db, schema, tabella)!.colonne;
            colonne.set(`${schema}.${tabella}`, nomi);
            const vecchie = nomi.map((c) => `old.${virgolette(c)}`).join(', ');
            const nuove = nomi.map((c) => `new.${virgolette(c)}`).join(', ');
            const su = `${schema}.${virgolette(tabella)}`;
            const chiama = (op: Operazione, valori: string) => `SELECT cestino_registra(${stringa(schema)}, ${stringa(tabella)}, '${op}', ${valori});`;
            for (const [op, quando, valori] of [['D', 'DELETE', vecchie], ['U', 'UPDATE', `${vecchie}, ${nuove}`], ['I', 'INSERT', nuove]] as const) {
              const nome = `cestino_${schema}_${i}_${op}`;
              db.exec(`CREATE TEMP TRIGGER ${nome} AFTER ${quando} ON ${su} BEGIN ${chiama(op, valori)} END`);
              trigger.push(nome);
            }
          });
        }
        const esito = opera();
        for (const nome of trigger.splice(0)) db.exec(`DROP TRIGGER temp.${nome}`);
        salvaNelCestino(db, elemento, passi);
        return esito;
      } finally {
        // con un errore la transazione si annulla e i trigger con lei; si tolgono comunque, per non lasciarli mai attivi
        for (const nome of trigger) db.exec(`DROP TRIGGER IF EXISTS temp.${nome}`);
      }
    })();
  } finally {
    registrando = false;
    db.pragma(`recursive_triggers = ${ricorsivi ? 'ON' : 'OFF'}`);
  }
}

/** Mette nel cestino l'elemento con il suo registro, diviso fra i due file (stesso `uid`). */
function salvaNelCestino(db: AppDatabase, elemento: ElementoCestino, passi: ReadonlyArray<Omit<Passo, 'seq'> & { schema: Schema }>): void {
  const uid = randomBytes(16).toString('hex');
  const adesso = nowIso();
  const numerati = passi.map((p, seq) => ({ ...p, seq }));
  const diSchema = (schema: Schema): Passo[] => numerati.filter((p) => p.schema === schema).map(({ schema: _s, ...p }) => p);
  const gioco = diSchema('main'), partite = diSchema('utente');
  db.prepare('INSERT INTO main.cestino (uid, tipo, chiave, nome, contesto, riepilogo_json, registro_json, con_partite, vicini_json, eliminato_il) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(uid, elemento.tipo, elemento.chiave, elemento.nome, elemento.contesto ?? '', JSON.stringify(riepilogo(db, 'main', gioco)), JSON.stringify(gioco), partite.length ? 1 : 0,
      elemento.vicini ? JSON.stringify(elemento.vicini) : null, adesso);
  if (partite.length) db.prepare('INSERT INTO utente.cestino_partite (uid, registro_json, eliminato_il) VALUES (?, ?, ?)').run(uid, JSON.stringify(partite), adesso);
}

/**
 * Quante righe di ogni tabella se ne sono andate davvero: una riga cancellata e poi reinserita con la stessa chiave (i percorsi delle
 * mappe, che il ricalcolo riscrive tutti) non è tolta. La chiave è quella della tabella di adesso.
 */
function riepilogo(db: AppDatabase, schema: Schema, passi: readonly Passo[]): Record<string, number> {
  const via = new Map<string, Map<string, boolean>>();
  for (const p of passi) {
    if (p.op === 'U') continue;
    const s = strutturaTabella(db, schema, p.tabella);
    const riga = (p.op === 'D' ? p.prima : p.dopo)!;
    const chiave = (s?.chiave ?? Object.keys(riga)).map((c) => JSON.stringify(riga[c] ?? null)).join('|');
    if (!via.has(p.tabella)) via.set(p.tabella, new Map());
    via.get(p.tabella)!.set(chiave, p.op === 'D');
  }
  const conti: Record<string, number> = {};
  for (const [tabella, righe] of via) {
    const n = [...righe.values()].filter(Boolean).length;
    if (n) conti[tabella] = n;
  }
  return conti;
}

// ---- L'elenco ----

interface RigaCestino { id: number; uid: string; tipo: TipoElementoCestino; chiave: string; nome: string; contesto: string; riepilogo_json: string; registro_json: string; con_partite: number; vicini_json: string | null; eliminato_il: string }

/** Gli elementi del cestino, dal più recente, con quel che contengono (dati di gioco e partite). */
export function elencoCestino(): VoceCestinoDto[] {
  const db = getDb();
  const righe = db.prepare('SELECT id, uid, tipo, chiave, nome, contesto, riepilogo_json, con_partite, length(registro_json) AS byte_gioco, eliminato_il FROM main.cestino ORDER BY eliminato_il DESC, id DESC')
    .all() as Array<Omit<RigaCestino, 'registro_json'> & { byte_gioco: number }>;
  const partite = db.prepare('SELECT registro_json FROM utente.cestino_partite WHERE uid = ?');
  return righe.map((r) => {
    const conti: Record<string, number> = { ...(JSON.parse(r.riepilogo_json) as Record<string, number>) };
    const p = partite.get(r.uid) as { registro_json: string } | undefined;
    if (p) for (const [t, n] of Object.entries(riepilogo(db, 'utente', JSON.parse(p.registro_json) as Passo[]))) conti[t] = (conti[t] ?? 0) + n;
    const contenuto: ContenutoCestinoDto[] = Object.entries(conti).map(([tabella, quante]) => ({ tabella, etichetta: etichettaTabella(tabella, quante), quante }))
      .sort((a, b) => b.quante - a.quante || a.etichetta.localeCompare(b.etichetta));
    const statoPartite = !r.con_partite ? 'nessuna' : p ? 'presente' : 'mancante';
    return { id: r.id, tipo: r.tipo as TipoCestino, chiave: r.chiave, nome: r.nome, contesto: r.contesto, eliminatoIl: r.eliminato_il, contenuto, partite: statoPartite, byte: r.byte_gioco + (p?.registro_json.length ?? 0) };
  });
}

// ---- Rimettere ----

/** Un errore di vincolo di SQLite, per codice. */
function codiceSqlite(err: unknown): string | null {
  return err && typeof err === 'object' && 'code' in err && typeof (err as { code: unknown }).code === 'string' ? (err as { code: string }).code : null;
}

/**
 * Rimette un elemento del cestino com'era (vedi l'intestazione): 404 se non c'è, 409 se una chiave da reinserire nel file di gioco
 * è ormai presa da un'altra riga o se l'elemento non torna. Riuscito, l'elemento esce dal cestino.
 */
export function ripristinaDalCestino(id: number): EsitoRipristinoCestinoDto {
  const db = getDb();
  const r = db.prepare('SELECT * FROM main.cestino WHERE id = ?').get(id) as RigaCestino | undefined;
  if (!r) throw httpErrors.notFound('cestino-non-trovato', 'L’elemento non è più nel cestino.');
  const parteP = db.prepare('SELECT registro_json FROM utente.cestino_partite WHERE uid = ?').get(r.uid) as { registro_json: string } | undefined;
  const passi = [
    ...(JSON.parse(r.registro_json) as Passo[]).map((p) => ({ ...p, schema: 'main' as Schema })),
    ...(parteP ? (JSON.parse(parteP.registro_json) as Passo[]).map((p) => ({ ...p, schema: 'utente' as Schema })) : []),
  ].sort((a, b) => b.seq - a.seq);
  // l'eliminazione aveva una parte nelle partite che non c'è più (file delle partite sostituito dopo): si rimettono i dati di gioco
  const partiteMancanti = !!r.con_partite && !parteP;

  const strutture = new Map<string, { colonne: string[]; chiave: string[] } | null>();
  const struttura = (schema: Schema, tabella: string) => {
    const k = `${schema}.${tabella}`;
    if (!strutture.has(k)) strutture.set(k, strutturaTabella(db, schema, tabella));
    return strutture.get(k)!;
  };
  let rimesse = 0;
  const saltate = new Map<string, SaltataCestinoDto>();
  const salta = (tabella: string, motivo: MotivoSaltataCestinoDto, chiave: string) => {
    const k = `${tabella}|${motivo}`;
    const s = saltate.get(k) ?? { tabella, etichetta: etichettaTabella(tabella), motivo, quante: 0, esempi: [] };
    s.quante++;
    if (s.esempi.length < 5) s.esempi.push(chiave);
    saltate.set(k, s);
  };
  const occupate: string[] = [];

  db.transaction(() => {
    for (const p of passi) {
      const s = struttura(p.schema, p.tabella);
      const riferimento = p.prima ?? p.dopo!;
      const descrivi = (riga: Riga) => s ? s.chiave.map((c) => String(riga[c] ?? '')).join(' · ') : '';
      if (!s) { salta(p.tabella, 'non-esiste-piu', descrivi(riferimento)); continue; }
      // solo le colonne che la tabella ha ancora (una migrazione dopo l'eliminazione può averne tolte)
      const colonne = s.colonne.filter((c) => c in riferimento);
      const su = `${p.schema}.${virgolette(p.tabella)}`;
      const dove = s.chiave.map((c) => `${virgolette(c)} = ?`).join(' AND ');
      const leggi = (riga: Riga): Riga | null => {
        const v = db.prepare(`SELECT ${colonne.map(virgolette).join(', ')} FROM ${su} WHERE ${dove}`).get(...s.chiave.map((c) => deserializza(riga[c] ?? null))) as Record<string, unknown> | undefined;
        return v ? Object.fromEntries(colonne.map((c) => [c, serializza(v[c])])) : null;
      };
      const esegui = (sql: string, valori: unknown[], riga: Riga): boolean => {
        try { db.prepare(sql).run(...valori); rimesse++; return true; } catch (err) {
          const codice = codiceSqlite(err);
          if (codice === 'SQLITE_CONSTRAINT_FOREIGNKEY') { salta(p.tabella, 'legame-mancante', descrivi(riga)); return false; }
          if (codice === 'SQLITE_CONSTRAINT_PRIMARYKEY' || codice === 'SQLITE_CONSTRAINT_UNIQUE') {
            if (p.schema === 'main' && !DERIVATE.has(p.tabella)) occupate.push(`${etichettaTabella(p.tabella)}: ${descrivi(riga)}`);
            else salta(p.tabella, 'cambiata-dopo', descrivi(riga));
            return false;
          }
          throw err;
        }
      };
      if (p.op === 'D') {
        const prima = p.prima!;
        const ora = leggi(prima);
        if (ora) {
          if (uguali(ora, prima, colonne)) continue;
          if (p.schema === 'main' && !DERIVATE.has(p.tabella)) occupate.push(`${etichettaTabella(p.tabella)}: ${descrivi(prima)}`);
          else salta(p.tabella, 'cambiata-dopo', descrivi(prima));
          continue;
        }
        esegui(`INSERT INTO ${su} (${colonne.map(virgolette).join(', ')}) VALUES (${colonne.map(() => '?').join(', ')})`, colonne.map((c) => deserializza(prima[c])), prima);
      } else if (p.op === 'U') {
        const prima = p.prima!, dopo = p.dopo!;
        const ora = leggi(dopo);
        if (!ora) { if (!leggi(prima)) salta(p.tabella, 'non-esiste-piu', descrivi(dopo)); continue; }
        // colonna per colonna: torna com'era ciò che l'eliminazione aveva cambiato e nessuno ha toccato dopo; il resto della riga
        // (anche cambiato dopo) resta com'è. Una colonna cambiata dall'eliminazione e poi di nuovo da altro resta, e si dice.
        const cambiate = colonne.filter((c) => !stesso(prima[c], dopo[c]));
        const daRimettere = cambiate.filter((c) => stesso(ora[c], dopo[c]));
        if (cambiate.some((c) => !stesso(ora[c], dopo[c]) && !stesso(ora[c], prima[c]))) salta(p.tabella, 'cambiata-dopo', descrivi(dopo));
        if (daRimettere.length) {
          esegui(`UPDATE ${su} SET ${daRimettere.map((c) => `${virgolette(c)} = ?`).join(', ')} WHERE ${dove}`,
            [...daRimettere.map((c) => deserializza(prima[c])), ...s.chiave.map((c) => deserializza(dopo[c] ?? null))], dopo);
        }
      } else {
        const dopo = p.dopo!;
        const ora = leggi(dopo);
        if (!ora) continue;
        if (!uguali(ora, dopo, colonne)) { salta(p.tabella, 'cambiata-dopo', descrivi(dopo)); continue; }
        esegui(`DELETE FROM ${su} WHERE ${dove}`, s.chiave.map((c) => deserializza(dopo[c] ?? null)), dopo);
      }
    }
    if (occupate.length) {
      throw httpErrors.conflict('cestino-chiavi-occupate',
        `Non si può rimettere «${r.nome}»: ${occupate.length === 1 ? 'una riga ha' : `${occupate.length} righe hanno`} la chiave ormai presa da qualcosa creato dopo (${occupate.slice(0, 5).join('; ')}${occupate.length > 5 ? '; …' : ''}).`,
        { occupate });
    }
    const radice = RADICE[r.tipo];
    if (!db.prepare(`SELECT 1 FROM main.${virgolette(radice.tabella)} WHERE ${virgolette(radice.colonna)} = ?`).get(r.chiave)) {
      throw httpErrors.conflict('cestino-non-ripristinabile', `Non si può rimettere «${r.nome}»: ciò che la conteneva non c'è più.`);
    }
    dopoRipristino.get(r.tipo)?.(r.chiave, r.vicini_json ? JSON.parse(r.vicini_json) as ViciniCestino : null, [...saltate.values()]);
    // L4 (§8.11): lo specchio delle voci con pin si rifà con la funzione unica — quel che è cambiato dopo l'eliminazione (un pin
    // segnato o tolto) vince, come per le altre righe delle partite
    riallineaStati(db, null, nowIso());
    db.prepare('DELETE FROM main.cestino WHERE id = ?').run(r.id);
    db.prepare('DELETE FROM utente.cestino_partite WHERE uid = ?').run(r.uid);
  })();
  invalidaCacheDiGioco();
  // il nome delle righe saltate col numero giusto (al singolare per una sola), ora che si sa quante sono
  const elencoSaltate = [...saltate.values()].map((s) => ({ ...s, etichetta: etichettaTabella(s.tabella, s.quante) }));
  return { tipo: r.tipo as TipoCestino, chiave: r.chiave, nome: r.nome, rimesse, saltate: elencoSaltate, partiteMancanti };
}

// ---- Svuotare ----

/** Toglie per sempre un elemento dal cestino (404 se non c'è). */
export function eliminaDalCestino(id: number): void {
  const db = getDb();
  const r = db.prepare('SELECT uid FROM main.cestino WHERE id = ?').get(id) as { uid: string } | undefined;
  if (!r) throw httpErrors.notFound('cestino-non-trovato', 'L’elemento non è più nel cestino.');
  db.transaction(() => {
    db.prepare('DELETE FROM main.cestino WHERE id = ?').run(id);
    db.prepare('DELETE FROM utente.cestino_partite WHERE uid = ?').run(r.uid);
  })();
}

/** Svuota il cestino (anche le parti delle partite rimaste senza la loro riga di gioco); restituisce quanti elementi c'erano. */
export function svuotaCestino(): { eliminati: number } {
  const db = getDb();
  return db.transaction(() => {
    const eliminati = db.prepare('DELETE FROM main.cestino').run().changes;
    db.prepare('DELETE FROM utente.cestino_partite').run();
    return { eliminati };
  })();
}
