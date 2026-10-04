// ============================================================
// utente 017 — il boss della Guida non si segna più da solo: tolti i segni messi dal raccolto
// ============================================================
//
// Scelta dell'utente (2026-10-04): un Palazzo è completato con Tesoro, boss finale e raccolto tutto insieme, e il boss si può
// affrontare più volte dentro un Palazzo. Il segno che il raccolto del Tesoro (o del boss) metteva da solo sul boss finale
// della Guida (`automatico = 1`, utente 006) faceva risultare il boss sconfitto senza che l'utente l'avesse detto; alla
// domanda su come risolverlo l'utente ha scelto «Togli l'automatismo (Recommended)». Da qui il boss finale è sconfitto solo
// se se ne raccoglie lo spillo o lo si segna dalla Guida.
//
// Si tolgono i segni rimasti con `automatico = 1`. Quelli messi o toccati dall'utente hanno 0 (ogni sua scrittura lo
// riporta a 0) e restano. Se il boss era un passo di un Enigma (095), l'Enigma segue i suoi passi, come quando si riapre
// una voce. I pin non si toccano: un pin raccolto è un fatto della mappa, segnato dall'utente.
// La colonna resta: non si scrive più 1, e una copia delle partite di prima che la riporti passa di nuovo di qui.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { allineaEnigmaDellaVoce } from '../../services/mappe/statiGuida.js';

export const utente017: Migration = {
  id: 17,
  name: 'boss_non_piu_automatico',
  up(db) {
    const colonne = (db.prepare('PRAGMA utente.table_info(punto_partita)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('automatico')) return;
    const automatici = db.prepare('SELECT partita_id, punto_chiave FROM utente.punto_partita WHERE automatico = 1').all() as Array<{ partita_id: number; punto_chiave: string }>;
    if (automatici.length === 0) return;
    db.prepare('DELETE FROM utente.punto_partita WHERE automatico = 1').run();
    // l'Enigma di cui il boss era un passo: solo se lo schema di gioco conosce i passi (095)
    const conPassi = (db.prepare('PRAGMA main.table_info(punto_interesse)').all() as Array<{ name: string }>).some((c) => c.name === 'contenitore_chiave');
    if (!conPassi) return;
    const adesso = new Date().toISOString();
    for (const r of automatici) allineaEnigmaDellaVoce(db, r.partita_id, r.punto_chiave, adesso);
  },
};
