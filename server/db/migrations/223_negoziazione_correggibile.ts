// ============================================================
// 223 — il corpus della negoziazione si corregge e si ripristina (L11 · R11-17/1, gruppo Negoziazione)
// ============================================================
//
// `negoziazione_variante`, `negoziazione_risposta`, `negoziazione_verdetto` e `negoziazione_umore` ricevono le tre colonne del registro dei ripristini
// (`origine`, `seed_json`, `updated_at`: vedi `colonneCorrezione.ts`). `negoziazione_domanda` (solo chiave e ordine) e `negoziazione_importazione` non cambiano.
// Nessun valore cambia; l'impronta delle colonne esistenti e delle tabelle collegate è identica prima e dopo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { aggiungiColonneCorrezione } from './colonneCorrezione.js';

export const migration223: Migration = {
  id: 223, name: 'negoziazione_correggibile',
  up(db) {
    aggiungiColonneCorrezione(db, 223,
      ['negoziazione_variante', 'negoziazione_risposta', 'negoziazione_verdetto', 'negoziazione_umore'],
      ['negoziazione_domanda', 'negoziazione_importazione', 'traduzione']);
  },
};
