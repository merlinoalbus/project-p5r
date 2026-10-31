// ============================================================
// Migrazione 325 — la relazione romantica dalla guida: i Confidenti romanzabili e la disponibilità di Takemi con la relazione (L13, ondata 10, O10-2)
// ============================================================
//
// Domanda posta all'utente il 2026-10-31: «Takemi: la guida dice che se inizi una relazione romantica con Takemi da quel momento la puoi vedere
// solo di sera e non più di giorno; l'app non sa se nella tua partita hai scelto la relazione romantica. a) aggiungo alla partita il dato
// "relazione romantica" (lo segni con la scelta romantica al rango 9) e da lì l'app sposta da sola la disponibilità di Takemi alla sera; b) lascio
// solo la frase scritta.». Risposta dell'utente: «a».
// Fonti lette il 2026-10-31 (le pagine dei dieci Confidenti con la scelta d'amore al rango 9, citate nell'audit). Solo la pagina di Takemi dice
// che la disponibilità cambia con la relazione; le altre nove no, e per loro non si inventa niente.
//
// Che cosa fa, ogni scrittura con `WHERE` sul valore letto (una riga diversa da quella attesa è dell'utente o è già cambiata: si salta e si dice):
//   (1) `confidente.romanzabile = 1` per i Confidenti che hanno almeno una scelta romantica (`romantica: true`) nel dialogo del rango 9
//       (`confidente_dialogo`): la fonte è il DB, nessun elenco di nomi. Il conteggio letto il 2026-10-31 è 10; se è un altro, nessuna scrittura
//       (né qui né al punto 2) e l'audit lo dice;
//   (2) Takemi, solo se romanzabile al punto 1: l'eccezione nuova `{tipo:'con-relazione', fasce:['sera']}` in coda alle eccezioni della
//       disponibilità, solo se le eccezioni sono quelle lette (`dopo-rango` 2 giorni); la fotografia di «Ripristina», se c'è e ha le stesse
//       eccezioni lette, la riceve anche lei (come la 317 (b)). Poi la prosa delle fasce («Giorno (normalmente)», «Sera (se relazione romantica
//       avviata)»), ora detta dalla struttura (fasce generali `giorno` e l'eccezione), esce col metodo della 307/317: con lo storico dell'editor
//       delle informazioni che finisce sulla riga di adesso gli si aggiunge la revisione «migrazione»; se non vi finisce, la riga si salta.
// Le partite non si toccano (impronta di tutto lo schema `utente`, prima e dopo). Idempotente: la seconda volta non trova niente da fare e non
// scrive (l'audit resta com'è). Audit in `dati_guida.audit-325-relazione-romantica` (chiude l'audit 317, punto f, Takemi). Solo `main`.
// ============================================================

import { createHash } from 'node:crypto';
import type { Migration } from '../migrationRunner.js';
import type { AppDatabase } from '../dbService.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { invalidaCacheDiGioco } from '../../services/cacheDiGioco.js';

const AUDIT = 'audit-325-relazione-romantica';
const DOMANDA_POSTA = 'Takemi: la guida dice che se inizi una relazione romantica con Takemi da quel momento la puoi vedere solo di sera e non più di giorno; l’app non sa se nella tua partita hai scelto la relazione romantica. a) aggiungo alla partita il dato "relazione romantica" (lo segni con la scelta romantica al rango 9) e da lì l’app sposta da sola la disponibilità di Takemi alla sera; b) lascio solo la frase scritta.';
const DECISIONE = '«a»';
const GUIDA = 'https://www.allgamestaff.it/persona-5-royal/';
const PAGINA = (p: string) => `${GUIDA}guida-rango-confidente-di-${p}/`;
/** Il rango del dialogo in cui si sceglie la relazione romantica (la guida, per tutti e dieci). */
const RANGO_DELLA_SCELTA = 9;
/** I Confidenti romanzabili contati il 2026-10-31 sulla copia alla 323: un altro conteggio ferma le scritture (il dialogo è cambiato). */
const ROMANZABILI_ATTESI = 10;

