// ============================================================
// Registro delle migrazioni delle partite (schema «utente», file partite.db)
// ============================================================
//
// Append-only, id consecutivi da 1. La numerazione è separata da quella dei dati di gioco:
// i due file si versionano ciascuno con il proprio `user_version`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { utente001 } from './001_schema_partite.js';
import { utente002 } from './002_spilli_raccolti_per_uid.js';
import { utente003 } from './003_timbri_dedalo.js';

export const migrazioniUtente: Migration[] = [utente001, utente002, utente003];
