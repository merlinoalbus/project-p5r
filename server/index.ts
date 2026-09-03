// ============================================================
// Entry point — inizializza la persistenza, poi listen
// ============================================================
//
// Sequenza di boot:
//   1. initDb()        — apertura DB, FATALE su errore
//   2. runBootBackup() — snapshot rotante pre-migrazioni, warn-only
//   3. runMigrations() — schema versionato, FATALE su errore
//   4. createApp() + listen(porta)
//
// Arresto: su SIGINT/SIGTERM (Ctrl-C, docker stop) si chiude il server
// HTTP, si esegue `PRAGMA optimize` e si chiude la connessione SQLite.
// In Docker il processo è PID 1 (`node --import tsx`), quindi riceve i
// segnali direttamente.
// ============================================================

import { config } from './config.js';
import { logger } from './utils/logger.js';
import { closeDb, initDb } from './db/dbService.js';
import { runBootBackup } from './db/backupService.js';
import { runMigrations } from './db/migrationRunner.js';
import { createApp } from './bootstrap.js';

try {
  initDb();
} catch (err) {
  console.error('[project-p5r] FATALE: inizializzazione SQLite fallita:', err);
  process.exit(1);
}

await runBootBackup();

try {
  runMigrations(initDb());
} catch (err) {
  console.error('[project-p5r] FATALE: migrazione schema fallita:', err);
  process.exit(1);
}

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, dataDir: config.dataDir },
    `Backend in ascolto su http://localhost:${config.port}`,
  );
});

let inArresto = false;

function arresta(segnale: NodeJS.Signals): void {
  if (inArresto) return;
  inArresto = true;
  logger.info({ segnale }, 'arresto in corso');
  // Timer di sicurezza: se le connessioni non si chiudono, si esce comunque.
  const timer = setTimeout(() => {
    logger.warn('arresto forzato dopo il timeout');
    closeDb();
    process.exit(1);
  }, 5000);
  timer.unref();
  server.close(() => {
    closeDb();
    logger.info('arresto completato');
    process.exit(0);
  });
}

process.on('SIGINT', () => arresta('SIGINT'));
process.on('SIGTERM', () => arresta('SIGTERM'));
