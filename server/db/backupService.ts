// ============================================================
// backupService — backup rotante del file SQLite a ogni boot
// ============================================================
//
// Gira PRIMA di runMigrations(): ogni migrazione di schema è preceduta
// da uno snapshot. Usa l'API online-backup di better-sqlite3, l'unica
// sicura con WAL attivo. Rotazione: ultime 7 copie.
// Fallimento = warn e il boot continua.
// ============================================================

import fs from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { getDb, resolveDbPath } from './dbService.js';

const KEEP_LAST = 7;
const PREFIX = 'project-p5r-';

/** Crea una copia consistente del database e conserva gli ultimi 7 snapshot. */
export async function runBootBackup(): Promise<void> {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    return;
  }

  const backupsDir = path.join(config.dataDir, 'backups');
  try {
    fs.mkdirSync(backupsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const target = path.join(backupsDir, `${PREFIX}${stamp}.db`);
    await getDb().backup(target);
    logger.info({ target }, 'backup di avvio completato');

    const entries = fs
      .readdirSync(backupsDir)
      .filter((f) => f.startsWith(PREFIX) && f.endsWith('.db'))
      .sort()
      .reverse();
    for (const stale of entries.slice(KEEP_LAST)) {
      fs.unlinkSync(path.join(backupsDir, stale));
    }
  } catch (err) {
    logger.warn({ err }, 'backup di avvio fallito — si prosegue');
  }
}