/**
 * Le citazioni delle pagine, SOLO per l'audit (lette il 2026-10-31): la regola non le usa, usa il DB (punto 1). Takemi è l'unica pagina che
 * dice che la disponibilità cambia.
 */
const CITAZIONI: ReadonlyArray<{ confidente: string; url: string; frase: string }> = [
  { confidente: 'takemi', url: PAGINA('tae-takemi-morte'), frase: 'disponibile «solo di giorno» tutti i giorni; al rango 9 «è ora di scegliere se vogliamo iniziare un legame sentimentale con Tae Takemi o meno»; con la relazione «potremo trascorrere del tempo con lei solo di sera»' },
  { confidente: 'ann', url: PAGINA('ann-amanti'), frase: 'la scelta tra storia d’amore e amicizia al rango 9; la pagina non dice che la disponibilità cambia' },
  { confidente: 'makoto', url: PAGINA('makoto-papessa'), frase: 'la scelta d’amore al rango 9 («La scelta è del tutto personale»); la pagina non dice che la disponibilità cambia' },
  { confidente: 'futaba', url: PAGINA('futaba-eremita'), frase: '«STORIA D’AMORE» o «AMICIZIA» al rango 9; la pagina non dice che la disponibilità cambia' },
  { confidente: 'haru', url: PAGINA('haru-imperatrice'), frase: 'la scelta al rango 9; cambia solo il giorno del rango 10 (amore); la pagina non dice che la disponibilità generale cambia' },
  { confidente: 'kawakami', url: PAGINA('kawakami-temperanza'), frase: 'la «ROMANCE con Kawakami» al rango 9; con la relazione non telefona dopo il ritorno a casa; la pagina non dice che la disponibilità cambia' },
  { confidente: 'ohya', url: PAGINA('ohya-diavolo'), frase: 'al rango 9 la colonna «Storia d’amore»; la pagina non dice che la disponibilità cambia' },
  { confidente: 'hifumi', url: PAGINA('hifumi-stella'), frase: 'al rango 9 «Voglio che ci fidanziamo.»; la pagina non dice che la disponibilità cambia' },
  { confidente: 'chihaya', url: PAGINA('chihaya-fortuna'), frase: 'al rango 9 «Per poter stare con te»; la pagina non dice che la disponibilità cambia' },
  { confidente: 'kasumi', url: PAGINA('kasumi-fede'), frase: 'al rango 9 «Ti amo anche io»; la pagina non dice che la disponibilità cambia' },
];

/** Takemi: le eccezioni lette il 2026-10-31, quella nuova e la prosa delle fasce letta e quella che prende. */
const TAKEMI = {
  confidente: 'takemi',
  url: PAGINA('tae-takemi-morte'),
  eccezioniLette: JSON.stringify([{ tipo: 'dopo-rango', giorni: 2, effetto: 'non-disponibile' }]),
  eccezione: { tipo: 'con-relazione', fasce: ['sera'] },
  prosaLetta: JSON.stringify(['Giorno (normalmente)', 'Sera (se relazione romantica avviata)']),
  prosaNuova: '[]',
};
const ECCEZIONI_DOPO = JSON.stringify([...JSON.parse(TAKEMI.eccezioniLette) as unknown[], TAKEMI.eccezione]);

const SEED = (c: string) => `disponibilita-struttura-seed-v1:${c}`;
const STORICO = 'confidente-disponibilita-editor-v1:';
const errore = (motivo: string): never => { throw new Error(`325: ${motivo}; nessuna modifica applicata.`); };
type Esito = { punto: string; chiave: string; esito: string; prima?: unknown; dopo?: unknown };

/** Il JSON rimesso in forma canonica; null se non si legge. */
function canonica(testo: string | null | undefined): string | null {
  if (testo === null || testo === undefined) return null;
  try { return JSON.stringify(JSON.parse(testo)); } catch { return null; }
}

