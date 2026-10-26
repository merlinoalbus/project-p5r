// ============================================================
// Migrazione 254 — lo sconto di un negozio legato al rango di un Confidente: la colonna (chiusura dell'ondata 5, solo schema)
// ============================================================
//
// Revisione finale dell'ondata 5, rilievo 4: gli sconti della Clinica di Takemi erano prezzi copiati nelle descrizioni del catalogo («sconto
// 1.700¥», nove schede) e gli yen automatici (decisione 18) non li applicavano. Decisione 21 dell'utente: «Non sono d'accordo nel rimandare
// attività a fasi successive», e la precisazione: gli oggetti e i dati che incidono su ciò che l'app gestisce (gli yen) si modellano. Lo sconto
// è un dato del negozio, non dell'offerta né dell'oggetto: `negozio.sconto_json` = `{ confidente, rango, percentuale }` (null = nessuno sconto),
// letto da `shared/scontiNegozi.ts`; il prezzo resta uno, quello dell'offerta, e il prezzo scontato si calcola. Il dato della Clinica lo scrive
// la 269, con la nota storica sulla discordanza fra le pagine della guida.
//
// Il numero 254 era libero nel blocco del lotto C (250-254): la revisione finale chiedeva di riempire i buchi del registro (254, 259, 269),
// perché il runner applica solo gli id oltre l'ultimo applicato e un numero saltato non si potrebbe più usare. Solo schema; idempotente (la
// colonna già presente non si tocca). Audit in `dati_guida.audit-254-sconto-dei-negozi`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella } from './pulizieL11.js';
import { scriviAuditChiusura } from './chiusuraOndata5.js';

const AUDIT = 'audit-254-sconto-dei-negozi';

export const migration254: Migration = {
  id: 254,
  name: 'sconto_dei_negozi',
  up(db) {
    if (!db.inTransaction) throw new Error('254: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'negozio')) { logger.warn({ migrazione: 254 }, 'tabella negozio assente: colonna dello sconto non aggiunta'); return; }
    const colonne = (db.prepare('PRAGMA main.table_info(negozio)').all() as Array<{ name: string }>).map((c) => c.name);
    const aggiunta = !colonne.includes('sconto_json');
    if (aggiunta) db.exec('ALTER TABLE main.negozio ADD COLUMN sconto_json TEXT');
    scriviAuditChiusura(db, AUDIT, 254, { colonnaAggiunta: aggiunta, negozi: db.prepare('SELECT COUNT(*) FROM main.negozio').pluck().get() }, aggiunta ? 1 : 0);
    logger.info({ migrazione: 254, colonnaAggiunta: aggiunta }, 'Negozi: colonna dello sconto legato al rango di un Confidente');
  },
};
