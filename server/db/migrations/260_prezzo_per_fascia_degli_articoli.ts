// ============================================================
// Migrazione 260 — il prezzo di un'offerta in una fascia della giornata (Ondata 5, Lotto E; decisioni 5 e 21 dell'utente)
// ============================================================
//
// Decisione 5: «Big Bang Burger: le voci si collegano all'articolo della sfida; il prezzo serale di 500 yen è un dato dell'articolo». Oggi la
// sera vive solo in prosa («Prezzo ridotto a 500 yen di sera», nell'effetto dell'oggetto e dell'offerta) e chi scala gli yen da solo (la spunta
// della voce, il turno della sfida, l'anteprima dell'elenco del passato) usa sempre `articolo.prezzo`: 1.200/1.500/1.800 anche la sera.
//
// Solo schema: la colonna `articolo.prezzo_per_fascia_json` (`shared/catalogo.ts`, `{ "giorno"?: n, "sera"?: n }`; la fascia che non compare
// vale `prezzo`) nasce vuota su ogni articolo; il dato delle sfide lo scrive la 262. Append-only, idempotente (la colonna si aggiunge solo se
// manca), nessun valore esistente cambia. Audit in `dati_guida.audit-260-prezzo-per-fascia`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, haColonna } from './pulizieL11.js';
import { scriviAudit } from './prezziOndata5.js';

const AUDIT = 'audit-260-prezzo-per-fascia';

export const migration260: Migration = {
  id: 260,
  name: 'prezzo_per_fascia_degli_articoli',
  up(db) {
    if (!db.inTransaction) throw new Error('260: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'articolo')) { logger.warn({ migrazione: 260 }, 'tabella articolo assente: colonna del prezzo per fascia non aggiunta'); return; }
    const aggiunta = !haColonna(db, 'articolo', 'prezzo_per_fascia_json');
    if (aggiunta) db.exec('ALTER TABLE main.articolo ADD COLUMN prezzo_per_fascia_json TEXT');
    const conPrezzo = db.prepare('SELECT COUNT(*) FROM main.articolo WHERE prezzo_per_fascia_json IS NOT NULL').pluck().get() as number;
    if (aggiunta && conPrezzo !== 0) throw new Error('260: la colonna nuova non è vuota; nessuna modifica applicata.');
    scriviAudit(db, AUDIT, 260, { colonnaAggiunta: aggiunta, articoli: db.prepare('SELECT COUNT(*) FROM main.articolo').pluck().get(), conPrezzoPerFascia: conPrezzo });
    logger.info({ migrazione: 260, colonnaAggiunta: aggiunta }, 'Articoli: colonna del prezzo per fascia');
  },
};
