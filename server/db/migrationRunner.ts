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
import { righeArchiviate } from './migrations/archivioL1.js';

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

/** Un passo da fare dentro la transazione di una migrazione, subito prima della sua `up` (per id). */
type PrimaDi = ReadonlyMap<number, (db: AppDatabase) => void>;

/** Applica in ordine le migrazioni successive a `PRAGMA <schema>.user_version`; `primaDi`: i passi da fare nella stessa transazione, prima della `up`. */
function applica(db: AppDatabase, schema: 'main' | 'utente', list: Migration[], primaDi: PrimaDi = new Map()): void {
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
        try { primaDi.get(m.id)?.(db); m.up(db); } catch (cause) {
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
 * un file di gioco che quella colonna non l'ha più (la 357 l'ha tolta) non partirebbe: la colonna torna vuota solo per quel passaggio, e la utente 69 la
 * toglie di nuovo subito dopo la 015. Le istanze con le partite già oltre la 15 non passano mai di qui. Va chiamata subito prima di applicare le
 * migrazioni delle partite, in tutti e due gli ordini di `runMigrations`.
 */
function rimettiProduceJsonPerLaUtente015(db: AppDatabase, listaUtente: Migration[]): void {
  if (!listaUtente.some((m) => m.id === 15) || !listaUtente.some((m) => m.id === 69)) return;
  if ((db.pragma('utente.user_version', { simple: true }) as number) >= 15) return;
  const colonne = db.pragma('main.table_info(voce_giornata)') as Array<{ name: string }>;
  if (colonne.length > 0 && !colonne.some((c) => c.name === 'produce_json')) db.exec(`ALTER TABLE main.voce_giornata ADD COLUMN produce_json TEXT NOT NULL DEFAULT '[]'`);
}

/**
 * Rilievo della revisione automatica sulla PR 116: la migrazione utente 020, registrata, toglie i timbri raccolti nelle aree dei dedali SENZA un
 * totale (`area_dedalo.timbri_totale IS NULL`). Dalla migrazione di gioco 382 i totali delle aree sono tutti a NULL (i valori nell'archivio
 * `area_dedalo.timbri_totale`) e il totale è del dedalo: su un `partite.db` ancora prima della 020 (una copia vecchia rimessa, un file rimasto
 * indietro) la 020 toglierebbe anche i raccolti delle aree che un totale l'avevano, prima che la utente 070 li porti al dedalo. Qui, nella stessa
 * transazione della 020 e subito prima, i raccolti delle aree che prima della 382 avevano un totale (quelli che la 020 avrebbe tenuto) passano al
 * loro dedalo come fa la 070 (somma con una riga già del dedalo, ultimo `updated_at`); quelli delle aree senza totale li toglie la 020, come ha
 * sempre fatto (il loro motivo, la 101, viene prima della 382). Senza la 382 applicata (archivio senza quei valori, colonna del dedalo assente)
 * non fa niente: la 020 vede i totali di allora. I file già oltre la 20 non passano mai di qui.
 */
function timbriDelleAreeConTotaleAlDedalo(db: AppDatabase): void {
  const tabella = (schema: 'main' | 'utente', nome: string) => !!db.prepare(`SELECT 1 FROM ${schema}.sqlite_master WHERE type = 'table' AND name = ?`).get(nome);
  if (!tabella('utente', 'timbri_dedalo_partita') || !tabella('main', 'area_dedalo') || !tabella('main', 'dungeon_area') || !tabella('main', 'dati_guida')) return;
  const colonne = (t: string) => (db.pragma(`main.table_info(${t})`) as Array<{ name: string }>).map((c) => c.name);
  if (!colonne('dungeon_area').includes('timbri_totale') || !colonne('area_dedalo').includes('timbri_totale')) return;
  const archivio = righeArchiviate(db, 'area_dedalo.timbri_totale');
  // le aree che avevano un totale prima della 382 e che la 382 ha portato a NULL
  const aree = Object.entries(archivio).filter(([, v]) => v !== null && v !== undefined).map(([k]) => k)
    .filter((k) => db.prepare('SELECT 1 FROM main.area_dedalo WHERE chiave = ? AND timbri_totale IS NULL').get(k));
  if (aree.length === 0) {
    // la 382 c'è ma l'archivio dei totali di prima no (file di gioco sostituito, o nessuna area aveva un totale): la 020 decide sui totali
    // di adesso, tutti vuoti, e toglie i raccolti per area; che non passi in silenzio
    const perArea = db.prepare('SELECT COUNT(*) FROM utente.timbri_dedalo_partita t JOIN main.area_dedalo ad ON ad.chiave = t.area_chiave').pluck().get() as number;
    if (perArea > 0) logger.warn({ righeDiArea: perArea }, 'prima della utente 020: nessun totale delle aree in archivio dalla 382, la 020 toglie i raccolti per area senza totale');
    return;
  }
  const righe = db.prepare(`SELECT t.partita_id, t.area_chiave, t.raccolti, t.updated_at, ad.dedalo_chiave AS dedalo FROM utente.timbri_dedalo_partita t
    JOIN main.area_dedalo ad ON ad.chiave = t.area_chiave WHERE t.area_chiave IN (SELECT value FROM json_each(?)) ORDER BY t.partita_id, ad.dedalo_chiave, t.area_chiave`)
    .all(JSON.stringify(aree)) as Array<{ partita_id: number; area_chiave: string; raccolti: number; updated_at: string; dedalo: string }>;
  if (righe.length === 0) return;
  const totale = () => db.prepare('SELECT COALESCE(SUM(raccolti), 0) FROM utente.timbri_dedalo_partita').pluck().get() as number;
  const primaDi = totale();
  const somme = new Map<string, { partita: number; dedalo: string; raccolti: number; updated: string; aree: string[] }>();
  for (const r of righe) {
    const k = `${r.partita_id}\0${r.dedalo}`;
    if (!somme.has(k)) {
      const gia = db.prepare('SELECT raccolti, updated_at FROM utente.timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').get(r.partita_id, r.dedalo) as { raccolti: number; updated_at: string } | undefined;
      somme.set(k, { partita: r.partita_id, dedalo: r.dedalo, raccolti: gia?.raccolti ?? 0, updated: gia?.updated_at ?? '', aree: [] });
    }
    const s = somme.get(k)!;
    s.raccolti += r.raccolti;
    if (r.updated_at > s.updated) s.updated = r.updated_at;
    s.aree.push(r.area_chiave);
    db.prepare('DELETE FROM utente.timbri_dedalo_partita WHERE partita_id = ? AND area_chiave = ?').run(r.partita_id, r.area_chiave);
  }
  const scrivi = db.prepare('INSERT INTO utente.timbri_dedalo_partita (partita_id, area_chiave, raccolti, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, area_chiave) DO UPDATE SET raccolti = excluded.raccolti, updated_at = excluded.updated_at');
  for (const s of somme.values()) scrivi.run(s.partita, s.dedalo, s.raccolti, s.updated);
  if (totale() !== primaDi) throw new Error(`timbri prima della utente 020: i raccolti erano ${primaDi}, dopo il passaggio ai dedali ${totale()}; nessuna modifica applicata.`);
  logger.info({ righeDiArea: righe.length, dedali: [...somme.values()].map((s) => ({ partita: s.partita, dedalo: s.dedalo, raccolti: s.raccolti, aree: s.aree })) },
    'prima della utente 020: i timbri delle aree con un totale prima della 382 passano al dedalo');
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
  // la utente 020 dopo la 382 di gioco: i timbri delle aree che un totale l'avevano passano prima al dedalo (vale solo con la 070 nell'elenco)
  const primaDiUtente: PrimaDi = listaUtente.some((m) => m.id === 20) && listaUtente.some((m) => m.id === 70) ? new Map([[20, timbriDelleAreeConTotaleAlDedalo]]) : new Map();
  if (partiteDaCreare) {
    // Normale al primo avvio; su un'istanza già usata vuol dire che `partite.db` è sparito e la nuova nasce vuota: nel log deve vedersi.
    logger.warn('partite.db nuovo: il suo schema si crea prima delle migrazioni di gioco');
    rimettiProduceJsonPerLaUtente015(db, listaUtente);
    applica(db, 'utente', listaUtente, primaDiUtente);
    applica(db, 'main', list);
  } else {
    applica(db, 'main', list);
    rimettiProduceJsonPerLaUtente015(db, listaUtente);
    applica(db, 'utente', listaUtente, primaDiUtente);
  }
  // La verifica dell'archivio storico degli acquisti gira solo dentro la migrazione utente 030 che lo crea (`completaContinuitaLegacy`),
  // non a ogni avvio: un archivio che non torna non deve impedire al server di partire (decisione dell'utente: «va bene che giri solo
  // la prima volta»). Le operazioni che lo toccano (cestino, importazione) la richiamano da sé.
}
