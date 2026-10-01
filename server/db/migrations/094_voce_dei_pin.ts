// ============================================================
// 094 — La voce della guida di un pin diventa un campo suo, separato dal riferimento
// ============================================================
//
// Un pin ha un solo riferimento, e fino a qui il collegamento a una voce della guida lo occupava (`riferimento = punto`).
// Un passaggio, una scala o un rampino che già portano a una mappa — 88 nel canone di produzione — non potevano quindi
// appartenere a nessuna voce. Scelta dell'utente (2026-10-01): «Campo dedicato alla voce», con la migrazione dei
// collegamenti esistenti.
//   - `spillo.voce_chiave`: la voce della guida a cui il pin appartiene (una per pin; eliminata la voce, torna vuota);
//   - i pin delle planimetrie collegati a una voce passano dal riferimento al campo nuovo, che liberano;
//   - gli elementi della guida senza mappa (`area_guida_chiave`, lo strato di prima) restano come sono: per loro il
//     riferimento «punto» resta il collegamento (nessuna riconciliazione, scelta dell'utente).
// Gli stati delle partite (`spillo_partita`, `punto_partita`) non cambiano: sono legati all'uid del pin e alla voce.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const migration094: Migration = {
  id: 94,
  name: 'voce_dei_pin',
  up(db) {
    const colonne = (db.prepare('PRAGMA table_info(spillo)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('voce_chiave')) {
      db.exec('ALTER TABLE spillo ADD COLUMN voce_chiave TEXT REFERENCES punto_interesse(chiave) ON DELETE SET NULL');
    }
    db.exec('CREATE INDEX IF NOT EXISTS idx_spillo_voce ON spillo(voce_chiave)');
    // solo voci che esistono: un riferimento rimasto a un punto tolto non diventa un collegamento rotto
    const spostati = db.prepare(`UPDATE spillo SET voce_chiave = riferimento_chiave, riferimento_tipo = NULL, riferimento_chiave = NULL
      WHERE mappa_chiave IS NOT NULL AND riferimento_tipo = 'punto' AND riferimento_chiave IN (SELECT chiave FROM punto_interesse)`).run().changes;
    logger.info({ spostati }, 'migrazione 094: la voce della guida dei pin delle planimetrie è un campo suo');
  },
};
