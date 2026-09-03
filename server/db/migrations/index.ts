// ============================================================
// Registro migrazioni — import espliciti, array ordinato
// ============================================================
//
// Append-only: mai modificare una migrazione già applicata; aggiungerne
// una nuova con id successivo.
// ============================================================

import type { Migration } from '../migrationRunner.js';

/** Registro append-only applicato dal runner in ordine di `id`. */
export const migrations: Migration[] = [];
