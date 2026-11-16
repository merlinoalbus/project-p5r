// ============================================================
// pacchettoGioco — il pacchetto di gioco spedito con il repository, e il primo avvio
// ============================================================
//
// La sorgente dei dati di gioco di un'istanza nuova è il pacchetto, un solo file `gioco.db` rigenerato dai dati
// dell'istanza che si cura (`npm run pacchetto`):
// - `pacchetto/gioco.db` (in git, pochi MB): schema e dati di gioco alla versione che il codice legge (`VERSIONE_GIOCO`),
//   SENZA il contenuto delle immagini. Al primo avvio, quando in `DATA_DIR` non c'è ancora `gioco.db`, viene copiato lì,
//   così l'interfaccia si apre subito. Le immagini arrivano con un backup completo dei dati di gioco, dall'app
//   (Impostazioni → Pacchetto di gioco → «Importa il file scelto», dalla cartella d’appoggio), che sostituisce il file dell'istanza;
// - `pacchetto/partite-vuoto.db` (in git): il modello del file delle partite (`server/db/partiteVuote.ts`).
//
// `caricaPacchetto(db)` fa la stessa cosa dentro una connessione già aperta (i test, che lavorano
// in memoria): copia schema e righe del pacchetto in un file di gioco vuoto, crea le partite dal modello e
// verifica che i due file siano alla versione attesa.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { resolveDbPath, type AppDatabase } from '../../db/dbService.js';
import { haTabella } from '../../db/colonne.js';
import { creaPartiteDalModelloSeMancano } from '../../db/partiteVuote.js';
import { verificaVersioni } from '../../db/versioneSchema.js';
import { invalidaCacheDiGioco } from '../cacheDiGioco.js';
import { traduciNomiSpilli } from '../mappe/nomiSpilli.js';
import { riallineaSpilliLuoghi } from '../mappe/riallineaSpilliLuoghi.js';
import { assegnaUidMancanti } from '../mappe/identitaSpillo.js';
import { pulisciMiniatureOrfane } from '../miniatureService.js';

/** L'esito delle regole sui dati: i conteggi (0 se la regola è fallita) e i nomi delle regole fallite (solo in modo tollerante). */
export interface EsitoRegoleAvvio { spilliTradotti: number; spilliRiallineati: number; spilliIdentificati: number; miniatureOrfane: number; regoleFallite: string[] }

/** Le regole sui dati che ogni avvio riapplica: nomi degli spilli non identificati, spilli dei luoghi allineati al catalogo dei
 *  tipi, uid degli spilli che non ne hanno, miniature rimaste senza la loro immagine. Tutte idempotenti.
 *
 *  Una sola implementazione, due modi (R-1): `'tollerante'` è quello dell'avvio (decisione dell'utente: «il server deve partire»):
 *  ogni regola gira da sola, un errore si registra col nome della regola, vale 0 ed entra in `regoleFallite`, e le altre girano lo
 *  stesso. `'rigido'` (predefinito) è quello di importazione e caricamento del pacchetto: il primo errore si rilancia, così
 *  l'operazione torna alla copia di sicurezza. Che cosa fanno le regole non cambia. */
export function regoleAllAvvio(db: AppDatabase, modo: 'rigido' | 'tollerante' = 'rigido'): EsitoRegoleAvvio {
  const regoleFallite: string[] = [];
  const prova = (nome: string, regola: () => number): number => {
    if (modo === 'rigido') return regola();
    try { return regola(); } catch (err) { regoleFallite.push(nome); logger.error({ regola: nome, err }, 'regola sui dati all\'avvio fallita: l\'avvio prosegue'); return 0; }
  };
  const esito = {
    spilliTradotti: prova('traduciNomiSpilli', () => traduciNomiSpilli(db)),
    spilliRiallineati: prova('riallineaSpilliLuoghi', () => riallineaSpilliLuoghi(db)),
    spilliIdentificati: prova('assegnaUidMancanti', () => assegnaUidMancanti(db)),
    // le miniature senza la loro sorgente, o di un'altra versione dell'immagine, se ne vanno (L1)
    miniatureOrfane: prova('pulisciMiniatureOrfane', () => pulisciMiniatureOrfane(db)),
  };
  return { ...esito, regoleFallite };
}

