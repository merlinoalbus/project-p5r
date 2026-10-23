// ============================================================
// 159 — Niijima ha una sola cassa: le condizioni passano all'evento «soci» (decisione del PM del 24/10, fonti Royal)
// ============================================================
//
// La guida Royal (AllGameStaff, «Palazzo di Sae») descrive UN banco, nella lobby dei soci, raggiungibile l'11-13: lì si cambia anche la
// Tessera puntate alte. L'evento `niijima-banco-alte-accessibile` («banco della lobby delle puntate alte») non ha un fatto suo nel gioco.
// Le righe che lo usavano passano a `niijima-banco-soci-accessibile`:
//   - lo sblocco del negozio `negozio-palazzo-niijima` («almeno una fra soci e puntate alte» diventa il solo evento «soci»);
//   - tre articoli: raggio-della-vittoria, bracciale-confuso, pend-disperazione (da «puntate alte» a «soci»).
// L'evento «puntate alte» esce poi dall'elenco degli eventi (`EVENTI_STORIA`) solo perché, dopo questa migrazione, nessuna riga del
// gioco lo usa più (la migrazione lo verifica e lo scrive nel registro; se una riga lo usasse ancora, non cambierebbe niente nei dati).
// Nessuna partita lo aveva segnato. Si toccano solo queste righe, solo in `main`. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

const ALTE = 'niijima-banco-alte-accessibile';
const SOCI = 'niijima-banco-soci-accessibile';
const NEGOZIO = 'negozio-palazzo-niijima';
const ARTICOLI = ['raggio-della-vittoria', 'bracciale-confuso', 'pend-disperazione'].map((a) => `${NEGOZIO}/${a}`);

type Cond = { tipo?: string; evento?: string; condizioni?: Cond[]; modo?: string } & Record<string, unknown>;
/** Sostituisce l'evento «alte» con «soci» ovunque nella condizione; un gruppo che resta con due «soci» uguali diventa il solo «soci». */
function conSoci(c: Cond): Cond {
  if (c.tipo === 'evento' && c.evento === ALTE) return { ...c, evento: SOCI };
  if (Array.isArray(c.condizioni)) {
    const figli = c.condizioni.map(conSoci);
    const distinti = figli.filter((f, i) => figli.findIndex((g) => JSON.stringify(g) === JSON.stringify(f)) === i);
    if (distinti.length === 1 && c.tipo === 'gruppo') return distinti[0]!;
    return { ...c, condizioni: distinti };
  }
  return c;
}

export const migration159: Migration = {
  id: 159,
  name: 'niijima_una_sola_cassa',
  up(db) {
    let toccate = 0;
    const neg = db.prepare('SELECT sblocco_json FROM main.negozio WHERE chiave=?').get(NEGOZIO) as { sblocco_json: string | null } | undefined;
    if (neg?.sblocco_json?.includes(ALTE)) {
      const nuovo = (JSON.parse(neg.sblocco_json) as Cond[]).map(conSoci);
      db.prepare('UPDATE main.negozio SET sblocco_json=?, updated_at=? WHERE chiave=?').run(JSON.stringify(nuovo), new Date().toISOString(), NEGOZIO);
      toccate++;
    }
    for (const chiave of ARTICOLI) {
      const a = db.prepare('SELECT condizioni_json FROM main.articolo WHERE chiave=?').get(chiave) as { condizioni_json: string | null } | undefined;
      if (!a?.condizioni_json?.includes(ALTE)) continue;
      const nuovo = (JSON.parse(a.condizioni_json) as Cond[]).map(conSoci);
      db.prepare('UPDATE main.articolo SET condizioni_json=?, updated_at=? WHERE chiave=?').run(JSON.stringify(nuovo), new Date().toISOString(), chiave);
      toccate++;
    }
    const ancora = (db.prepare("SELECT (SELECT count(*) FROM main.negozio WHERE sblocco_json LIKE ?) + (SELECT count(*) FROM main.articolo WHERE condizioni_json LIKE ?)").pluck().get(`%${ALTE}%`, `%${ALTE}%`) as number);
    logger.info({ righeCorrette: toccate, usiResidui: ancora }, '159: Niijima, una sola cassa (evento «puntate alte» non più usato dalle righe del gioco se usiResidui è 0)');
  },
};
