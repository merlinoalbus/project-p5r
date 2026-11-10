// ============================================================
// utente 071 — le spunte delle Gemelle restano dopo la divisione per rango (L6-09, G-06; migrazione di gioco 385)
// ============================================================
//
// Dalla 385 le due voci aggregate delle Gemelle Custodi tengono il rango più alto («fino al rango 8» del 06/09 → rango 8, «fino al rango
// massimo» del 06/11 → rango 10) e i ranghi intermedi hanno la loro voce subito prima (6 e 7 il 06/09, 9 il 06/11). Una partita che aveva spuntato la
// voce aggregata aveva fatto anche quei passaggi: la spunta della voce aggregata resta com'è (stesso uid), e le voci nuove dei ranghi intermedi
// ricevono una spunta con la stessa ora e senza ricevuta (`effetti_json` NULL: le voci nuove non hanno effetti). Nessuna spunta si toglie; una voce
// nuova già spuntata resta com'è. Senza le voci nuove nei dati di gioco non si fa niente. Nei dati del 7/11: nessuna partita aveva spuntato le
// voci aggregate (0 righe). Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { uidVoceL609 } from '../migrations/385_voci_del_diario_dopo_giugno.js';

const DIVISIONI: ReadonlyArray<{ aggregata: string; nuove: readonly string[] }> = [
  { aggregata: '85cce8fcb43e4ca9a05707de5a8ea993', nuove: ['B-10', 'B-11'] },
  { aggregata: 'd26ea0495813e93e62e5940a9912c419', nuove: ['B-20'] },
];

export const utente071: Migration = {
  id: 71,
  name: 'spunte_delle_gemelle_per_rango',
  up(db) {
    if (!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'spunta_voce_partita'").get()) return;
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'voce_giornata'").get()) return;
    const contaPrima = db.prepare('SELECT COUNT(*) FROM utente.spunta_voce_partita').pluck().get() as number;
    const esiste = db.prepare('SELECT 1 FROM main.voce_giornata WHERE uid = ?');
    const spuntate = db.prepare('SELECT partita_id, fatta_at FROM utente.spunta_voce_partita WHERE voce_uid = ? ORDER BY partita_id');
    const scrivi = db.prepare('INSERT OR IGNORE INTO utente.spunta_voce_partita (partita_id, voce_uid, fatta_at, effetti_json) VALUES (?, ?, ?, NULL)');
    const scritte: Array<{ partita: number; voce: string; da: string }> = [];
    for (const d of DIVISIONI) {
      if (!esiste.get(d.aggregata)) continue;
      const nuove = d.nuove.map(uidVoceL609).filter((u) => esiste.get(u));
      if (!nuove.length) continue;
      for (const s of spuntate.all(d.aggregata) as Array<{ partita_id: number; fatta_at: string }>) {
        for (const u of nuove) if (scrivi.run(s.partita_id, u, s.fatta_at).changes === 1) scritte.push({ partita: s.partita_id, voce: u, da: d.aggregata });
      }
    }
    const contaDopo = db.prepare('SELECT COUNT(*) FROM utente.spunta_voce_partita').pluck().get() as number;
    if (contaDopo !== contaPrima + scritte.length) throw new Error(`utente 071: le spunte erano ${contaPrima}, ne attendevo ${contaPrima + scritte.length}, sono ${contaDopo}; nessuna modifica applicata.`);
    logger.info({ spuntePrima: contaPrima, spunteDopo: contaDopo, scritte }, 'migrazione utente 071: spunte delle Gemelle per rango');
  },
};
