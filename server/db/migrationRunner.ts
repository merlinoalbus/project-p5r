// ============================================================
// Migration runner — versionato su PRAGMA user_version, per ciascuno dei due file
// ============================================================
//
// Ogni migrazione è `{ id, name, up(db) }`; gli array ordinati vivono in
// db/migrations/index.ts (dati di gioco, schema `main`) e in
// db/migrazioniUtente/index.ts (partite, schema `utente`). Ogni migrazione
// applica DDL + bump versione in UNA transazione. Append-only: nessuna down
// migration (il backup pre-migrazione è la via di ripristino).
//
// Due sequenze perché i due file hanno vite diverse: sostituire gioco.db con
// un pacchetto più vecchio o più nuovo non deve rifare le migrazioni delle
// partite, e un partite.db nuovo di zecca accanto a un gioco.db già migrato
// deve ricevere il proprio schema da zero.
// ============================================================

import type { AppDatabase } from './dbService.js';
import { logger } from '../utils/logger.js';
import { migrations as allMigrations } from './migrations/index.js';
import { migrazioniUtente as allUtente } from './migrazioniUtente/index.js';
import { preparaContinuitaLegacy, type OrigineContinuita } from './acquistiLegacy.js';

/** Contratto minimo di una migrazione SQLite append-only. */
export interface Migration {
  id: number;
  name: string;
  up: (db: AppDatabase) => void;
}

/** Le violazioni di chiave esterna di uno schema, come testo confrontabile («tabella#riga→padre»). */
function violazioni(db: AppDatabase, schema: 'main' | 'utente'): Set<string> {
  const righe = db.pragma(`${schema}.foreign_key_check`) as Array<{ table: string; rowid: number | null; parent: string; fkid: number }>;
  return new Set(righe.map((r) => `${r.table}#${r.rowid ?? '?'}→${r.parent}/${r.fkid}`));
}

