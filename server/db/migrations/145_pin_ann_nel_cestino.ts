// ============================================================
// 145 — il pin di Ann al 2° piano della Shujin va nel Cestino (decisione dell'utente del 23/10)
// ============================================================
//
// Le fonti incontrano Ann (Amanti) al centro commerciale sotterraneo di Shibuya; un suo punto al 2° piano della Shujin non è
// documentato. Il pin 1753 (Confidente `ann`, planimetria Edificio principale 2P) lascia la mappa e resta nel Cestino, ripristinabile
// dall'app. Il luogo `shibuya/underground-mall-lovers` e il collegamento di Ann al centro commerciale non si toccano.
// La rimozione usa la copia congelata del formato del Cestino (rimozionePinCestino.ts): prima la fotografia, poi il pin.
// Conservativa e idempotente: se il pin non c'è più, non fa nulla; se non è quello atteso o ha dati collegati, resta dov'è.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { rimuoviPinNelCestino } from './rimozionePinCestino.js';

export const migration145: Migration = {
  id: 145,
  name: 'pin_ann_nel_cestino',
  up(db) {
    const ok = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!['spillo', 'cestino', 'mappa', 'area', 'quartiere', 'dati_guida'].every(ok)) return;
    const esito = rimuoviPinNelCestino(db, {
      id: 1753, uid: 'd42667c566363742567b9d3f14b8d9ed', tipo: 'confidente', mappa: 'nativo-rmap-002-0-1', origine: 'utente', riferimento: ['confidente', 'ann'],
    });
    if (esito.esito !== 'gia-fatta') {
      db.prepare('INSERT OR IGNORE INTO main.dati_guida (chiave, json) VALUES (?, ?)').run('pin-ann-cestino-145', JSON.stringify({ versione: 1, pin: 1753, ...esito }));
    }
    logger.info({ pin: 1753, ...esito }, '[migration145] pin di Ann al 2° piano della Shujin nel Cestino');
  },
};
