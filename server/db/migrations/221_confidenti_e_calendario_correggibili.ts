// ============================================================
// 221 — Confidenti, premi degli esami, settimane della guida e collegamenti evento ↔ Diario si correggono e si ripristinano (L11 · R11-17/1)
// ============================================================
//
// `confidente`, `esame_premi`, `settimana_guida` e `evento_calendario_voce` ricevono le tre colonne del registro dei ripristini (`origine`, `seed_json`,
// `updated_at`: vedi `colonneCorrezione.ts`). Nessun valore cambia; l'impronta delle colonne esistenti e delle tabelle collegate è identica prima e dopo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { aggiungiColonneCorrezione } from './colonneCorrezione.js';

export const migration221: Migration = {
  id: 221, name: 'confidenti_e_calendario_correggibili',
  up(db) {
    aggiungiColonneCorrezione(db, 221,
      ['confidente', 'esame_premi', 'settimana_guida', 'evento_calendario_voce'],
      ['confidente_rango', 'confidente_regalo', 'domanda', 'esame', 'evento_calendario', 'voce_giornata', 'giorno']);
  },
};