/** L'impronta di tutto lo schema `utente` (ogni tabella, ogni riga): alla fine deve essere identica. */
function improntaPartite(db: AppDatabase): string {
  const h = createHash('sha256');
  for (const t of (db.prepare("SELECT name FROM utente.sqlite_master WHERE type = 'table' ORDER BY name").all() as Array<{ name: string }>).map((x) => x.name)) {
    h.update(`#${t}\n`);
    for (const r of db.prepare(`SELECT * FROM utente."${t}"`).iterate()) h.update(JSON.stringify(r) + '\n');
  }
  return h.digest('hex');
}

// ---- (1) i Confidenti romanzabili, dal dialogo del rango 9 ----

/** Le chiavi dei Confidenti (esistenti) con almeno una scelta romantica nel dialogo del rango della scelta, in ordine di chiave. */
function romanzabiliDalDialogo(db: AppDatabase): string[] {
  const righe = db.prepare('SELECT d.confidente_chiave AS chiave, d.scelte_json AS scelte FROM main.confidente_dialogo d JOIN main.confidente c ON c.chiave = d.confidente_chiave WHERE d.rango = ?')
    .all(RANGO_DELLA_SCELTA) as Array<{ chiave: string; scelte: string }>;
  const out = new Set<string>();
  for (const r of righe) {
    let scelte: unknown;
    try { scelte = JSON.parse(r.scelte); } catch { continue; }
    if (Array.isArray(scelte) && scelte.some((s) => !!s && typeof s === 'object' && (s as { romantica?: unknown }).romantica === true)) out.add(r.chiave);
  }
  return [...out].sort();
}

function romanzabili(db: AppDatabase, chiavi: readonly string[]): Esito[] {
  return chiavi.map((chiave): Esito => {
    const attuale = db.prepare('SELECT romanzabile FROM main.confidente WHERE chiave = ?').pluck().get(chiave) as number | undefined;
    if (attuale === 1) return { punto: '1', chiave, esito: 'già romanzabile' };
    if (db.prepare('UPDATE main.confidente SET romanzabile = 1 WHERE chiave = ? AND romanzabile = 0').run(chiave).changes !== 1) errore(`${chiave} non diventa romanzabile`);
    return { punto: '1', chiave, esito: `romanzabile: scelta romantica nel dialogo del rango ${RANGO_DELLA_SCELTA}`, prima: 0, dopo: 1 };
  });
}

// ---- (2) Takemi: l'eccezione «con la relazione» e la prosa delle fasce ----

/** Le otto colonne in prosa della riga, nell'ordine dello storico dell'editor (come la 307 e la 317). */
const COLONNE = ['giorni_json', 'fasce_json', 'luogo', 'sblocco_data', 'sblocco_requisiti', 'note', 'note_generali', 'fonti_json'] as const;
type Raw = Record<typeof COLONNE[number], string>;
type Revisione = { id: number; azione: string; data: string; motivo: string; operazioneId: string; richiesta: string; prima: unknown; dopo: unknown };
type Registro = Record<string, unknown> & { revisioni: Revisione[]; iniziale: unknown };

