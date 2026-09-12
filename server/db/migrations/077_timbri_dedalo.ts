// ============================================================
// 077 — i timbri di un dedalo dei Memento sono un numero, non una frase
// ============================================================
//
// La guida dichiara i timbri totali di sei dedali su nove dentro la prosa di
// `dungeon_area.descrizione» («10 Aree (Area 1-10); Sala d'attesa in Area 6; 20 Timbri totali …»).
// Nasce `timbri_totale`, letto da quella frase con un'espressione esatta; per Qimranut, Chemdah e
// Iweleth la guida non li dichiara e il valore resta nullo: è un dato che manca, non uno zero.
// Il conteggio per partita sta nel file delle partite (`timbri_dedalo_partita`, migrazione
// «utente» 003).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiColonna } from '../colonne.js';

export function timbriDallaDescrizione(descrizione: string | null | undefined): number | null {
  const m = (descrizione ?? '').match(/(\d+)\s+timbri\s+totali/i);
  return m ? Number(m[1]) : null;
}

export const migration077: Migration = {
  id: 77,
  name: 'timbri_dedalo',
  up(db) {
    aggiungiColonna(db, 'dungeon_area', 'timbri_totale', 'INTEGER CHECK (timbri_totale IS NULL OR timbri_totale >= 0)');
    const aree = db.prepare("SELECT chiave, descrizione FROM dungeon_area WHERE dungeon_chiave = 'mementos' AND timbri_totale IS NULL").all() as Array<{ chiave: string; descrizione: string }>;
    const scrivi = db.prepare('UPDATE dungeon_area SET timbri_totale = ? WHERE chiave = ?');
    const senza: string[] = [];
    let dichiarati = 0;
    for (const a of aree) {
      const n = timbriDallaDescrizione(a.descrizione);
      if (n === null) { senza.push(a.chiave); continue; }
      scrivi.run(n, a.chiave);
      dichiarati++;
    }
    logger.info({ dichiarati, senza }, 'migrazione 077: timbri totali dei dedali');
  },
};
