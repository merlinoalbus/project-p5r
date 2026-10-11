// ============================================================
// utente 018 — i timbri raccolti passano dal dedalo alla sua Area 1
// ============================================================
//
// Dalla migrazione di gioco 099 (richiesta dell'utente, 2026-10-11: «Dedalo → Aree → Elementi», con i timbri «Elementi delle
// aree») il totale dei timbri sta nell'area del dedalo, non più nel dedalo. I timbri che ogni partita aveva segnato per un
// dedalo (`timbri_dedalo_partita.area_chiave` = la chiave del dedalo, utente 003) passano alla sua «Area 1», che la 099 crea
// con una chiave fissa (`<dedalo>-area-1`) e con il totale del dedalo. Solo dove quell'area c'è nel file di gioco: un
// conteggio di un dedalo che non ne ha resta com'è (e il controllo degli orfani del pacchetto lo segnala).
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { chiaveAreaIniziale } from '../migrations/099_aree_dei_dedali.js';

export const utente018: Migration = {
  id: 18,
  name: 'timbri_nelle_aree_dei_dedali',
  up(db) {
    if (!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'timbri_dedalo_partita'").get()) return;
    if (!db.prepare("SELECT 1 FROM main.sqlite_master WHERE type = 'table' AND name = 'area_dedalo'").get()) return;
    const righe = db.prepare('SELECT DISTINCT area_chiave FROM utente.timbri_dedalo_partita').all() as Array<{ area_chiave: string }>;
    const esiste = db.prepare('SELECT 1 FROM main.area_dedalo WHERE chiave = ? AND dedalo_chiave = ?');
    const sposta = db.prepare('UPDATE utente.timbri_dedalo_partita SET area_chiave = ? WHERE area_chiave = ?');
    for (const { area_chiave: dedalo } of righe) {
      const area = chiaveAreaIniziale(dedalo);
      if (esiste.get(area, dedalo)) sposta.run(area, dedalo);
    }
  },
};
