// ============================================================
// Migrazione 320 — una voce del Diario dichiara quando è dovuta: colonna `voce_giornata.condizioni_json` (solo DDL)
// ============================================================
//
// L13, ondata 9, lotto O9-3. Istruzione dell'utente del 2026-10-31: «Televendite. é possibile non venga acquistato nessun set. in tal caso
// viene meno la consegna.». La consegna del Canale di televendite è dovuta solo se la domenica prima è stato comprato uno dei due set: il legame
// è un DATO della voce (nessun caso scritto a mano nel codice), con il vocabolario unico delle condizioni (`shared/condizioniSpillo.ts`) e il
// valutatore unico della disponibilità, allo stato della partita al giorno della voce (`server/services/voceDovuta.ts`).
//
// La colonna: un elenco JSON di condizioni (un TUTTE implicito, come ogni `condizioni_json` dell'app) oppure NULL = la voce è sempre dovuta
// (tutte le voci di oggi). Nullable e senza valore predefinito: nessuna riga esistente cambia. Le copie e le fotografie della voce la portano
// (appunti del Diario, cestino: la fotografia generica di ogni colonna; il pacchetto di gioco: è una colonna del file). I dati (le quattro
// consegne del periodo validato) li scrive la 321.
//
// Idempotente: la colonna si aggiunge solo se manca. Le partite (schema `utente`) non si toccano.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';

export const migration320: Migration = {
  id: 320,
  name: 'voce_condizioni',
  up(db) {
    if (!esisteTabella(db, 'voce_giornata')) { logger.warn({ migrazione: 320 }, 'voce_giornata assente: niente da fare'); return; }
    if (haColonna(db, 'voce_giornata', 'condizioni_json')) return;
    db.exec('ALTER TABLE main.voce_giornata ADD COLUMN condizioni_json TEXT CHECK (condizioni_json IS NULL OR (json_valid(condizioni_json) AND json_type(condizioni_json) = \'array\'))');
    logger.info({ migrazione: 320 }, 'voce_giornata.condizioni_json: una voce del Diario può dichiarare quando è dovuta');
  },
};
