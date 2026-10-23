// ============================================================
// 151 — il pin 339 (cancello della Shujin) sul listino visibile con lo stesso assortimento (decisione del 23/10)
// ============================================================
//
// L'utente aveva approvato «339 → cancello-1», cioè l'assortimento Second Maid / Manta / Earl Green. Ma `distributore-shujin-cancello-1` è un
// doppione esatto di `distributore-shujin-edificio` che l'utente stesso ha nascosto il 21/9 (la 121 lo chiama «duplicato esatto A»), quindi la
// 143 ha saltato il pin. Il listino nascosto resta nascosto: il pin va sul listino visibile con lo stesso assortimento,
// `distributore-shujin-edificio`. Sulla stessa planimetria 1760 è già il cancello-2 (Joylent): le due macchine del cancello hanno così due
// assortimenti diversi, come nelle fonti di Royal.
// Stessa guardia della 143: il pin cambia solo se corrisponde ancora a identità e riferimento attesi (id, tipo, planimetria, origine,
// nessun riferimento) e il listino esiste ed è visibile. Idempotente. Non tocca `partite.db`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const LISTINO = 'distributore-shujin-edificio';

export const migration151: Migration = {
  id: 151,
  name: 'pin_cancello_shujin',
  up(db) {
    const ok = (t: string) => !!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = ?").get(t);
    if (!ok('spillo') || !ok('negozio')) return;
    const p = db.prepare('SELECT riferimento_tipo, riferimento_chiave FROM main.spillo WHERE id = 339').get() as { riferimento_tipo: string | null; riferimento_chiave: string | null } | undefined;
    let esito: string;
    if (!p) esito = 'pin assente';
    else if (p.riferimento_tipo === 'negozio' && p.riferimento_chiave === LISTINO) esito = 'gia-fatta';
    else if (!db.prepare('SELECT 1 FROM main.negozio WHERE chiave = ? AND nascosto = 0').get(LISTINO)) esito = 'saltata: listino assente o nascosto';
    else {
      const r = db.prepare(`UPDATE main.spillo SET riferimento_tipo = 'negozio', riferimento_chiave = ?, updated_at = ?
        WHERE id = 339 AND tipo = 'distributore' AND mappa_chiave = 'nativo-rmap-002-1-0' AND origine = 'utente' AND riferimento_tipo IS NULL AND riferimento_chiave IS NULL`)
        .run(LISTINO, new Date().toISOString());
      esito = r.changes === 1 ? 'applicata' : 'saltata: il pin non corrisponde più a identità e riferimento attesi';
    }
    logger.info({ pin: 339, listino: LISTINO, esito }, '[migration151] pin del cancello della Shujin');
  },
};
