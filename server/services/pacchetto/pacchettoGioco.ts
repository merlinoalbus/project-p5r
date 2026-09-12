// ============================================================
// pacchettoGioco — il pacchetto di gioco spedito con il repository, e il primo avvio
// ============================================================
//
// Decisione dell'utente (2026-09-12): il seed JSON è dismesso. La sorgente dei dati di gioco è il
// pacchetto, un solo file `gioco.db` manutenuto con l'app (si esporta, si corregge, si reimporta):
// - `pacchetto/gioco.db` (in git, pochi MB): schema e dati di gioco SENZA il contenuto delle immagini.
//   Al primo avvio, quando in `DATA_DIR` non c'è ancora `gioco.db`, viene copiato lì, così l'interfaccia
//   si apre subito; poi le migrazioni lo portano alla versione del codice, come per ogni istanza;
// - `pacchetto/completo/gioco.db` (fuori da git, ~311 MB, stesso nome): con le immagini dentro
//   (migrazione 079). Il caricamento iniziale completo avviene SEMPRE dall'app (Impostazioni →
//   Pacchetto di gioco → «Importa un pacchetto») e sostituisce il file dell'istanza sul volume.
//
// `caricaPacchetto(db)` fa la stessa cosa dentro una connessione già aperta (i test, che lavorano
// in memoria): copia schema e righe del pacchetto nel file di gioco e poi applica le migrazioni
// mancanti. È l'erede di `caricaSeed`.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { resolveDbPath, type AppDatabase } from '../../db/dbService.js';
import { runMigrations } from '../../db/migrationRunner.js';
import { invalidaCacheTraduzioni } from '../traduzioniService.js';
import { invalidaMotoreFusione } from '../fusione/motoreFusione.js';
import { invalidaEredita } from '../fusione/eredita.js';
import { traduciNomiSpilli } from '../../db/migrations/053_nomi_spilli_in_italiano.js';
import { collegaLuoghiAllePlanimetrie } from '../../db/migrations/054_luoghi_con_la_loro_planimetria.js';
import { riallineaSpilliLuoghi } from '../mappe/sincronizzaMappe.js';
import { assegnaUidMancanti } from '../mappe/identitaSpillo.js';
import { assorbiFileDelleRighe } from '../../db/migrations/079_immagini_nel_database.js';

/** Le regole sui dati che ogni avvio riapplica (non c'è più un seed da ricaricare): nomi degli
 *  spilli non identificati, luoghi legati alla planimetria omonima, spilli dei luoghi allineati
 *  al catalogo dei tipi, immagini rimaste su disco assorbite nel database. Tutte idempotenti. */
export function regoleAllAvvio(db: AppDatabase): { spilliTradotti: number; luoghiCollegati: number; spilliRiallineati: number; spilliIdentificati: number; immaginiAssorbite: number } {
  return { spilliTradotti: traduciNomiSpilli(db), luoghiCollegati: collegaLuoghiAllePlanimetrie(db), spilliRiallineati: riallineaSpilliLuoghi(db), spilliIdentificati: assegnaUidMancanti(db), immaginiAssorbite: assorbiImmaginiSuDisco(db) };
}

/**
 * Le immagini che qualcosa ha lasciato su disco (un backup dell'istanza di prima della 079, ripristinato
 * dopo) entrano nel database; poi la cartella `DATA_DIR/immagini` viene messa da parte in `backups/`
 * (mai cancellata: se conteneva file che nessuna riga referenzia, restano lì). Da un database in memoria
 * (i test) non si tocca il disco.
 */
