// ============================================================
// datiGuida — i blocchi JSON della guida (`dati_guida`), letti e analizzati una volta per chiave
// ============================================================
//
// `dati_guida` tiene le parti della guida senza una tabella propria (oggetti, personaggi, sfide, battaglia, completamento, Jose,
// finestre dei Palazzi…): un JSON per chiave, alcuni da centinaia di KB. Prima ogni GET li rileggeva e li rianalizzava, con due
// copie della funzione di lettura e la lettura delle finestre dei Palazzi scritta cinque volte (rilievi F22, R1 e K2 della verifica
// completa, 2026-10-03).
//
// Qui il JSON si analizza alla prima richiesta e resta in memoria fino a quando i dati di gioco cambiano (`registraCacheDiGioco`:
// importazione del pacchetto, ripristino, nuova connessione). L'oggetto è **congelato** e condiviso: chi lo restituisce così com'è
// non paga copie, e chi volesse modificarlo riceve un errore invece di cambiare la guida per tutte le richieste successive. Chi deve
// aggiungere dati costruisce un oggetto nuovo.
// ============================================================

import { prepared, type AppDatabase } from '../db/dbService.js';
import { registraCacheDiGioco } from './cacheDiGioco.js';
import { analizzaPercorso, generePrimitivo, impostaImmutabile, risolvi } from '../../shared/percorsoGuida.js';

const cache = new Map<string, unknown>();
let finestre: ReadonlyMap<string, FinestraDungeon> | null = null;

/** Congela un valore e tutto quello che contiene. */
function congela<T>(valore: T): T {
  if (valore && typeof valore === 'object' && !Object.isFrozen(valore)) {
    Object.freeze(valore);
    for (const v of Object.values(valore)) congela(v);
  }
  return valore;
}

/** Il tipo di un valore congelato da `congela`: in sola lettura a ogni livello, così una modifica sul posto è un errore del compilatore e non un 500. */
export type Congelato<T> = T extends (...args: never[]) => unknown ? T
  : T extends ReadonlyArray<infer E> ? ReadonlyArray<Congelato<E>>
  : T extends object ? { readonly [K in keyof T]: Congelato<T[K]> }
  : T;

/** Il blocco JSON della guida con quella chiave (congelato, condiviso), o null se non c'è. */
export function datiGuida<T>(chiave: string): Congelato<T> | null {
  if (cache.has(chiave)) return cache.get(chiave) as Congelato<T> | null;
  const riga = prepared('SELECT json FROM dati_guida WHERE chiave = ?').get(chiave) as { json: string } | undefined;
  const valore = riga ? congela(JSON.parse(riga.json) as Congelato<T>) : null;
  cache.set(chiave, valore);
  return valore;
}

// ---- Il blocco con le correzioni dell'utente sopra (L11 · B11) ----

export interface RigaCorrezione { percorso: string; valore_json: string }
export interface BloccoCorretto { dati: unknown; orfane: string[] }
const cacheCorretti = new Map<string, BloccoCorretto>();

const SQL_CORREZIONI_DEL_BLOCCO = 'SELECT percorso, valore_json FROM correzione_dati_guida WHERE blocco = ? ORDER BY percorso';

/** Le correzioni di un blocco (`correzione_dati_guida`), nell'ordine dell'indirizzo; vuote se la tabella non c'è (uno schema di prima della 178). */
export function correzioniDelBlocco(chiave: string): RigaCorrezione[] {
  try {
    return prepared(SQL_CORREZIONI_DEL_BLOCCO).all(chiave) as RigaCorrezione[];
  } catch {
    return [];
  }
}

/**
 * Le correzioni di un blocco lette da un database qualunque (L12 · R12-04: «Prepara edizione» le legge dalla COPIA, per scriverle nel blocco).
 * Stessa interrogazione di `correzioniDelBlocco`; vuote se la tabella non c'è.
 */
export function correzioniDelBloccoDi(db: AppDatabase, chiave: string): RigaCorrezione[] {
  try {
    return db.prepare(SQL_CORREZIONI_DEL_BLOCCO).all(chiave) as RigaCorrezione[];
  } catch {
    return [];
  }
}

/**
 * Applica a `base` le correzioni, ciascuna risolta sulla BASE (non sul risultato parziale: correggere il campo-selettore di un elemento
 * non sposta le altre correzioni dello stesso elemento). Una correzione che non si risolve più o il cui valore non ha più il tipo della
 * guida è «orfana»: si salta e si dichiara, non si cancella.
 * Esportata perché l'unica logica di applicazione è questa: la usa anche «Prepara edizione» (R12-04) per scrivere le correzioni dentro i blocchi.
 */
export function applicaCorrezioni(base: unknown, righe: ReadonlyArray<RigaCorrezione>): BloccoCorretto {
  let corrente = base;
  const orfane: string[] = [];
  for (const r of righe) {
    try {
      const esito = risolvi(base, analizzaPercorso(r.percorso));
      const valore = JSON.parse(r.valore_json) as unknown;
      const tipoGuida = generePrimitivo(esito.valore);
      const tipoValore = generePrimitivo(valore);
      const compatibile = tipoValore === 'null' || tipoGuida === 'null' || tipoGuida === tipoValore;
      if (!esito.trovato || !compatibile || tipoValore === 'oggetto' || tipoGuida === 'oggetto') { orfane.push(r.percorso); continue; }
      corrente = impostaImmutabile(corrente, esito.puntatore, valore);
    } catch {
      orfane.push(r.percorso);
    }
  }
  return { dati: congela(corrente), orfane };
}

