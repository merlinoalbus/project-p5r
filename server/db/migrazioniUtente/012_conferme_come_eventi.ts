// ============================================================
// utente 012 — le conferme a mano dei requisiti diventati eventi passano agli eventi della partita
// ============================================================
//
// Con la migrazione 090 il caffè al Leblanc, il duello con Akechi, la Pietra Sacra, la chiamata a
// Kawakami e l'Oratore di Shibuya sono eventi di storia (Partita → Progressi). Chi li aveva già
// confermati col «Condizione soddisfatta» del Confidente li ritrova segnati: la conferma diventa
// l'evento avvenuto, e la riga della conferma — che nessuno leggerebbe più — si toglie. Un evento
// già segnato non si tocca.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { REQUISITI_EVENTO } from '../migrations/090_requisiti_come_eventi.js';

export const utente012: Migration = {
  id: 12,
  name: 'conferme_come_eventi',
  up(db) {
    const conferme = db.prepare('SELECT partita_id, updated_at FROM utente.requisito_partita WHERE confidente_chiave = ? AND rango = ? AND indice = ? AND confermato = 1');
    const segna = db.prepare('INSERT INTO utente.evento_storia_partita (partita_id, evento_chiave, avvenuto, updated_at) VALUES (?, ?, 1, ?) ON CONFLICT(partita_id, evento_chiave) DO NOTHING');
    const togli = db.prepare('DELETE FROM utente.requisito_partita WHERE confidente_chiave = ? AND rango = ? AND indice = ?');
    for (const r of REQUISITI_EVENTO) {
      for (const c of conferme.all(r.confidente, r.rango, r.indice) as Array<{ partita_id: number; updated_at: string }>) segna.run(c.partita_id, r.evento, c.updated_at);
      togli.run(r.confidente, r.rango, r.indice);
    }
  },
};
