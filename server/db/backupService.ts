// ============================================================
// backupService — backup rotante del file SQLite a ogni boot
// ============================================================
//
// Gira PRIMA di runMigrations(): ogni migrazione di schema è preceduta
// da uno snapshot. Usa l'API online-backup di better-sqlite3, l'unica
// sicura con WAL attivo. Rotazione: ultime 7 copie.
// Fallimento = warn e il boot continua.
// Dalla 079 il file di gioco porta dentro le immagini (centinaia di MB): lo
// snapshot si fa solo quando c'è davvero una migrazione da applicare, non a
// ogni avvio, altrimenti sette copie riempirebbero il disco per nulla.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { copiaSchema, getDb, resolveDbPath, resolvePartitePath } from './dbService.js';
import { migrations } from './migrations/index.js';
import { migrazioniUtente } from './migrazioniUtente/index.js';

const KEEP_LAST = 7;
const PREFIX = 'project-p5r-';

/** Toglie i giornali (`-wal`/`-shm`) delle copie di avvio rimasti senza il loro database: le rotazioni di prima toglievano solo
 *  il `.db`, e in `data/backups` ne restavano a decine. Esportata per i test. */
export function pulisciGiornaliOrfani(backupsDir: string): void {
  if (!fs.existsSync(backupsDir)) return;
  for (const f of fs.readdirSync(backupsDir)) {
    const base = f.match(/^(.*\.db)-(?:wal|shm)$/)?.[1];
    if (base && f.startsWith(PREFIX) && !fs.existsSync(path.join(backupsDir, base))) fs.rmSync(path.join(backupsDir, f), { force: true });
  }
}

/** Tiene le ultime `KEEP_LAST` copie di avvio. Una copia vecchia se ne va con le partite accanto e con i giornali di entrambe
 *  (`-wal`/`-shm`): prima si toglieva solo il `.db`, e i giornali restavano a decine. Esportata per i test. */
export function ruotaCopieDiAvvio(backupsDir: string): void {
  const copie = fs
    .readdirSync(backupsDir)
    .filter((f) => f.startsWith(PREFIX) && f.endsWith('.db') && !f.endsWith('.partite.db'))
    .sort()
    .reverse();
  for (const vecchia of copie.slice(KEEP_LAST)) {
    for (const nome of [vecchia, vecchia.replace(/\.db$/, '.partite.db')]) {
      for (const coda of ['', '-wal', '-shm']) fs.rmSync(path.join(backupsDir, `${nome}${coda}`), { force: true });
    }
  }
  pulisciGiornaliOrfani(backupsDir);
}

/** Crea una copia consistente del database e conserva gli ultimi 7 snapshot. */
export async function runBootBackup(): Promise<void> {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    return;
  }
  try {
    pulisciGiornaliOrfani(path.join(config.dataDir, 'backups'));
  } catch (err) {
    logger.warn({ err }, 'pulizia dei giornali delle copie di avvio non riuscita — si prosegue');
  }
  // DB appena creato da initDb (nessuna migrazione applicata): nulla da salvare.
  if ((getDb().pragma('user_version', { simple: true }) as number) === 0) {
    return;
  }
  // nessuna migrazione in arrivo su nessuno dei due file: lo snapshot non serve
  const versioneGioco = getDb().pragma('main.user_version', { simple: true }) as number;
  const versionePartite = getDb().pragma('utente.user_version', { simple: true }) as number;
  if (!migrations.some((m) => m.id > versioneGioco) && !migrazioniUtente.some((m) => m.id > versionePartite)) {
    logger.debug({ versioneGioco, versionePartite }, 'backup di avvio saltato: nessuna migrazione da applicare');
    return;
  }

  const backupsDir = path.join(config.dataDir, 'backups');
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(backupsDir, `${PREFIX}${stamp}.db`);
    await copiaSchema(getDb(), target, 'main');
    // il file delle partite accanto, con lo stesso timbro: le due copie vanno insieme
    const targetPartite = path.join(backupsDir, `${PREFIX}${stamp}.partite.db`);
    if (fs.existsSync(resolvePartitePath())) await copiaSchema(getDb(), targetPartite, 'utente');
    logger.info({ target, targetPartite }, 'backup di avvio completato');
    ruotaCopieDiAvvio(backupsDir);
  } catch (err) {
    logger.warn({ err }, 'backup di avvio fallito — si prosegue');
  }
}
