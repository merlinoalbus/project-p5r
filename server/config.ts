// ============================================================
// Configurazione backend — unica fonte delle variabili d'ambiente
// ============================================================
//
// Ogni variabile d'ambiente viene letta UNA volta qui; il resto del
// codice importa `config`. Nessun segreto: l'app è locale e offline
// (compendio + dati di partita su SQLite).
// ============================================================

import path from 'node:path';
import { z } from 'zod';

/** I livelli di log che pino conosce (`silent` spegne il log). */
const LIVELLI_DI_LOG = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

/** Le variabili d'ambiente che un valore sbagliato rende pericolose (porta, livello di log): validate una volta, all'avvio. */
const schemaAmbiente = z.object({
  // BE_PORT ha precedenza su PORT: gli ambienti dev possono iniettare PORT
  // per il dev server Vite e l'ambiente esterno vince su --env-file.
  porta: z.string().regex(/^\d+$/, 'deve essere un numero intero (cifre soltanto)').transform(Number).pipe(z.number().int().min(0).max(65535, 'deve stare fra 0 e 65535')),
  logLevel: z.enum(LIVELLI_DI_LOG, { error: `deve essere uno fra: ${LIVELLI_DI_LOG.join(', ')}` }),
});

/** Legge e valida porta e livello di log; un valore sbagliato ferma l'avvio con un messaggio che dice quale variabile e che cosa si aspetta. */
function leggiAmbiente(): { porta: number; logLevel: (typeof LIVELLI_DI_LOG)[number] } {
  const nomePorta = process.env.BE_PORT ? 'BE_PORT' : process.env.PORT ? 'PORT' : 'BE_PORT/PORT';
  const esito = schemaAmbiente.safeParse({ porta: process.env.BE_PORT || process.env.PORT || '3101', logLevel: process.env.LOG_LEVEL || 'info' });
  if (!esito.success) {
    const dettagli = esito.error.issues.map((i) => `${i.path[0] === 'porta' ? nomePorta : 'LOG_LEVEL'} ${i.message}`).join('; ');
    throw new Error(`Configurazione non valida: ${dettagli}. Correggi il file .env o l'ambiente e riavvia.`);
  }
  return esito.data;
}
const ambiente = leggiAmbiente();

/** Configurazione runtime letta una sola volta all'avvio del processo. */
export const config = {
  port: ambiente.porta,
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  logLevel: ambiente.logLevel,

  /**
   * Dove vive `gioco.db` (e la cartella dei caratteri). Senza `EDIZIONE_DIR` coincide con `dataDir`: la preparazione non cambia.
   * L'istanza di rilascio (L12) la punta al volume dell'edizione, montato in sola lettura, separato da quello delle partite.
   */
  edizioneDir: path.resolve(process.env.EDIZIONE_DIR || process.env.DATA_DIR || './data'),
  /** Dove vive `partite.db`. Senza `PARTITE_DIR` coincide con `dataDir`; in rilascio è il volume scrivibile delle partite. */
  partiteDir: path.resolve(process.env.PARTITE_DIR || process.env.DATA_DIR || './data'),
  /** Dove l'istanza di rilascio tiene le copie di `partite.db` (un volume a parte: se si perde il volume delle partite restano). */
  backupDir: path.resolve(process.env.BACKUP_DIR || path.join(process.env.DATA_DIR || './data', 'backups')),

  /** Nome del file SQLite dei dati di gioco dentro `dataDir` (compendio, guida, catalogo, mappe). */
  dbFileName: 'gioco.db',
  /** Nome del file SQLite delle partite (schema «utente», attaccato alla stessa connessione). */
  partiteFileName: 'partite.db',
  /** Il vecchio file unico: al primo avvio viene rinominato in `dbFileName` e la migrazione 066 sposta le partite. */
  dbFileNameLegacy: 'project-p5r.db',
  /** Cartella del pacchetto di gioco spedito con il repository (`gioco.db`, con le immagini dentro dalla 079). */
  pacchettoDir: path.resolve(process.env.PACCHETTO_DIR || './pacchetto'),
  /** Gli asset grafici del repository (`public/asset`): compendio e interfaccia; la migrazione 079 ne assorbe le famiglie di gioco. */
  assetDir: path.resolve(process.env.ASSET_DIR || './public/asset'),
  /** Cartella d'appoggio da cui importare i pacchetti (il NAS montato in `/deposito`); vuota = nessun deposito. */
  depositoDir: process.env.DEPOSITO_DIR ? path.resolve(process.env.DEPOSITO_DIR) : '',

  /**
   * Cloudflare Access (L12, passo 3): il team (`<team>` oppure il nome host completo `<team>.cloudflareaccess.com`) e l'AUD
   * dell'applicazione Access. Vengono SOLO dalle variabili dello stack, mai dal repository. Con entrambe valorizzate il middleware
   * d'identità è attivo (ogni richiesta `/api` deve portare un token valido); in modalità `rilascio` sono obbligatorie (l'avvio
   * si ferma se mancano); in preparazione, se mancano, resta il proprietario unico di sempre. Vuote = non impostate.
   */
  cfAccessTeam: (process.env.CF_ACCESS_TEAM ?? '').trim(),
  cfAccessAud: (process.env.CF_ACCESS_AUD ?? '').trim(),

  appVersion: '0.1.0',
} as const;
