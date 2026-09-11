// ============================================================
// 065 — le quattro categorie di spillo, e la destinazione è una mappa più uno spillo
// ============================================================
//
// Richiesta dell'utente (2026-09-11). Due cose:
//
// 1. **La destinazione di uno spostamento è «mappa + spillo»**, non «mappa + punto in percentuale
//    + zoom». Nasce `spillo_arrivo_id`; le quaranta destinazioni esistenti che avevano un punto
//    diventano lo spillo più vicino a quel punto sulla mappa d'arrivo (entro l'8% dell'immagine),
//    altrimenti restano «solo la mappa». Le colonne `x`, `y`, `zoom` restano per leggere i
//    pacchetti vecchi e non si usano più.
//
// 2. **La categoria decide il resto.** Un consumabile è collezionabile per definizione; gli altri
//    no. Uno spillo di città non è condizionato: la disponibilità è del negozio che mostra, non
//    del segnalino — le condizioni che il seed gli aveva messo (orari del luogo, sblocco del
//    quartiere) si tolgono. La destinazione vale solo per gli spostamenti.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { RIFERIMENTI_PER_CATEGORIA, categoriaSpillo, tipiDellaCategoria } from '../../../shared/spilli.js';
import { logger } from '../../utils/logger.js';

const TOLLERANZA = 8;

export const migration065: Migration = {
  id: 65,
  name: 'categorie_spillo_e_arrivo',
  up(db) {
    const colonne = (db.prepare('PRAGMA table_info(spillo_destinazione)').all() as Array<{ name: string }>).map((c) => c.name);
    if (!colonne.includes('spillo_arrivo_id')) db.exec('ALTER TABLE spillo_destinazione ADD COLUMN spillo_arrivo_id INTEGER REFERENCES spillo(id) ON DELETE SET NULL');

    // 1. il punto d'arrivo diventa uno spillo
    let risolte = 0; let soloMappa = 0;
    const righe = db.prepare('SELECT spillo_id, mappa_chiave, x, y FROM spillo_destinazione WHERE mappa_chiave IS NOT NULL AND spillo_arrivo_id IS NULL').all() as Array<{ spillo_id: number; mappa_chiave: string; x: number; y: number }>;
    const candidati = db.prepare('SELECT id, x, y FROM spillo WHERE mappa_chiave = ?');
    const scrivi = db.prepare('UPDATE spillo_destinazione SET spillo_arrivo_id = ?, x = 0, y = 0, zoom = 1 WHERE spillo_id = ?');
    for (const r of righe) {
      const vicino = (candidati.all(r.mappa_chiave) as Array<{ id: number; x: number; y: number }>)
        .map((s) => ({ id: s.id, d: Math.hypot(s.x - r.x, s.y - r.y) })).filter((s) => s.d <= TOLLERANZA).sort((a, b) => a.d - b.d)[0];
      scrivi.run(vicino?.id ?? null, r.spillo_id);
      if (vicino) risolte++; else soloMappa++;
    }

    // 2. la categoria decide collezionabile, condizioni e destinazione
    const consumabili = tipiDellaCategoria('consumabile');
    const inCitta = tipiDellaCategoria('citta');
    const spostamenti = tipiDellaCategoria('spostamento');
    const segnaposto = (n: number) => Array(n).fill('?').join(',');
    const collezionabili = db.prepare(`UPDATE spillo SET collezionabile = 1 WHERE tipo IN (${segnaposto(consumabili.length)}) AND collezionabile = 0`).run(...consumabili).changes;
    const nonCollezionabili = db.prepare(`UPDATE spillo SET collezionabile = 0 WHERE tipo NOT IN (${segnaposto(consumabili.length)}) AND collezionabile = 1`).run(...consumabili).changes;
    const senzaCondizioni = db.prepare(`UPDATE spillo SET condizioni_json = '[]' WHERE tipo IN (${segnaposto(inCitta.length)}) AND condizioni_json IS NOT NULL AND condizioni_json <> '[]'`).run(...inCitta).changes;
    const senzaDestinazione = db.prepare(`DELETE FROM spillo_destinazione WHERE spillo_id IN (SELECT id FROM spillo WHERE tipo NOT IN (${segnaposto(spostamenti.length)}))`).run(...spostamenti).changes;
    // il riferimento di uno spillo di città non è più «negozio»: il negozio si raggiunge dal luogo (tolleranza per chi lo aveva scritto così: resta valido)
    const fuoriCategoria = (db.prepare('SELECT id, tipo, riferimento_tipo FROM spillo WHERE riferimento_tipo IS NOT NULL').all() as Array<{ id: number; tipo: string; riferimento_tipo: string }>)
      .filter((r) => !ammesso(categoriaSpillo(r.tipo), r.riferimento_tipo));
    const togliRif = db.prepare('UPDATE spillo SET riferimento_tipo = NULL, riferimento_chiave = NULL WHERE id = ?');
    for (const r of fuoriCategoria) togliRif.run(r.id);

    logger.info({ destinazioni: righe.length, risolte, soloMappa, collezionabili, nonCollezionabili, senzaCondizioni, senzaDestinazione, riferimentiTolti: fuoriCategoria.length }, 'migrazione 065: categorie di spillo e destinazione «mappa + spillo»');
  },
};

function ammesso(categoria: string, riferimento: string): boolean {
  return ((RIFERIMENTI_PER_CATEGORIA as Record<string, readonly string[]>)[categoria] ?? []).includes(riferimento);
}
