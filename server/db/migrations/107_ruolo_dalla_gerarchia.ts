// ============================================================
// 107 — il ruolo dell'immagine di ogni mappa si deduce dal suo posto nella gerarchia (L1, 2026-10-20)
// ============================================================
//
// Lotto L1 del piano di razionalizzazione: «un risolutore d'immagine per tutte le viste; il ruolo dell'immagine si deduce dal
// posto nella gerarchia». Fino alla 106 il ruolo l'avevano scritto cinque regole diverse (043, 044, la sincronizzazione,
// l'importazione, il caricamento e la 106), e la stessa mappa poteva averne uno diverso secondo la strada da cui era arrivata. Da
// qui una regola sola (`sqlRuoloDaGerarchia` in `shared/immaginiMappa.ts`), che il server riapplica dopo ogni scrittura
// (`allineaRuoliImmagine`); questa migrazione la applica una volta a tutte le mappe.
//
// Sulla fotografia di produzione del 2026-10-20 cambia una mappa sola: la «Banchina della metropolitana» di Yongen-Jaya, una
// planimetria del mondo registrata come illustrazione (si apre nel visore come prima). Le radici dei Palazzi e dei Memento restano
// stemmi anche con un'illustrazione caricata: identificano il posto, e il visore non si apre su di loro.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const migration107: Migration = {
  id: 107,
  name: 'ruolo_dalla_gerarchia',
  up(db) {
    // la stessa regola di `sqlRuoloDaGerarchia('mappa')`, scritta qui: una migrazione non segue il codice che cambia
    const regola = `CASE
      WHEN mappa.genitore_chiave IS NULL AND mappa.tipo IN ('palazzo', 'dedalo') THEN 'emblema'
      WHEN NOT (EXISTS (SELECT 1 FROM immagine i WHERE i.ambito = 'mappa' AND (i.chiave = mappa.chiave OR i.chiave = mappa.immagine_chiave))
        OR EXISTS (SELECT 1 FROM immagine i WHERE mappa.asset = i.ambito || '/' || i.chiave)) THEN 'nessuna'
      WHEN mappa.tipo IN ('citta', 'quartiere') THEN 'illustrazione-editoriale'
      ELSE 'planimetria-nativa' END`;
    const cambiate = db.prepare(`SELECT chiave, ruolo_immagine AS prima, ${regola} AS dopo FROM mappa WHERE ruolo_immagine IS NOT ${regola}`).all() as Array<{ chiave: string; prima: string; dopo: string }>;
    db.prepare(`UPDATE mappa SET ruolo_immagine = ${regola} WHERE ruolo_immagine IS NOT ${regola}`).run();
    logger.info({ mappe: cambiate.length, cambiate: cambiate.slice(0, 20) }, 'migrazione 107: ruolo dell’immagine dedotto dalla gerarchia');
  },
};
