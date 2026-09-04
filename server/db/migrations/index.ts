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
import { migration007 } from './007_piani_salvati.js';
import { migration008 } from './008_carica.js';
import { migration009 } from './009_cicli.js';
import { migration010 } from './010_confidenti_dettaglio.js';
import { migration011 } from './011_domande.js';
import { migration012 } from './012_calendario.js';
import { migration013 } from './013_dungeon.js';
import { migration014 } from './014_richieste.js';
import { migration015 } from './015_citta.js';
import { migration016 } from './016_cruciverba.js';
import { migration017 } from './017_negozi.js';
import { migration018 } from './018_percorso.js';

/** Registro append-only applicato dal runner in ordine di `id`. */
export const migrations: Migration[] = [migration001, migration002, migration003, migration004, migration005, migration006, migration007, migration008, migration009, migration010, migration011, migration012, migration013, migration014, migration015, migration016, migration017, migration018];