/** Il pacchetto di gioco (in git): schema e dati senza il contenuto delle immagini; è ciò che il primo avvio copia e ciò che i test caricano. */
export function percorsoPacchettoDb(): string {
  return path.join(config.pacchettoDir, 'gioco.db');
}

/**
 * Prima di aprire la connessione: se il file di gioco dell'istanza manca, arriva dal pacchetto (senza immagini: l'interfaccia si
 * apre, un backup completo si importa poi dall'app e lo sostituisce). Con `:memory:` o con il file già al suo posto non c'è nulla
 * da fare. Restituisce `database: true` se ha copiato il file.
 *
 * Senza il file dell'istanza e senza il pacchetto non c'è niente da cui far nascere i dati di gioco: lancia, e non lascia un
 * `gioco.db` vuoto che l'avvio successivo scambierebbe per i dati dell'istanza.
 */
export function assicuraPacchettoIniziale(dbPath: string = resolveDbPath()): { database: boolean } {
  if (dbPath === ':memory:' || fs.existsSync(dbPath)) return { database: false };
  const sorgente = percorsoPacchettoDb();
  if (!fs.existsSync(sorgente)) {
    throw new Error(`Né il file dei dati di gioco dell'istanza (${dbPath}) né il pacchetto di gioco (${sorgente}): non c'è niente da cui far nascere l'istanza. Il pacchetto fa parte del repository (cartella del pacchetto, PACCHETTO_DIR).`);
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  // copia su un nome provvisorio e poi rinomina: un arresto a metà non lascia un file di gioco troncato al posto di quello vero
  const provvisorio = `${dbPath}.nuovo-${process.pid}`;
  try {
    fs.copyFileSync(sorgente, provvisorio);
    fs.renameSync(provvisorio, dbPath);
  } catch (err) {
    fs.rmSync(provvisorio, { force: true });
    throw err;
  }
  logger.info({ sorgente, dbPath }, 'file di gioco creato dal pacchetto (senza immagini): importa un backup completo da Impostazioni → Backup dei dati di gioco');
  return { database: true };
}

/** Le tabelle di sistema che non si copiano dal pacchetto. */
const NON_DAL_PACCHETTO = new Set(['sqlite_sequence', 'sqlite_stat1']);

/**
 * Le tabelle di dati derivati: dal pacchetto si prende lo schema ma mai le righe. Le miniature si rigenerano dall'istanza; lo
 * script del pacchetto le svuota comunque.
 */
const SOLO_SCHEMA = new Set(['immagine_miniatura']);

/**
 * Carica il pacchetto dentro la connessione aperta, su un file di gioco **vuoto** (l'avvio in memoria dei test): schema e righe
 * arrivano dal pacchetto e `main.user_version` diventa quella del pacchetto; il file delle partite nasce dal modello se non ha
 * tabelle; poi si verifica che i due file siano alla versione che il codice legge e si applicano le regole sui dati.
 * Su un file di gioco che ha già le sue tabelle solleva un errore: per aggiornare i dati della guida c'è `ricaricaPacchetto`.
 */
export function caricaPacchetto(db: AppDatabase, percorso: string = percorsoPacchettoDb(), opzioni: { conImmagini?: boolean } = {}): { tabelle: number; righe: number; versione: number } {
  if (!fs.existsSync(percorso)) throw new Error(`Il pacchetto di gioco manca: ${percorso}.`);
  if (db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' LIMIT 1").get()) {
    throw new Error('caricaPacchetto vuole un file di gioco vuoto: qui le tabelle di gioco ci sono già (per aggiornare i dati della guida usa ricaricaPacchetto).');
  }
  db.prepare('ATTACH DATABASE ? AS pacchetto').run(percorso);
  let tabelle = 0; let righe = 0;
  const versione = db.pragma('pacchetto.user_version', { simple: true }) as number;
  try {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      const oggetti = db.prepare("SELECT type, name, sql FROM pacchetto.sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid").all() as Array<{ type: string; name: string; sql: string }>;
      for (const o of oggetti) {
        if (NON_DAL_PACCHETTO.has(o.name)) continue;
        // la DDL del pacchetto vale così com'è: nomi senza schema finiscono in main
        db.exec(o.sql);
        if (o.type !== 'table' || SOLO_SCHEMA.has(o.name)) continue;
        // il contenuto delle immagini (centinaia di MB) entra solo se richiesto: le righe restano, senza byte
        const colonne = (db.prepare(`PRAGMA pacchetto.table_info("${o.name}")`).all() as Array<{ name: string }>).map((c) => c.name)
          .filter((c) => opzioni.conImmagini || !(o.name === 'immagine' && c === 'contenuto')).map((c) => `"${c}"`).join(', ');
        righe += db.prepare(`INSERT INTO main."${o.name}" (${colonne}) SELECT ${colonne} FROM pacchetto."${o.name}"`).run().changes;
        tabelle++;
      }
      db.pragma(`main.user_version = ${versione}`);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
    db.prepare('DETACH DATABASE pacchetto').run();
  }
  creaPartiteDalModelloSeMancano(db);
  verificaVersioni(db);
  regoleAllAvvio(db, 'rigido');
  invalidaCacheDiGioco();
  return { tabelle, righe, versione };
}

/**
 * Ricarica i dati della guida dal pacchetto dentro un file di gioco già formato, conservando ciò
 * che è dell'utente: nelle tabelle con `origine` restano le righe `utente` e quelle della guida
 * corrette (`seed_json`), e le righe del pacchetto entrano solo dove la chiave è libera; le altre
 * tabelle vengono sostituite. Il contratto è «quello che aggiungi resta anche quando i dati della
 * guida vengono aggiornati»; lo usano i test.
 */
export function ricaricaPacchetto(db: AppDatabase, percorso: string = percorsoPacchettoDb()): { tabelle: number; righe: number } {
  if (!fs.existsSync(percorso)) throw new Error(`Il pacchetto di gioco manca: ${percorso}.`);
  db.prepare('ATTACH DATABASE ? AS pacchetto').run(percorso);
  let tabelle = 0; let righe = 0;
  try {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      const nomi = (db.prepare("SELECT name FROM pacchetto.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>).map((r) => r.name);
      for (const t of nomi) {
        if (NON_DAL_PACCHETTO.has(t) || SOLO_SCHEMA.has(t) || !haTabella(db, t)) continue;
        const colonne = (db.prepare(`PRAGMA main.table_info("${t}")`).all() as Array<{ name: string }>).map((c) => c.name);
        const nelPacchetto = new Set((db.prepare(`PRAGMA pacchetto.table_info("${t}")`).all() as Array<{ name: string }>).map((c) => c.name));
        const comuni = colonne.filter((c) => nelPacchetto.has(c)).map((c) => `"${c}"`).join(', ');
        if (colonne.includes('origine')) {
          db.prepare(`DELETE FROM main."${t}" WHERE origine = 'seed'${colonne.includes('seed_json') ? ' AND seed_json IS NULL' : ''}${colonne.includes('nascosto') ? ' AND nascosto = 0' : ''}`).run();
          righe += db.prepare(`INSERT OR IGNORE INTO main."${t}" (${comuni}) SELECT ${comuni} FROM pacchetto."${t}"`).run().changes;
        } else {
          db.prepare(`DELETE FROM main."${t}"`).run();
          righe += db.prepare(`INSERT INTO main."${t}" (${comuni}) SELECT ${comuni} FROM pacchetto."${t}"`).run().changes;
        }
        tabelle++;
      }
      // Le copie dei pezzi vivono in una tabella a parte dai loro ritagli: nessuna copia resta senza il suo ritaglio (nota N2 del validatore).
      if (nomi.includes('pezzo_mappa')) {
        db.prepare('DELETE FROM main.copia_pezzo WHERE pezzo_id NOT IN (SELECT id FROM main.pezzo_mappa)').run();
      }
    })();
  } finally {
    db.pragma('foreign_keys = ON');
    db.prepare('DETACH DATABASE pacchetto').run();
  }
  // le immagini sono state sostituite a chiavi esterne spente: le miniature rimaste senza la loro sorgente se ne vanno (L1)
  pulisciMiniatureOrfane(db);
  invalidaCacheDiGioco();
  return { tabelle, righe };
}
