// ============================================================
// Migrazione 338 — il refuso «Tongen-Java» nella voce del Diario del 9 aprile (L8-13)
// ============================================================
//
// Voce di piano L8-13: nella voce del 9 aprile (giorno, uid `452c65b5b2612edd9cff3da1ee181a22`) il quartiere era scritto «Tongen-Java» invece di
// «Yongen-Jaya», il nome che le altre voci usano. È una correzione certa nel periodo validato: si applica direttamente (DECISIONI §2), per uid e
// solo se il testo è ancora quello col refuso, parola per parola. Si cambia soltanto il nome del quartiere: il resto del testo, le note, gli effetti,
// l'ordine, i pin e le spunte della voce restano come sono.
// Se la voce non c'è, o il suo testo è un altro (per esempio già corretto dall'utente nella preparazione, come nella copia del 1° novembre), la
// migrazione non cambia niente. Lo storico delle partite (gli eventi già scritti con il titolo di allora) non si riscrive: è ciò che è stato
// registrato in quel momento. Idempotente; scrive solo `main.voce_giornata`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';

const VOCE = '452c65b5b2612edd9cff3da1ee181a22';
/** Il testo col refuso, com'era nella guida caricata (letto su una copia dei dati con la voce non ancora corretta). */
const TESTO_COL_REFUSO = 'Parla con la gente di Tongen-Java:\nil vecchietto sulla panchina,\nl\'Agente Scortese,\nla Madre dall’aspetto gentile insieme alla Ragazzina amante dei cani';
const TESTO_CORRETTO = TESTO_COL_REFUSO.replace('Tongen-Java', 'Yongen-Jaya');
const errore = (motivo: string): never => { throw new Error(`338: ${motivo}; nessuna modifica applicata.`); };

export const migration338: Migration = {
  id: 338,
  name: 'refuso_yongen_jaya_9_aprile',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'voce_giornata')) return;
    const voce = db.prepare('SELECT data, fascia, azione FROM main.voce_giornata WHERE uid = ?').get(VOCE) as { data: string; fascia: string; azione: string } | undefined;
    if (!voce || voce.data !== '04-09' || voce.azione !== TESTO_COL_REFUSO) {
      logger.info({ migrazione: 338, voce: VOCE, presente: !!voce }, 'refuso del 9 aprile: niente da fare (voce assente o testo già diverso)');
      return;
    }
    const cambiate = db.prepare('UPDATE main.voce_giornata SET azione = ?, updated_at = ? WHERE uid = ? AND azione = ?')
      .run(TESTO_CORRETTO, new Date().toISOString(), VOCE, TESTO_COL_REFUSO).changes;
    if (cambiate !== 1) errore(`attesa una voce corretta, cambiate ${cambiate}`);
    logger.info({ migrazione: 338, voce: VOCE }, 'voce del 9 aprile: «Tongen-Java» → «Yongen-Jaya»');
  },
};
