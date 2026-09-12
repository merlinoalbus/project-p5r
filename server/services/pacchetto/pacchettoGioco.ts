// ============================================================
// pacchettoGioco — il pacchetto di gioco spedito con il repository, e il primo avvio
// ============================================================
//
// Decisione dell'utente (2026-09-12): il seed JSON è dismesso. La sorgente dei dati di gioco è
// `pacchetto/gioco.db` (con le immagini in `pacchetto/immagini/`), generato una volta dal seed e da
// allora manutenuto con l'app: si esporta, si corregge, si reimporta. Al primo avvio, quando in
// `DATA_DIR` non c'è ancora `gioco.db`, il file del pacchetto viene copiato lì (e con lui le
// immagini); poi le migrazioni lo portano alla versione del codice, come per ogni istanza.
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

/** Le regole sui dati che ogni avvio riapplica (non c'è più un seed da ricaricare): nomi degli
 *  spilli non identificati, luoghi legati alla planimetria omonima, spilli dei luoghi allineati
 *  al catalogo dei tipi. Tutte idempotenti. */
export function regoleAllAvvio(db: AppDatabase): { spilliTradotti: number; luoghiCollegati: number; spilliRiallineati: number; spilliIdentificati: number } {
  return { spilliTradotti: traduciNomiSpilli(db), luoghiCollegati: collegaLuoghiAllePlanimetrie(db), spilliRiallineati: riallineaSpilliLuoghi(db), spilliIdentificati: assegnaUidMancanti(db) };
}

/** Il file del pacchetto. */
export function percorsoPacchettoDb(): string {
  return path.join(config.pacchettoDir, 'gioco.db');
}

/** Le immagini del pacchetto (stessa struttura di `DATA_DIR/immagini`: `<ambito>/<nome-file>`). */
export function percorsoPacchettoImmagini(): string {
  return path.join(config.pacchettoDir, 'immagini');
}

/** Copia una cartella di file (ricorsiva) senza sovrascrivere quelli già presenti. */
function copiaSenzaSovrascrivere(da: string, a: string): number {
  if (!fs.existsSync(da)) return 0;
  let n = 0;
  for (const voce of fs.readdirSync(da, { withFileTypes: true })) {
    const s = path.join(da, voce.name);
    const d = path.join(a, voce.name);
    if (voce.isDirectory()) n += copiaSenzaSovrascrivere(s, d);
    else if (voce.isFile() && !fs.existsSync(d)) { fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); n++; }
  }
  return n;
}

/**
 * Prima di aprire la connessione: se il file di gioco dell'istanza manca, arriva dal pacchetto.
 * Con `:memory:` non c'è nulla da fare. Restituisce che cosa è stato copiato.
 */
export function assicuraPacchettoIniziale(dbPath: string = resolveDbPath()): { database: boolean; immagini: number } {
  if (dbPath === ':memory:' || fs.existsSync(dbPath)) return { database: false, immagini: 0 };
  // il vecchio file unico viene rinominato da initDb: se c'è, non si tocca il pacchetto
  if (dbPath === resolveDbPath() && fs.existsSync(path.join(config.dataDir, config.dbFileNameLegacy))) return { database: false, immagini: 0 };
  const sorgente = percorsoPacchettoDb();
  if (!fs.existsSync(sorgente)) throw new Error(`Il pacchetto di gioco manca: ${sorgente}. L'app non ha da dove prendere i dati di gioco.`);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.copyFileSync(sorgente, dbPath);
  const immagini = copiaSenzaSovrascrivere(percorsoPacchettoImmagini(), path.join(config.dataDir, 'immagini'));
  logger.info({ sorgente, dbPath, immagini }, 'file di gioco creato dal pacchetto');
  return { database: true, immagini };
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
export function caricaPacchetto(db: AppDatabase, percorso: string = percorsoPacchettoDb()): { tabelle: number; righe: number; versione: number } {
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
        if (!schemaFormato) {
          // la DDL del pacchetto vale così com'è: nomi senza schema finiscono in main
          db.exec(o.sql);
          if (o.type === 'table') { righe += db.prepare(`INSERT INTO main."${o.name}" SELECT * FROM pacchetto."${o.name}"`).run().changes; tabelle++; }
        } else if (o.type === 'table' && tabelleMain.has(o.name)) {
          const colonne = (db.prepare(`PRAGMA main.table_info("${o.name}")`).all() as Array<{ name: string }>).map((c) => c.name);
          const nelPacchetto = new Set((db.prepare(`PRAGMA pacchetto.table_info("${o.name}")`).all() as Array<{ name: string }>).map((c) => c.name));
          const comuni = colonne.filter((c) => nelPacchetto.has(c)).map((c) => `"${c}"`).join(', ');
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