export function assorbiImmaginiSuDisco(db: AppDatabase): number {
  const cartella = path.join(config.dataDir, 'immagini');
  if (!fs.existsSync(cartella) || !haColonnaContenuto(db)) return 0;
  const inMemoria = !(db.pragma('database_list') as Array<{ name: string; file: string }>).find((d) => d.name === 'main')?.file;
  if (inMemoria) return 0;
  const n = assorbiFileDelleRighe(db, [cartella]);
  const destinazione = path.join(config.dataDir, 'backups', `immagini-su-disco-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  fs.mkdirSync(path.dirname(destinazione), { recursive: true });
  try {
    fs.renameSync(cartella, destinazione);
  } catch {
    fs.cpSync(cartella, destinazione, { recursive: true });
    fs.rmSync(cartella, { recursive: true, force: true });
  }
  logger.info({ assorbite: n, destinazione }, 'immagini su disco assorbite nel database; la cartella è stata messa da parte');
  return n;
}

function haColonnaContenuto(db: AppDatabase): boolean {
  return (db.prepare('PRAGMA main.table_info(immagine)').all() as Array<{ name: string }>).some((c) => c.name === 'contenuto');
}

/** Il pacchetto iniziale (in git): schema e dati senza immagini; è ciò che il primo avvio copia e ciò che i test caricano. */
export function percorsoPacchettoDb(): string {
  return path.join(config.pacchettoDir, 'gioco.db');
}

/** Il pacchetto completo (fuori da git, stesso nome): con le immagini dentro; si importa dall'app e sostituisce il file dell'istanza. */
export function percorsoPacchettoCompleto(): string {
  return path.join(config.pacchettoDir, 'completo', 'gioco.db');
}

/**
 * Prima di aprire la connessione: se il file di gioco dell'istanza manca, arriva dal pacchetto iniziale
 * (senza immagini: l'interfaccia si apre, il completo si importa poi dall'app e lo sostituisce). Con
 * `:memory:` non c'è nulla da fare. Se anche l'iniziale manca, l'istanza nasce con lo schema vuoto
 * (`pacchettoAssente`) e tutto arriva dall'importazione.
 */
export function assicuraPacchettoIniziale(dbPath: string = resolveDbPath()): { database: boolean; pacchettoAssente?: boolean } {
  if (dbPath === ':memory:' || fs.existsSync(dbPath)) return { database: false };
  // il vecchio file unico viene rinominato da initDb: se c'è, non si tocca il pacchetto
  if (dbPath === resolveDbPath() && fs.existsSync(path.join(config.dataDir, config.dbFileNameLegacy))) return { database: false };
  const sorgente = percorsoPacchettoDb();
  if (!fs.existsSync(sorgente)) {
    logger.warn({ sorgente }, 'pacchetto iniziale assente: l\'istanza nasce vuota, importa il pacchetto completo da Impostazioni → Pacchetto di gioco');
    return { database: false, pacchettoAssente: true };
  }
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(sorgente, dbPath);
  logger.info({ sorgente, dbPath }, 'file di gioco creato dal pacchetto iniziale (senza immagini): importa il pacchetto completo da Impostazioni → Pacchetto di gioco');
  return { database: true };
}

/** Le tabelle di sistema o di partita che non si copiano dal pacchetto. */
const NON_DAL_PACCHETTO = new Set(['sqlite_sequence', 'sqlite_stat1']);

/**
 * Carica il pacchetto dentro la connessione aperta e applica le migrazioni mancanti. Due casi:
 * - file di gioco **vuoto** (l'avvio in memoria dei test): schema e righe arrivano dal pacchetto e
 *   `user_version` diventa quella del pacchetto, poi le migrazioni successive;
 * - file di gioco con lo **schema già formato ma senza dati** (un test che ha applicato le migrazioni
 *   fino a una certa versione): entrano solo le righe, per le colonne in comune, e la versione resta
 *   quella dello schema, così le migrazioni mancanti convertono i dati come su un'istanza vecchia.
 * Su un file che ha già dati di gioco solleva un errore: per quello c'è `ricaricaPacchetto`.
 */
export function caricaPacchetto(db: AppDatabase, percorso: string = percorsoPacchettoDb(), opzioni: { conImmagini?: boolean } = {}): { tabelle: number; righe: number; versione: number } {
  if (!fs.existsSync(percorso)) throw new Error(`Il pacchetto di gioco manca: ${percorso}.`);
  const tabelleMain = new Set((db.prepare("SELECT name FROM main.sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as Array<{ name: string }>).map((r) => r.name));
  const schemaFormato = tabelleMain.size > 0;
  if (schemaFormato && tabelleMain.has('persona') && (db.prepare('SELECT COUNT(*) AS n FROM main.persona').get() as { n: number }).n > 0) {
    throw new Error('caricaPacchetto vuole un file di gioco senza dati: qui ci sono già dati di gioco (usa ricaricaPacchetto).');
  }
  db.prepare('ATTACH DATABASE ? AS pacchetto').run(percorso);
  let tabelle = 0; let righe = 0;
  const versione = schemaFormato ? (db.pragma('main.user_version', { simple: true }) as number) : (db.pragma('pacchetto.user_version', { simple: true }) as number);
  try {
    db.pragma('foreign_keys = OFF');
    db.transaction(() => {
      const oggetti = db.prepare("SELECT type, name, sql FROM pacchetto.sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 ELSE 2 END, rowid").all() as Array<{ type: string; name: string; sql: string }>;
      for (const o of oggetti) {
        if (NON_DAL_PACCHETTO.has(o.name)) continue;
        // il contenuto delle immagini (centinaia di MB) entra solo se richiesto: le righe restano, senza byte
        const senzaByte = (t: string, c: string) => !opzioni.conImmagini && t === 'immagine' && c === 'contenuto';
        if (!schemaFormato) {
          // la DDL del pacchetto vale così com'è: nomi senza schema finiscono in main
          db.exec(o.sql);
          if (o.type === 'table') {
            const colonne = (db.prepare(`PRAGMA pacchetto.table_info("${o.name}")`).all() as Array<{ name: string }>).map((c) => c.name).filter((c) => !senzaByte(o.name, c)).map((c) => `"${c}"`).join(', ');
            righe += db.prepare(`INSERT INTO main."${o.name}" (${colonne}) SELECT ${colonne} FROM pacchetto."${o.name}"`).run().changes; tabelle++;
          }
        } else if (o.type === 'table' && tabelleMain.has(o.name)) {
          const colonne = (db.prepare(`PRAGMA main.table_info("${o.name}")`).all() as Array<{ name: string }>).map((c) => c.name);
          const nelPacchetto = new Set((db.prepare(`PRAGMA pacchetto.table_info("${o.name}")`).all() as Array<{ name: string }>).map((c) => c.name));
          const comuni = colonne.filter((c) => nelPacchetto.has(c) && !senzaByte(o.name, c)).map((c) => `"${c}"`).join(', ');
          if (!comuni) continue;
          righe += db.prepare(`INSERT OR IGNORE INTO main."${o.name}" (${comuni}) SELECT ${comuni} FROM pacchetto."${o.name}"`).run().changes;
          tabelle++;
        }
      }
      if (!schemaFormato) db.pragma(`main.user_version = ${versione}`);
    })();
  } finally {
    db.pragma('foreign_keys = ON');
    db.prepare('DETACH DATABASE pacchetto').run();
  }
  runMigrations(db);
  regoleAllAvvio(db);
  invalidaCacheTraduzioni();
  invalidaMotoreFusione();
  invalidaEredita();
  return { tabelle, righe, versione };
}

/**
 * Ricarica i dati della guida dal pacchetto dentro un file di gioco già formato, conservando ciò
 * che è dell'utente: nelle tabelle con `origine` restano le righe `utente` e quelle della guida
 * corrette (`seed_json`), e le righe del pacchetto entrano solo dove la chiave è libera; le altre
 * tabelle vengono sostituite. È il contratto che aveva il reseed («quello che aggiungi resta
 * anche quando i dati della guida vengono aggiornati»), usato dai test.
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
        if (NON_DAL_PACCHETTO.has(t) || !db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t)) continue;
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
    })();
  } finally {
    db.pragma('foreign_keys = ON');
    db.prepare('DETACH DATABASE pacchetto').run();
  }
  invalidaCacheTraduzioni();
  invalidaMotoreFusione();
  invalidaEredita();
  return { tabelle, righe };
}
