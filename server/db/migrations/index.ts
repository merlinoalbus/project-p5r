// ============================================================
// Registro migrazioni — import espliciti, array ordinato
// ============================================================
//
// Append-only: mai modificare una migrazione già applicata; aggiungerne
// una nuova con id successivo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { migration001 } from './001_compendio.js';
import { migration002 } from './002_partita.js';
import { migration003 } from './003_indici_fusione.js';
import { migration004 } from './004_ranghi_doti_confidenti.js';
import { migration005 } from './005_storico.js';
import { migration006 } from './006_obiettivi.js';

/** Registro append-only applicato dal runner in ordine di `id`. */
export const migrations: Migration[] = [migration001, migration002, migration003, migration004, migration005, migration006];
