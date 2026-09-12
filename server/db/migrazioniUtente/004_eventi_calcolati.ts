// ============================================================
// utente 004 — gli eventi «entra in squadra» non si segnano più a mano: le righe manuali vanno via
// ============================================================
//
// Makoto, Futaba, Haru e Akechi entrano in squadra quando la partita lo dice
// (`membro_squadra_partita.in_squadra`): l'evento di storia corrispondente si calcola da lì, e una
// riga segnata a mano in `evento_storia_partita` non sarebbe più letta da nessuno. Si toglie, così
// il file delle partite non tiene un dato che contraddice quello vero.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { EVENTI_STORIA, membroDellEvento } from '../../../shared/condizioniSpillo.js';

export const utente004: Migration = {
  id: 4,
  name: 'eventi_calcolati',
  up(db) {
    const calcolati = EVENTI_STORIA.filter((e) => membroDellEvento(e.chiave) !== null).map((e) => e.chiave);
    if (calcolati.length === 0) return;
    db.prepare(`DELETE FROM utente.evento_storia_partita WHERE evento_chiave IN (${calcolati.map(() => '?').join(',')})`).run(...calcolati);
  },
};