function bloccoCorretto(chiave: string): BloccoCorretto {
  const noto = cacheCorretti.get(chiave);
  if (noto) return noto;
  const base = datiGuida<unknown>(chiave);
  const righe = base === null ? [] : correzioniDelBlocco(chiave);
  const risultato: BloccoCorretto = righe.length === 0 ? { dati: base, orfane: [] } : applicaCorrezioni(base, righe);
  cacheCorretti.set(chiave, risultato);
  return risultato;
}

/**
 * Il blocco della guida con le correzioni dell'utente (B11): è quello che le pagine mostrano. Senza correzioni restituisce LO STESSO oggetto
 * di `datiGuida` (nessun cambio di comportamento dove l'utente non ha corretto niente). Congelato e condiviso come `datiGuida`; si svuota
 * con la stessa invalidazione. Le migrazioni e chi cerca l'identità di un elemento (chiavi, riferimenti al catalogo) leggono `datiGuida`.
 */
export function datiGuidaCorretti<T>(chiave: string): Congelato<T> | null {
  return bloccoCorretto(chiave).dati as Congelato<T> | null;
}

/** Gli indirizzi delle correzioni di un blocco che la guida di oggi non accoglie più (elemento sparito o valore di un altro tipo). */
export function correzioniOrfane(chiave: string): string[] {
  return bloccoCorretto(chiave).orfane;
}

/**
 * Un blocco della guida letto da un database qualunque (le migrazioni e le conversioni lavorano su una connessione loro, prima
 * che l'app la usi): null se la tabella o la chiave non ci sono o se il JSON è illeggibile. Senza cache: la usa chi gira una volta.
 */
export function bloccoGuidaDi(db: AppDatabase, chiave: string): unknown {
  const tabella = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'dati_guida'").get();
  if (!tabella) return null;
  const riga = db.prepare('SELECT json FROM dati_guida WHERE chiave = ?').get(chiave) as { json: string } | undefined;
  if (!riga) return null;
  try {
    return JSON.parse(riga.json) as unknown;
  } catch {
    return null;
  }
}

/** Da chiamare dopo una scrittura su `dati_guida`; la chiamano anche le sostituzioni dei dati di gioco (registro comune). */
export const invalidaDatiGuida = registraCacheDiGioco(() => {
  cache.clear();
  cacheCorretti.clear();
  finestre = null;
});

// ---- Le finestre dei Palazzi (`finestre-dungeon`) ----

/** Quando un Palazzo è aperto nel calendario: dal giorno `dal` (MM-GG) fino ad `al` (o senza fine). */
export interface FinestraDungeon { dal: string; al: string | null }

/** Le finestre di un blocco `finestre-dungeon` già analizzato: solo quelle con un inizio. Pura, per chi legge un altro database. */
export function finestreDaDati(dati: unknown): Map<string, FinestraDungeon> {
  const out = new Map<string, FinestraDungeon>();
  const elenco = (dati as { finestre?: unknown } | null)?.finestre;
  if (!Array.isArray(elenco)) return out;
  for (const f of elenco as Array<{ dungeon?: unknown; dal?: unknown; al?: unknown }>) {
    if (typeof f?.dungeon === 'string' && typeof f.dal === 'string' && f.dal) out.set(f.dungeon, { dal: f.dal, al: typeof f.al === 'string' ? f.al : null });
  }
  return out;
}

/** Le finestre dei Palazzi. L6 (§4.4): stanno nelle colonne `dungeon.finestra_dal`/`finestra_al` (migrazione 118, un solo scrittore:
 *  `impostaFinestra`, che scrive anche furto consigliato e lettera e svuota questa copia; dalla 308 sono l'apertura e la scadenza della
 *  scheda del Palazzo, senza più i testi in prosa accanto); il blocco `finestre-dungeon` della guida si legge solo su uno schema di prima della 118. Una trascrizione
 *  illeggibile vale «nessuna finestra»: non si indovina una data. */
export function finestreDungeon(): ReadonlyMap<string, FinestraDungeon> {
  if (finestre) return finestre;
  try {
    const righe = prepared('SELECT chiave, finestra_dal, finestra_al FROM dungeon WHERE finestra_dal IS NOT NULL').all() as Array<{ chiave: string; finestra_dal: string; finestra_al: string | null }>;
    finestre = new Map(righe.map((r) => [r.chiave, { dal: r.finestra_dal, al: r.finestra_al }]));
    return finestre;
  } catch { /* uno schema di prima della 118: le colonne non ci sono */ }
  let dati: unknown;
  try {
    dati = datiGuida('finestre-dungeon');
  } catch {
    dati = null;
  }
  finestre = finestreDaDati(dati);
  return finestre;
}
