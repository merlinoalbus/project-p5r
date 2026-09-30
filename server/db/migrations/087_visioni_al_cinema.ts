// ============================================================
// 087 — al cinema ogni spunta è una visione, non «la n-esima visione»
// ============================================================
//
// La prima conversione (086) dava alla n-esima visita della guida allo stesso film «almeno n
// visioni»: chi saltava la prima visita e spuntava la seconda riceveva due visioni, e i punti di una
// visione mai fatta (rilievo della revisione, 2026-09-30). Al cinema un effetto di lettura vale ora
// «una visione» (`almeno: null`), che il motore conta insieme alle altre spunte. Qui si allineano le
// azioni già convertite; su un file che nasce con la 086 attuale non cambia nulla.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';

export const migration087: Migration = {
  id: 87,
  name: 'visioni_al_cinema',
  up(db) {
    const cinema = new Set((db.prepare("SELECT chiave FROM film WHERE dove = 'cinema'").all() as Array<{ chiave: string }>).map((r) => r.chiave));
    const scrivi = db.prepare('UPDATE giorno_percorso SET azioni_json = ? WHERE data = ?');
    let corrette = 0;
    for (const g of db.prepare('SELECT data, azioni_json FROM giorno_percorso').all() as Array<{ data: string; azioni_json: string }>) {
      const azioni = JSON.parse(g.azioni_json) as Array<{ produce?: Array<{ tipo: string; categoria?: string; chiave?: string; almeno?: number | null }> }>;
      let cambiato = false;
      for (const a of azioni) {
        for (const e of a.produce ?? []) {
          if (e.tipo === 'lettura' && e.categoria === 'film' && e.chiave && cinema.has(e.chiave) && e.almeno !== null) {
            e.almeno = null;
            cambiato = true;
            corrette++;
          }
        }
      }
      if (cambiato) scrivi.run(JSON.stringify(azioni), g.data);
    }
    logger.info({ corrette }, 'migrazione 087: al cinema ogni spunta è una visione');
  },
};
