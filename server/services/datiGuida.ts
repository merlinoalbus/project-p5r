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

/** Le finestre dei Palazzi della guida. Una trascrizione illeggibile vale «nessuna finestra»: non si indovina una data. */
export function finestreDungeon(): ReadonlyMap<string, FinestraDungeon> {
  if (finestre) return finestre;
  let dati: unknown;
  try {
    dati = datiGuida('finestre-dungeon');
  } catch {
    dati = null;
  }
  finestre = finestreDaDati(dati);
  return finestre;
}
