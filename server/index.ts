// ============================================================
// Entry point — inizializza la persistenza, poi listen
// ============================================================
//
// Sequenza di boot:
//   0. assicuraPacchettoIniziale() — senza gioco.db, lo copia da pacchetto/gioco.db (iniziale, senza immagini: l'interfaccia si apre;
//      il completo, stesso nome in pacchetto/completo/ fuori da git, si importa da Impostazioni e sostituisce il file); senza iniziale, istanza vuota
//   1. initDb()        — apertura di gioco.db + partite.db, FATALE su errore
//   2. runBootBackup() — snapshot rotante pre-migrazioni, warn-only
//   3. runMigrations() — schema versionato, FATALE su errore
//   4. regole sui dati — nomi degli spilli, luoghi e planimetrie, spilli dei luoghi (rieseguite a ogni avvio)
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

import { assicuraPacchettoIniziale, regoleAllAvvio } from './services/pacchetto/pacchettoGioco.js';
/** Quanto può durare la RICEZIONE di una richiesta, corpo compreso.
 *
 * Node ne concede 300 secondi (`requestTimeout`) e il limite riguarda solo la richiesta ancora in arrivo, non il lavoro
 * che il server fa dopo. Era stato alzato per il caricamento del pacchetto di gioco nel corpo (centinaia di MB su una linea
 * normale superavano i 300 secondi); oggi nessun file viaggia più nel corpo, perché importazione e ripristino leggono dalla
 * cartella d'appoggio, e il valore resta allineato ai trenta minuti del proxy davanti (`nginx.conf`, `location ^~ /api/impostazioni/`). */
const RICEZIONE_MAX_MS = 30 * 60 * 1000;

try {
  const iniziale = assicuraPacchettoIniziale();
  if (iniziale.database) logger.info(iniziale, 'prima installazione: dati iniziali copiati dal pacchetto. Importa il pacchetto completo (gioco.db) da Impostazioni → Pacchetto di gioco.');
  else if (iniziale.pacchettoAssente) logger.warn('prima installazione senza pacchetto iniziale: l\'istanza nasce vuota. Importa gioco.db da Impostazioni → Pacchetto di gioco.');
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
  // Il seed JSON non esiste più (decisione dell'utente, 2026-09-12): i dati di gioco vivono in
  // gioco.db: l'iniziale arriva dal pacchetto al primo avvio, il completo (con le immagini) e ogni
  // aggiornamento passano dall'importazione in Impostazioni, che sostituisce il file.
  // Restano le regole sui dati che si rifanno a ogni avvio. Gli spilli che l'estrazione non ha
  // saputo identificare portano il nome giapponese dello sprite, e un pacchetto lo riporterebbe.
  const regole = regoleAllAvvio(initDb());
  if (Object.values(regole).some((n) => n > 0)) logger.info(regole, 'regole sui dati applicate all\'avvio');
} catch (err) {
  console.error('[project-p5r] FATALE: regole sui dati all\'avvio fallite:', err);
  process.exit(1);
}

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info(
    { port: config.port, dataDir: config.dataDir },
    `Backend in ascolto su http://localhost:${config.port}`,
  );
});
server.requestTimeout = RICEZIONE_MAX_MS;

let inArresto = false;

/**
 * Arresto ordinato su SIGINT/SIGTERM, una volta sola anche se i segnali si ripetono: smette di
 * accettare connessioni, chiude il database e esce con 0; se le connessioni non si chiudono entro
 * 5 secondi chiude comunque il database ed esce con 1.
 */
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
