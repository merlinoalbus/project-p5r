// ============================================================
// Configurazione backend — unica fonte delle variabili d'ambiente
// ============================================================
//
// Ogni variabile d'ambiente viene letta UNA volta qui; il resto del
// codice importa `config`. Nessun segreto: l'app è locale e offline
// (compendio + dati di partita su SQLite).
// ============================================================

import path from 'node:path';

/** Configurazione runtime letta una sola volta all'avvio del processo. */
export const config = {
  // BE_PORT ha precedenza su PORT: gli ambienti dev possono iniettare PORT
  // per il dev server Vite e l'ambiente esterno vince su --env-file.
  port: parseInt(process.env.BE_PORT || process.env.PORT || '3101', 10),
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  logLevel: process.env.LOG_LEVEL || 'info',

  /** Nome del file SQLite dei dati di gioco dentro `dataDir` (compendio, guida, catalogo, mappe). */
  dbFileName: 'gioco.db',
  /** Nome del file SQLite delle partite (schema «utente», attaccato alla stessa connessione). */
  partiteFileName: 'partite.db',
  /** Il vecchio file unico: al primo avvio viene rinominato in `dbFileName` e la migrazione 066 sposta le partite. */
  dbFileNameLegacy: 'project-p5r.db',
  /** Cartella del pacchetto di gioco spedito con il repository (gioco.db + immagini). */
  pacchettoDir: path.resolve(process.env.PACCHETTO_DIR || './pacchetto'),

  appVersion: '0.1.0',
} as const;
