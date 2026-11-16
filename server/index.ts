// ============================================================
// Entry point — inizializza la persistenza, poi listen
// ============================================================
//
// Sequenza di boot:
//   0. assicuraPacchettoIniziale() — senza gioco.db, lo copia da pacchetto/gioco.db (senza immagini: l'interfaccia si apre; un backup
//      completo dei dati di gioco si importa da Impostazioni e sostituisce il file); senza nessuno dei due, FATALE
//   1. initDb()        — apertura di gioco.db + partite.db, FATALE su errore
//   2. creaPartiteDalModelloSeMancano() — un partite.db senza tabelle nasce da pacchetto/partite-vuoto.db, FATALE su errore
//   3. verificaVersioni() — i due file devono essere alla versione che il codice legge, FATALE altrimenti (nessuna conversione);
//      poi il censimento delle tabelle delle partite (`avvisaCensimentoPartite`): un avviso nel log se una tabella o una colonna
//      di riferimento non è classificata
//   4. regole sui dati — nomi e uid degli spilli, spilli dei luoghi, miniature orfane (rieseguite a ogni avvio)
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
import { creaPartiteDalModelloSeMancano } from './db/partiteVuote.js';
import { verificaVersioni } from './db/versioneSchema.js';
import { createApp } from './bootstrap.js';

import { assicuraPacchettoIniziale, regoleAllAvvio } from './services/pacchetto/pacchettoGioco.js';
import { riscaldaMiniature } from './services/miniatureService.js';
import { proponiStatiMancanti } from './services/statiMancantiService.js';
import { verificaRuntimeNode } from './utils/nodeRuntime.js';
import { avvisaCensimentoPartite } from './services/censimentoPartite.js';

// Le linee Node interessate dall'advisory di sicurezza del 2026-10-21 devono
// essere almeno alle rispettive release correttive prima di avviare il backend.
verificaRuntimeNode(process.versions.node);

/** Quanto può durare la RICEZIONE di una richiesta, corpo compreso.
 *
 * Node ne concede 300 secondi (`requestTimeout`) e il limite riguarda solo la richiesta ancora in arrivo, non il lavoro
 * che il server fa dopo. Nessun file viaggia nel corpo (importazione e ripristino leggono dalla cartella d'appoggio): il valore
 * è allineato ai trenta minuti del proxy davanti (`nginx.conf`, `location ^~ /api/impostazioni/`). */
const RICEZIONE_MAX_MS = 30 * 60 * 1000;

try {
  const iniziale = assicuraPacchettoIniziale();
  if (iniziale.database) logger.info(iniziale, 'prima installazione: dati di gioco copiati dal pacchetto (senza immagini). Importa un backup completo dei dati di gioco da Impostazioni → Pacchetto di gioco.');
  initDb();
} catch (err) {
  console.error('[project-p5r] FATALE: inizializzazione SQLite fallita:', err);
  process.exit(1);
}

try {
  creaPartiteDalModelloSeMancano(initDb());
} catch (err) {
  console.error('[project-p5r] FATALE: creazione del file delle partite dal modello fallita:', err);
  process.exit(1);
}

try {
  verificaVersioni(initDb());
} catch (err) {
  // un file di un'altra versione non si apre e non si converte: il messaggio dice quale file, a che versione è e che cosa fare
  console.error('[project-p5r] FATALE: versione dei dati diversa da quella attesa:', err);
  process.exit(1);
}

// L11-04: ogni tabella e ogni colonna di riferimento del file delle partite dovrebbe essere classificata (`censimentoPartite.ts`); ciò che
// manca si dice nel log come avviso e l'avvio prosegue (decisione dell'utente del 01/11: non blocca niente, al massimo un warning)
try {
  avvisaCensimentoPartite(initDb());
} catch (err) {
  logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'censimento delle partite non riuscito (l\'avvio prosegue)');
}

try {
  // Le regole sui dati che si rifanno a ogni avvio: gli spilli che l'estrazione non ha saputo identificare portano il nome
  // giapponese dello sprite, e un backup importato lo riporterebbe.
  // R-1/R-3: all'avvio le regole sono tolleranti (il server deve partire) e un errore non si confonde con «niente da fare»: il nome della
  // regola fallita finisce in `regoleFallite`, e in questo caso il log lo dice sempre. Importazione e caricamento usano il modo rigido.
  const { regoleFallite, ...regole } = regoleAllAvvio(initDb(), 'tollerante');
  if (regoleFallite.length) logger.warn({ regoleFallite, ...regole }, 'regole sui dati all\'avvio: alcune sono fallite (l\'avvio prosegue)');
  else if (Object.values(regole).some((n) => n > 0)) logger.info(regole, 'regole sui dati applicate all\'avvio');
} catch (err) {
  console.error('[project-p5r] FATALE: regole sui dati all\'avvio fallite:', err);
  process.exit(1);
}

try {
  // L13 (decisione 19, «Elenco da approvare»): gli effetti di stato delle voci già spuntate mai applicati entrano nell'elenco da approvare della
  // partita (mai applicati da soli). Tollerante come le regole all'avvio: il server parte comunque, e il log lo dice (solo conteggi, mai nomi)
  const { partite } = proponiStatiMancanti();
  // (anche le proposte chiuse in questo giro perché non c'era nulla da togliere: l'audit delle chiusure, solo conteggi)
  const conProposte = partite.filter((p) => p.proposte > 0 || p.nonRiconosciuti > 0 || p.chiuseNullaDaTogliere > 0);
  if (conProposte.length) logger.info({ partite: conProposte }, 'effetti di stato mai applicati: nuove proposte nell\'elenco da approvare');
  const conErrori = partite.filter((p) => p.errori > 0);
  if (conErrori.length) logger.warn({ partite: conErrori }, 'censimento degli effetti di stato: alcune voci non si sono potute esaminare (le altre sì; il prossimo avvio le riprova)');
} catch (err) {
  logger.warn({ err: err instanceof Error ? err.message : String(err) }, 'censimento degli effetti di stato mai applicati non riuscito (l\'avvio prosegue)');
}

const app = createApp();

const server = app.listen(config.port, (err?: Error) => {
  // Express passa qui anche l'errore di ascolto (porta occupata, permessi): senza porta il processo non serve a niente e deve dirlo
  if (err) {
    logger.fatal({ err, port: config.port }, `Il backend non riesce ad ascoltare sulla porta ${config.port}`);
    process.exit(1);
  }
  logger.info(
    { port: config.port, dataDir: config.dataDir },
    `Backend in ascolto su http://localhost:${config.port}`,
  );
  // le miniature delle schede (L1): in background, mai bloccante; il log dice quante e in quanto tempo
  setImmediate(() => { riscaldaMiniature().catch((err: unknown) => logger.error({ err }, 'riscaldamento delle miniature non riuscito')); });
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
// una promessa rifiutata e mai gestita non deve passare in silenzio: si registra con lo stack; il processo non cade (le richieste in corso continuano)
process.on('unhandledRejection', (motivo) => logger.error({ err: motivo }, 'promessa rifiutata e non gestita'));