/** Come l'impronta dello storico dell'editor (`disponibilitaConfidentiService`): JSON canonico, SHA-256. */
function canonico(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonico).join(',')}]`;
  if (v !== null && typeof v === 'object') return `{${Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => `${JSON.stringify(k)}:${canonico(x)}`).join(',')}}`;
  return JSON.stringify(v);
}
const impronta = (v: unknown) => createHash('sha256').update(canonico(v)).digest('hex');
const ugualiRaw = (a: unknown, b: Raw): boolean => !!a && typeof a === 'object' && Object.keys(a).length === COLONNE.length
  && COLONNE.every((c) => (a as Record<string, unknown>)[c] === b[c]);

/** Lo storico dell'editor della riga, se c'è; `coerente` = finisce sulla riga di adesso. */
function leggiStorico(db: AppDatabase, chiave: string, raw: Raw): { registro: Registro | null; coerente: boolean } | null {
  const testo = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(STORICO + chiave) as string | undefined;
  if (testo === undefined) return null;
  let v: unknown;
  try { v = JSON.parse(testo); } catch { return { registro: null, coerente: false }; }
  if (!v || typeof v !== 'object' || !Array.isArray((v as Registro).revisioni)) return { registro: null, coerente: false };
  const r = v as Registro;
  const ultima = r.revisioni.length ? r.revisioni[r.revisioni.length - 1]!.dopo : r.iniziale;
  return { registro: r, coerente: ugualiRaw(ultima, raw) };
}

/** L'eccezione nuova nelle eccezioni della riga (e nella fotografia di «Ripristina», se c'è). Vero se, alla fine, la riga ce l'ha. */
function eccezioneTakemi(db: AppDatabase, esiti: Esito[]): boolean {
  const chiave = `disponibilita:${TAKEMI.confidente}`;
  const r = db.prepare('SELECT eccezioni_json FROM main.confidente_disponibilita WHERE confidente_chiave = ?').get(TAKEMI.confidente) as { eccezioni_json: string } | undefined;
  let presente = false;
  if (!r) esiti.push({ punto: '2', chiave, esito: 'riga assente: niente da fare' });
  else if (canonica(r.eccezioni_json) === ECCEZIONI_DOPO) { esiti.push({ punto: '2', chiave, esito: 'eccezione «con la relazione» già presente' }); presente = true; }
  else if (canonica(r.eccezioni_json) !== TAKEMI.eccezioniLette) esiti.push({ punto: '2', chiave, esito: 'eccezioni diverse da quelle lette (cambiate dall’utente): non toccate', prima: r.eccezioni_json });
  else {
    if (db.prepare('UPDATE main.confidente_disponibilita SET eccezioni_json = ? WHERE confidente_chiave = ? AND eccezioni_json = ?').run(ECCEZIONI_DOPO, TAKEMI.confidente, r.eccezioni_json).changes !== 1) errore('le eccezioni di Takemi non si aggiornano');
    esiti.push({ punto: '2', chiave, esito: `eccezione «con la relazione» aggiunta: con la relazione romantica solo di sera (${TAKEMI.url})`, prima: r.eccezioni_json, dopo: ECCEZIONI_DOPO });
    presente = true;
  }
  // la fotografia di «Ripristina», se c'è (stesso metodo della 317 (b)): riceve l'eccezione solo se ha le eccezioni lette
  const seed = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(SEED(TAKEMI.confidente)) as string | undefined;
  if (seed !== undefined) {
    let foto: Record<string, unknown> | null;
    try { foto = JSON.parse(seed) as Record<string, unknown>; } catch { foto = null; }
    const ecc = foto && typeof foto.eccezioni_json === 'string' ? canonica(foto.eccezioni_json) : null;
    const chiaveFoto = `fotografia:${TAKEMI.confidente}`;
    if (!foto || ecc === null) esiti.push({ punto: '2', chiave: chiaveFoto, esito: 'fotografia illeggibile: non toccata' });
    else if (ecc === ECCEZIONI_DOPO) esiti.push({ punto: '2', chiave: chiaveFoto, esito: 'fotografia già con l’eccezione' });
    else if (ecc === TAKEMI.eccezioniLette) {
      if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ? AND json = ?').run(JSON.stringify({ ...foto, eccezioni_json: ECCEZIONI_DOPO }), SEED(TAKEMI.confidente), seed).changes !== 1) errore('la fotografia di Takemi non si aggiorna');
      esiti.push({ punto: '2', chiave: chiaveFoto, esito: 'eccezione «con la relazione» aggiunta alla fotografia di «Ripristina»', prima: foto.eccezioni_json, dopo: ECCEZIONI_DOPO });
    } else esiti.push({ punto: '2', chiave: chiaveFoto, esito: 'eccezioni della fotografia diverse da quelle lette: non toccate', prima: foto.eccezioni_json });
  }
  return presente;
}

/** La prosa delle fasce di Takemi esce (la dicono le fasce generali e l'eccezione), col metodo della 307/317. */
function prosaTakemi(db: AppDatabase, adesso: string, esiti: Esito[]): void {
  const chiave = `fasce_json:${TAKEMI.confidente}`;
  const r = db.prepare(`SELECT ${COLONNE.join(', ')} FROM main.confidente_disponibilita WHERE confidente_chiave = ?`).get(TAKEMI.confidente) as Record<string, unknown> | undefined;
  if (!r) { esiti.push({ punto: '2', chiave, esito: 'riga assente: niente da fare' }); return; }
  if (COLONNE.some((c) => typeof r[c] !== 'string')) { esiti.push({ punto: '2', chiave, esito: 'riga con colonne non testuali: saltata' }); return; }
  const prima = Object.fromEntries(COLONNE.map((c) => [c, r[c] as string])) as Raw;
  if (prima.fasce_json === TAKEMI.prosaNuova) { esiti.push({ punto: '2', chiave, esito: 'già senza la prosa' }); return; }
  if (prima.fasce_json !== TAKEMI.prosaLetta) { esiti.push({ punto: '2', chiave, esito: 'testo diverso da quello letto (cambiato dall’utente o già toccato): saltato', prima: prima.fasce_json }); return; }
  const dopo: Raw = { ...prima, fasce_json: TAKEMI.prosaNuova };
  const storico = leggiStorico(db, TAKEMI.confidente, prima);
  if (storico && (!storico.coerente || !storico.registro)) { esiti.push({ punto: '2', chiave, esito: 'lo storico dell’editor non finisce sulla riga di adesso: saltato', prima: prima.fasce_json }); return; }
  if (db.prepare('UPDATE main.confidente_disponibilita SET fasce_json = ? WHERE confidente_chiave = ? AND fasce_json = ?').run(TAKEMI.prosaNuova, TAKEMI.confidente, TAKEMI.prosaLetta).changes !== 1) errore('la prosa delle fasce di Takemi non si aggiorna');
  if (storico?.registro) {
    const reg = storico.registro;
    const operazioneId = `migrazione-325-${TAKEMI.confidente}`;
    if (reg.revisioni.some((x) => x.operazioneId === operazioneId)) errore('lo storico di Takemi ha già la revisione della 325');
    reg.revisioni.push({ id: reg.revisioni.length + 1, azione: 'migrazione', data: adesso,
      motivo: `Migrazione 325: dalla guida (${TAKEMI.url}) le fasce le dice la struttura (di giorno; con la relazione romantica solo di sera): esce la prosa.`,
      operazioneId, richiesta: impronta({ chiave: TAKEMI.confidente, migrazione: 325 }), prima, dopo });
    if (db.prepare('UPDATE main.dati_guida SET json = ? WHERE chiave = ?').run(JSON.stringify(reg), STORICO + TAKEMI.confidente).changes !== 1) errore('lo storico di Takemi non si aggiorna');
  }
  esiti.push({ punto: '2', chiave, esito: `prosa delle fasce tolta: la dicono le fasce generali e l’eccezione «con la relazione»${storico?.registro ? '; storico dell’editor con la revisione «migrazione»' : ''}`, prima: TAKEMI.prosaLetta, dopo: TAKEMI.prosaNuova });
}

// ---- audit ----

/** L'audit: la prima esecuzione sempre, le successive solo se hanno cambiato qualcosa. */
function scriviAudit(db: AppDatabase, esecuzione: Record<string, unknown>, cambiato: boolean): void {
  const vecchio = db.prepare('SELECT json FROM main.dati_guida WHERE chiave = ?').pluck().get(AUDIT) as string | undefined;
  if (vecchio && !cambiato) return;
  let esecuzioni: unknown[] = [];
  if (vecchio) { try { const v = JSON.parse(vecchio) as { esecuzioni?: unknown }; esecuzioni = Array.isArray(v.esecuzioni) ? v.esecuzioni : []; } catch { esecuzioni = []; } }
  db.prepare('INSERT INTO main.dati_guida (chiave, json) VALUES (?, ?) ON CONFLICT(chiave) DO UPDATE SET json = excluded.json')
    .run(AUDIT, JSON.stringify({
      migrazione: 325, lotto: 'O10-2', domanda: DOMANDA_POSTA, decisione: DECISIONE,
      regola: `romanzabile = almeno una scelta romantica nel dialogo del rango ${RANGO_DELLA_SCELTA} (dal DB, attesi ${ROMANZABILI_ATTESI}); l’eccezione «con la relazione» solo dove la guida dice che la disponibilità cambia (Takemi); ogni scrittura sul valore letto (righe diverse: saltate); la prosa col metodo della 307/317; le partite non si toccano`,
      fonti: CITAZIONI, eccezione: TAKEMI.eccezione,
      chiude: 'audit-317-confidenti-guida, punto f (Takemi: «Sera (se relazione romantica avviata)»)',
      esecuzioni: [...esecuzioni, { il: new Date().toISOString(), ...esecuzione }],
    }));
}

export const migration325: Migration = {
  id: 325,
  name: 'relazione_romantica_dalla_guida',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    for (const t of ['confidente', 'confidente_dialogo', 'confidente_disponibilita', 'dati_guida']) {
      if (!esisteTabella(db, t)) { logger.warn({ migrazione: 325, tabella: t }, 'tabella assente: niente da fare'); return; }
    }
    if (!haColonna(db, 'confidente', 'romanzabile') || !haColonna(db, 'confidente_disponibilita', 'eccezioni_json')) { logger.warn({ migrazione: 325 }, 'colonne assenti: niente da fare'); return; }
    const adesso = new Date().toISOString();
    const partiteAttaccate = (db.prepare('PRAGMA database_list').all() as Array<{ name: string }>).some((s) => s.name === 'utente');
    const partitePrima = partiteAttaccate ? improntaPartite(db) : null;
    const chiavi = romanzabiliDalDialogo(db);
    const esiti: Esito[] = [];
    if (chiavi.length !== ROMANZABILI_ATTESI) {
      // il dialogo non è più quello letto: nessuna scrittura, lo dice l'audit
      esiti.push({ punto: '1', chiave: 'conteggio', esito: `romanzabili dal dialogo: ${chiavi.length}, non ${ROMANZABILI_ATTESI}: nessuna scrittura`, prima: chiavi });
    } else {
      esiti.push(...romanzabili(db, chiavi));
      if (!chiavi.includes(TAKEMI.confidente)) esiti.push({ punto: '2', chiave: TAKEMI.confidente, esito: 'Takemi non ha la scelta romantica al rango 9: niente da fare' });
      else if (eccezioneTakemi(db, esiti)) prosaTakemi(db, adesso, esiti);
    }
    if (partiteAttaccate && improntaPartite(db) !== partitePrima) errore('le partite risultano cambiate');
    const scritto = (e: Esito) => /^(romanzabile:|eccezione «con la relazione» aggiunta|prosa delle fasce tolta)/.test(e.esito);
    const conteggi = {
      romanzabiliLetti: chiavi.length,
      romanzabiliScritti: esiti.filter((e) => e.punto === '1' && scritto(e)).length,
      eccezioniScritte: esiti.filter((e) => e.esito.startsWith('eccezione «con la relazione» aggiunta')).length,
      prosaTolta: esiti.filter((e) => e.esito.startsWith('prosa delle fasce tolta')).length,
    };
    const cambiato = esiti.some(scritto);
    if (cambiato) invalidaCacheDiGioco();
    scriviAudit(db, { conteggi, romanzabili: chiavi, esiti }, cambiato);
    logger.info({ migrazione: 325, ...conteggi }, 'Relazione romantica: Confidenti romanzabili e Takemi solo di sera con la relazione');
  },
};
