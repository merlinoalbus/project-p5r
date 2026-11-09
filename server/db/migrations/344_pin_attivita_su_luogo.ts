// ============================================================
// 344 — i pin che puntano a un luogo non puntano più «all'attività» (L1-02, lotto «Un solo dove»)
// ============================================================
//
// Due pin avevano `riferimento_tipo = 'attivita'` ma la loro `riferimento_chiave` è la chiave di un LUOGO («shujin-academy/biblioteca-shujin»,
// «yongen-jaya/batting-cage-yongen»), non di un'attività: il tipo diceva una cosa e la chiave un'altra (il pin 1587 ha anche l'identità del seed
// col riferimento già al luogo). Il tipo di riferimento «attività» esce dal vocabolario dei pin (`shared/spilli.ts`, L1-02): i due pin passano
// al tipo `luogo`, con la stessa chiave.
//   - pin 334 (uid 55855d95…, «Libreria», planimetria nativa rmap-002-0-2) → luogo `shujin-academy/biblioteca-shujin`
//   - pin 1587 (uid 4ad213e6…, «Gabbie di Battuta», planimetria nativa rmap-009-2-0) → luogo `yongen-jaya/batting-cage-yongen`
//
// COSA (conservativa, idempotente): ogni pin con `riferimento_tipo = 'attivita'` passa a `luogo` SOLO se la sua chiave è la chiave di un luogo e
// NON è la chiave di un'attività (la guardia per identità: una chiave che è anche un'attività vera resta, e si conta). `uid`, `x`, `y`, nome,
// tipo, condizioni, identità del seed e ogni altra colonna di `spillo`, e le tabelle che lo citano, restano identici (impronte prima e dopo).
// Le tabelle delle partite (`spillo_partita`, `divergenza_partita`, `spillo_partita_infiltrazione`) citano il pin per uid e non portano il tipo
// di riferimento: non cambiano e questa migrazione non scrive nello schema `utente`.
// Il verbale è `dati_guida.audit-l1-02-pin-attivita`.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { esisteTabella, improntaTabella } from './pulizieL11.js';
import { registraAudit } from './archivioL1.js';

const errore = (motivo: string): never => { throw new Error(`344: ${motivo}; nessuna modifica applicata.`); };

/** Le tabelle (con rowid) che questa migrazione non deve cambiare. */
const INTATTE = ['luogo', 'attivita', 'negozio', 'negozio_sede_spillo', 'spillo_immagine', 'spillo_destinazione', 'cestino'] as const;

export const migration344: Migration = {
  id: 344,
  name: 'pin_attivita_su_luogo',
  up(db) {
    if (!db.inTransaction) errore('manca la transazione della migrazione');
    if (!esisteTabella(db, 'spillo') || !esisteTabella(db, 'luogo') || !esisteTabella(db, 'dati_guida')) return;

    const candidati = db.prepare("SELECT id, uid, riferimento_chiave AS chiave FROM main.spillo WHERE riferimento_tipo = 'attivita' ORDER BY id")
      .all() as Array<{ id: number; uid: string | null; chiave: string | null }>;
    if (candidati.length === 0) return;

    const eLuogo = db.prepare('SELECT 1 FROM main.luogo WHERE chiave = ?').pluck();
    const eAttivita = esisteTabella(db, 'attivita') ? db.prepare('SELECT 1 FROM main.attivita WHERE chiave = ?').pluck() : null;
    const spostabili = candidati.filter((p) => p.chiave !== null && !!eLuogo.get(p.chiave) && !(eAttivita && eAttivita.get(p.chiave)));
    const rimasti = candidati.filter((p) => !spostabili.includes(p));

    // le impronte di prima: tutto `spillo` tranne il tipo di riferimento, e le tabelle che non devono cambiare
    const prima = new Map<string, string>([['spillo', improntaTabella(db, 'spillo', ['riferimento_tipo'])]]);
    for (const t of INTATTE) if (esisteTabella(db, t)) prima.set(t, improntaTabella(db, t));
    const luoghiPrima = db.prepare("SELECT COUNT(*) FROM main.spillo WHERE riferimento_tipo = 'luogo'").pluck().get() as number;
    const totalePrima = db.prepare('SELECT COUNT(*) FROM main.spillo').pluck().get() as number;

    const sposta = db.prepare("UPDATE main.spillo SET riferimento_tipo = 'luogo' WHERE id = ? AND riferimento_tipo = 'attivita' AND riferimento_chiave = ?");
    for (const p of spostabili) if (sposta.run(p.id, p.chiave).changes !== 1) errore(`il pin ${p.id} non si aggiorna`);

    const luoghiDopo = db.prepare("SELECT COUNT(*) FROM main.spillo WHERE riferimento_tipo = 'luogo'").pluck().get() as number;
    const attivitaDopo = db.prepare("SELECT COUNT(*) FROM main.spillo WHERE riferimento_tipo = 'attivita'").pluck().get() as number;
    if (luoghiDopo !== luoghiPrima + spostabili.length) errore('i pin verso un luogo non sono aumentati di quanti spostati');
    if (attivitaDopo !== rimasti.length) errore('i pin verso un’attività rimasti non sono quelli attesi');
    if (db.prepare('SELECT COUNT(*) FROM main.spillo').pluck().get() !== totalePrima) errore('il numero dei pin è cambiato');
    if (improntaTabella(db, 'spillo', ['riferimento_tipo']) !== prima.get('spillo')) errore('le altre colonne di spillo sono cambiate');
    for (const t of INTATTE) if (prima.has(t) && improntaTabella(db, t) !== prima.get(t)) errore(`la tabella ${t} è cambiata`);

    registraAudit(db, 'audit-l1-02-pin-attivita', {
      migrazione: 'L1-02 · 344',
      spostati: spostabili.map((p) => ({ id: p.id, uid: p.uid, riferimento_chiave: p.chiave, da: 'attivita', a: 'luogo' })),
      rimasti: rimasti.map((p) => ({ id: p.id, uid: p.uid, riferimento_chiave: p.chiave, motivo: p.chiave === null ? 'chiave nulla' : eAttivita?.get(p.chiave) ? 'la chiave è anche quella di un’attività' : 'la chiave non è quella di un luogo' })),
      pinConTipoAttivitaDopo: attivitaDopo,
    });
    logger.info({ migrazione: 'L1-02-344', spostati: spostabili.map((p) => p.id), rimasti: rimasti.map((p) => p.id) }, 'pin con tipo «attività» portati al tipo luogo');
  },
};
