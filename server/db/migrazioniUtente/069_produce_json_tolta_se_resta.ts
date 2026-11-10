// ============================================================
// Utente 069 — via `voce_giornata.produce_json` se la migrazione di gioco 362 l'ha lasciata (L6-08, lotto L6 «Diario»)
// ============================================================
//
// La migrazione di gioco 362 toglie `main.voce_giornata.produce_json` solo se la migrazione utente 015 è già passata, perché la 015 prepara SQL
// su quella colonna e non si modifica. Su un'istanza nuova (file delle partite da zero accanto a un file di gioco ancora da migrare) il runner
// applica prima tutte le migrazioni di gioco: la 362 archivia i valori e lascia la colonna; la 015 gira (e può correggere voci o inserirne con un
// `produce_json`); poi gira questa, che archivia di nuovo ciò che è nuovo o cambiato (`produceJsonL6.archiviaProduce`: mai una sovrascrittura,
// i valori cambiati vanno nella colonna d'archivio `voce_giornata.produce_json.dopo-015`) e toglie la colonna.
// Su produzione e su un backup importato (partite già oltre la 15) la colonna non c'è più dalla 362 e questa migrazione non fa nulla.
// Cambia solo ciò che è dichiarato: le altre colonne di `voce_giornata` hanno la stessa impronta prima e dopo, e nessuna tabella delle partite
// si tocca. Append-only e idempotente (senza la colonna non fa nulla), dentro la transazione della migrazione. Verbale: lo stesso
// `dati_guida.audit-l6-08-produce-json` della 362, con una voce in più. Nessun import da `server/services/`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { esisteTabella, haColonna, improntaTabella } from '../migrations/pulizieL11.js';
import { registraAudit } from '../migrations/archivioL1.js';
import { archiviaProduce } from '../migrations/produceJsonL6.js';
import { AUDIT_PRODUCE_JSON } from '../migrations/362_produce_json_tolta.js';
import { logger } from '../../utils/logger.js';

export const utente069: Migration = {
  id: 69,
  name: 'produce_json_tolta_se_resta',
  up(db) {
    if (!db.inTransaction) throw new Error('utente 069: manca la transazione della migrazione; nessuna modifica applicata.');
    if (!esisteTabella(db, 'voce_giornata') || !haColonna(db, 'voce_giornata', 'produce_json')) return;
    // la colonna la toglie la 362 (di gioco, che gira prima): qui solo se la 362 è passata e l'ha lasciata. Con un file di gioco più vecchio della 362
    // (le prove delle migrazioni di allora, accanto alle partite complete) la colonna serve ancora alle migrazioni di gioco che la citano.
    if ((db.pragma('main.user_version', { simple: true }) as number) < 362) return;
    if (!esisteTabella(db, 'dati_guida')) throw new Error('utente 069: manca la tabella dati_guida; nessuna modifica applicata.');
    const prima = improntaTabella(db, 'voce_giornata', ['produce_json']);
    const righe = db.prepare('SELECT COUNT(*) FROM main.voce_giornata').pluck().get() as number;
    const archivio = archiviaProduce(db, 'L6-08 · utente 69');
    db.exec('ALTER TABLE main.voce_giornata DROP COLUMN "produce_json"');
    if (haColonna(db, 'voce_giornata', 'produce_json')) throw new Error('utente 069: la colonna voce_giornata.produce_json esiste ancora; nessuna modifica applicata.');
    if (db.prepare('SELECT COUNT(*) FROM main.voce_giornata').pluck().get() !== righe || improntaTabella(db, 'voce_giornata', ['produce_json']) !== prima) {
      throw new Error('utente 069: le altre colonne di voce_giornata sono cambiate; nessuna modifica applicata.');
    }
    registraAudit(db, AUDIT_PRODUCE_JSON, { migrazione: 'L6-08 · utente 69', colonnaTolta: true, archivio });
    logger.info({ migrazione: 'L6-08-utente69', ...archivio }, 'produce_json tolta dopo la migrazione utente 015');
  },
};
