// ============================================================
// 224 — i legami di Iweleth fra Palazzo e dedalo si correggono e si ripristinano (L11 · R11-17/1, gruppo Dedalo)
// ============================================================
//
// `dedalo_confluenza`, `mappa_dedalo` e `infiltrazione_dedalo` ricevono le tre colonne del registro dei ripristini (`origine`, `seed_json`, `updated_at`: vedi
// `colonneCorrezione.ts`). Nessun valore cambia; l'impronta delle colonne esistenti e delle tabelle collegate è identica prima e dopo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { aggiungiColonneCorrezione } from './colonneCorrezione.js';

export const migration224: Migration = {
  id: 224, name: 'dedalo_correggibile',
  up(db) {
    aggiungiColonneCorrezione(db, 224,
      ['dedalo_confluenza', 'mappa_dedalo', 'infiltrazione_dedalo'],
      ['area_dedalo', 'dungeon_area', 'voce_confluenza', 'mappa']);
  },
};
