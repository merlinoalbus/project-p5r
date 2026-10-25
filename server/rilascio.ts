// ============================================================
// Entry point dell'istanza di RILASCIO — pubblica, contenuti in sola lettura (L12, passi 4-6)
// ============================================================
//
// La modalità è scritta qui, nel codice: non esiste una variabile d'ambiente che la cambi, perché un errore dello stack non deve
// poter aprire le scritture (progetto §1). La preparazione (`server/index.ts`) resta com'è. Sequenza:
//   1. assicuraPartiteIniziali() — senza partite.db lo crea copiando partite-vuoto.db dal volume dell'edizione;
//   2. initDb({ soloLettura })   — apre gioco.db SENZA WAL, mai creato né rinominato, e attacca partite.db come `utente`;
//   3. verificaSolaLettura()     — una scrittura di prova su gioco.db deve fallire con SQLITE_READONLY (terzo livello di difesa);
//   4. verificaSchemaUtente()    — versioni e impronta della struttura delle partite contro il manifesto dell'edizione;
//   5. createApp({ modalita: 'rilascio' }) — monta solo le rotte del giocatore e controlla che l'elenco corrisponda alle rotte vere;
//   6. listen + copie dell'avanzamento (all'avvio e ogni 6 ore, in un volume a parte).
// Qualunque fallimento dei passi 1-5 è FATALE: un'istanza pubblica con i contenuti scrivibili o con le partite di una struttura
// sconosciuta non deve rispondere.
//
// Quello che qui NON c'è, di proposito: il runner delle migrazioni e le cartelle delle migrazioni (i contenuti sono chiusi), il
// backup di avvio pre-migrazione, le regole sui dati all'avvio, il pacchetto di gioco iniziale, il riscaldamento delle miniature
// (l'edizione le porta tutte), l'assegnazione degli uid degli spilli. Nota onesta: i router di area importano ancora, per altre
// strade, moduli che nominano le migrazioni (l'importazione del pacchetto, nella preparazione); in questo processo nessuna rotta
// che li usa è montata e nessuna migrazione viene mai eseguita.
//
// Arresto: come la preparazione, su SIGINT/SIGTERM si chiude il server HTTP e la connessione (senza `PRAGMA optimize`: gioco.db è
// in sola lettura).
// ============================================================

import { config } from './config.js';
import { logger } from './utils/logger.js';
import { closeDb, initDb } from './db/dbService.js';
import { createApp } from './bootstrap.js';
import { verificaRuntimeNode } from './utils/nodeRuntime.js';
import { assicuraPartiteIniziali, identificativoEdizione, leggiManifesto, verificaSchemaUtente } from './rilascio/edizione.js';
import { verificaSolaLettura } from './rilascio/solaLettura.js';
import { avviaCopieUtente } from './rilascio/backupUtente.js';

// Come la preparazione: le linee Node con l'advisory del 2026-10-21 devono essere alle release correttive.
verificaRuntimeNode(process.versions.node);

/** Quanto può durare la ricezione di una richiesta: qui niente file nel corpo (256 kB al massimo), un minuto è già molto. */
const RICEZIONE_MAX_MS = 60 * 1000;

/** L'identificativo dell'edizione servita, esposto da `/api/config` (il frontend svuota la sua cache dei contenuti se cambia). */
let edizione: string;
try {
  assicuraPartiteIniziali();
  const db = initDb(undefined, { soloLettura: true });
  verificaSolaLettura(db);
  verificaSchemaUtente(db, leggiManifesto());
  edizione = identificativoEdizione();
} catch (err) {
  console.error('[project-p5r] FATALE: avvio dell\'istanza di rilascio non riuscito:', err);
  process.exit(1);
}

let app: ReturnType<typeof createApp>;
try {
  app = createApp({ modalita: 'rilascio', edizione });
} catch (err) {
  console.error('[project-p5r] FATALE: montaggio delle rotte del giocatore non riuscito:', err);
  process.exit(1);
}

let fermaCopie: (() => void) | null = null;
const server = app.listen(config.port, () => {
  logger.info({ port: config.port, modalita: 'rilascio' }, `Istanza di rilascio in ascolto su http://localhost:${config.port}`);
  // la prima copia dell'avanzamento parte subito, in background; poi una ogni 6 ore
  fermaCopie = avviaCopieUtente();
});
server.requestTimeout = RICEZIONE_MAX_MS;

let inArresto = false;

/** Arresto ordinato, una volta sola anche se i segnali si ripetono: smette di accettare, chiude il database, esce; dopo 5 secondi esce comunque. */
function arresta(segnale: NodeJS.Signals): void {
  if (inArresto) return;
  inArresto = true;
  logger.info({ segnale }, 'arresto in corso');
  fermaCopie?.();
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