/** Applica in ordine le migrazioni successive a `PRAGMA <schema>.user_version`. */
function applica(db: AppDatabase, schema: 'main' | 'utente', list: Migration[]): void {
  const current = db.pragma(`${schema}.user_version`, { simple: true }) as number;
  // Uno schema più nuovo del codice (rollback di un deploy, file copiato da un'istanza aggiornata) non si apre: il codice vecchio
  // leggerebbe e scriverebbe tabelle che non corrispondono più al suo modello, con dati corrotti in silenzio. Si ferma l'avvio.
  const ultimo = list.reduce((massimo, m) => Math.max(massimo, m.id), 0);
  if (list.length > 0 && current > ultimo) {
    throw new Error(
      `Lo schema «${schema}» è alla versione ${current}, più nuova dell'ultima conosciuta da questa versione dell'app (${ultimo}): aggiorna l'app, oppure ripristina la copia di avvio in data/backups.`,
    );
  }
  const pending = [...list]
    .sort((a, b) => a.id - b.id)
    .filter((m) => m.id > current);

  for (const m of pending) {
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        // Il controllo delle chiavi esterne sta DENTRO la transazione, prima di avanzare `user_version`: una violazione **portata
        // dalla migrazione** la annulla e la lascia da applicare (fatto dopo il commit, falliva un avvio solo, e a quello dopo i
        // dati incoerenti passavano). Si confrontano le violazioni prima e dopo, nel solo schema della migrazione (SQLite non ha
        // chiavi esterne fra due file): una violazione che c'era già non è colpa della migrazione e non deve bloccare ogni avvio
        // per sempre — si scrive nel log.
        const prima = violazioni(db, schema);
        try { m.up(db); } catch (cause) {
          // l'errore di una migrazione dice quale era: schema, id e nome (la causa originale resta in `cause`)
          throw new Error(`Migrazione ${schema} ${m.id} (${m.name}): ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
        }
        const nuove = [...violazioni(db, schema)].filter((v) => !prima.has(v));
        if (nuove.length > 0) {
          throw new Error(`Migrazione ${schema} ${m.id} (${m.name}): violazioni di integrità referenziale: ${nuove.slice(0, 5).join(', ')}`);
        }
        if (prima.size > 0) logger.warn({ schema, id: m.id, violazioni: [...prima].slice(0, 5), totale: prima.size }, 'violazioni di integrità referenziale già presenti prima della migrazione');
        db.pragma(`${schema}.user_version = ${m.id}`);
      })();
    } finally {
      db.pragma('foreign_keys = ON');
    }
    logger.info({ schema, id: m.id, name: m.name }, 'migrazione applicata');
  }

  if (pending.length === 0) {
    logger.debug({ schema, userVersion: current }, 'schema aggiornato');
  }
}

/**
 * L6-08: la migrazione utente 015, registrata e non modificabile, prepara SQL su `main.voce_giornata.produce_json`. Un file delle partite nuovo accanto a
 * un file di gioco che quella colonna non l'ha più (la 362 l'ha tolta) non partirebbe: la colonna torna vuota solo per quel passaggio, e la utente 69 la
 * toglie di nuovo subito dopo la 015. Le istanze con le partite già oltre la 15 non passano mai di qui. Va chiamata subito prima di applicare le
 * migrazioni delle partite, in tutti e due gli ordini di `runMigrations`.
 */
function rimettiProduceJsonPerLaUtente015(db: AppDatabase, listaUtente: Migration[]): void {
  if (!listaUtente.some((m) => m.id === 15) || !listaUtente.some((m) => m.id === 69)) return;
  if ((db.pragma('utente.user_version', { simple: true }) as number) >= 15) return;
  const colonne = db.pragma('main.table_info(voce_giornata)') as Array<{ name: string }>;
  if (colonne.length > 0 && !colonne.some((c) => c.name === 'produce_json')) db.exec(`ALTER TABLE main.voce_giornata ADD COLUMN produce_json TEXT NOT NULL DEFAULT '[]'`);
}

/** Dalla 066 di gioco le partite stanno nel loro file: prima di quella, è la 066 stessa a riempirlo copiando le righe da `main`. */
const GIOCO_CON_PARTITE_SEPARATE = 66;

/** Vero se `partite.db` è nuovo di zecca (mai migrato e senza tabelle) accanto a un file di gioco che non contiene più le partite. */
function fileDellePartiteNuovo(db: AppDatabase): boolean {
  if ((db.pragma('main.user_version', { simple: true }) as number) < GIOCO_CON_PARTITE_SEPARATE) return false;
  if ((db.pragma('utente.user_version', { simple: true }) as number) !== 0) return false;
  return !db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1").get();
}

/**
 * Di norma le migrazioni dei dati di gioco (`main`), poi quelle delle partite (`utente`). Con un file delle partite nuovo (primo avvio dal
 * pacchetto iniziale, o `partite.db` tolto) l'ordine si inverte: alcune migrazioni di gioco leggono le tabelle delle partite, e il pacchetto è
 * fermo a una versione precedente a queste, quindi il loro schema deve già esistere (lo stesso che hanno trovato le istanze cresciute in linea).
 */
export function runMigrations(db: AppDatabase, list: Migration[] = allMigrations, listaUtente: Migration[] = allUtente, origine: OrigineContinuita = 'continuita-migrazione'): void {
  // Va letto prima della continuità, che crea le sue tabelle nel file delle partite.
  // Senza migrazioni di gioco da applicare (es. lo schema delle partite di un'edizione) l'ordine non conta e non si segnala nulla.
  const partiteDaCreare = list.length > 0 && fileDellePartiteNuovo(db);
  const continuita = listaUtente.some(m => m.id === 30 && m.name === 'continuita_acquisti');
  if (continuita) {
    // Solo append alla prova durevole, prima che il main possa cambiare prezzi/identità.
    // Nessun bump anticipato: la 030 ordinaria adotta il bootstrap dopo le sue dipendenze.
    if ((db.pragma('utente.user_version', { simple: true }) as number) < 30) preparaContinuitaLegacy(db, origine);
  }
  if (partiteDaCreare) {
    // Normale al primo avvio; su un'istanza già usata vuol dire che `partite.db` è sparito e la nuova nasce vuota: nel log deve vedersi.
    logger.warn('partite.db nuovo: il suo schema si crea prima delle migrazioni di gioco');
    rimettiProduceJsonPerLaUtente015(db, listaUtente);
    applica(db, 'utente', listaUtente);
    applica(db, 'main', list);
  } else {
    applica(db, 'main', list);
    rimettiProduceJsonPerLaUtente015(db, listaUtente);
    applica(db, 'utente', listaUtente);
  }
  // La verifica dell'archivio storico degli acquisti gira solo dentro la migrazione utente 030 che lo crea (`completaContinuitaLegacy`),
  // non a ogni avvio: un archivio che non torna non deve impedire al server di partire (decisione dell'utente: «va bene che giri solo
  // la prima volta»). Le operazioni che lo toccano (cestino, importazione) la richiamano da sé.
}
