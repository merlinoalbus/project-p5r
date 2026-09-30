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
import { utente004 } from './004_eventi_calcolati.js';
import { utente005 } from './005_giornata_modificabile.js';
import { utente006 } from './006_boss_segnato_dal_raccolto.js';
import { utente007 } from './007_effetti_delle_azioni.js';
import { utente008 } from './008_effetti_delle_azioni_utente.js';
import { utente009 } from './009_incontri_con_i_confidenti.js';
import { utente010 } from './010_incontri_piu_passaggi.js';
import { utente011 } from './011_incontro_punti_prima.js';

export const migrazioniUtente: Migration[] = [utente001, utente002, utente003, utente004, utente005, utente006, utente007, utente008, utente009, utente010, utente011];
