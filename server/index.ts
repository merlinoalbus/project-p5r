// ============================================================
// Entry point — inizializza la persistenza, poi listen
// ============================================================
//
// Sequenza di boot:
//   1. initDb()        — apertura DB, FATALE su errore
//   2. runBootBackup() — snapshot rotante pre-migrazioni, warn-only
//   3. runMigrations() — schema versionato, FATALE su errore
//   4. caricaSeed()    — compendio Royal da data/seed (idempotente), FATALE su errore
//   5. createApp() + listen(porta)
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
import { caricaSeed } from './services/seed/caricaSeed.js';
import { sincronizzaCondizioniLetture } from './db/migrations/052_condizioni_letture_attivita.js';
import { traduciNomiSpilli } from './db/migrations/053_nomi_spilli_in_italiano.js';
import { collegaLuoghiAllePlanimetrie } from './db/migrations/054_luoghi_con_la_loro_planimetria.js';

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

try {
  const esito = caricaSeed(initDb());
  logger.info(esito, esito.caricato ? 'seed del compendio caricato' : 'seed del compendio già aggiornato');
  // Le condizioni di libri, film e attività si **ricavano** dalla prosa della guida, quindi
  // dipendono dal lettore e non solo dai dati: quando il lettore migliora — ed è appena successo,
  // «18 aprile» in `disponibile_dal` prima finiva in «da configurare» — il seed non si ricarica,
  // perché i dati non sono cambiati, e le regole resterebbero quelle vecchie per sempre. Sono
  // centosei righe, la riscrittura è idempotente e tocca solo quelle della guida: si rifà a ogni
  // avvio, e le condizioni scritte da te restano come le hai scritte.
  sincronizzaCondizioniLetture(initDb());
  // Stesso motivo, altro dato: gli spilli che l'estrazione non ha saputo identificare portano il
  // nome giapponese dello sprite, e un reseed dell'atlante lo riporterebbe.
  const tradotti = traduciNomiSpilli(initDb());
  if (tradotti > 0) logger.info({ spilli: tradotti }, 'nomi degli spilli non identificati resi in italiano');
  // E il legame fra un luogo della guida e la planimetria che porta il suo nome: è una regola sui
  // dati, quindi si rifà quando i dati cambiano, non una volta sola.
  const collegati = collegaLuoghiAllePlanimetrie(initDb());
  if (collegati > 0) logger.info({ luoghi: collegati }, 'luoghi collegati alla planimetria che porta il loro nome');
} catch (err) {
  console.error('[project-p5r] FATALE: caricamento del seed fallito:', err);
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
