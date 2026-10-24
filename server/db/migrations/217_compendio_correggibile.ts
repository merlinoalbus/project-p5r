// ============================================================
// 217 — le regole di fusione del compendio si correggono e si ripristinano (L11 · R11-17/1, gruppo Compendio)
// ============================================================
//
// `arcana`, `fusione_arcana`, `fusione_speciale`, `tesoro`, `eredita_matrice` e `dlc_set` ricevono le tre colonne del registro dei ripristini
// (`origine`, `seed_json`, `updated_at`: vedi `colonneCorrezione.ts`). Le tabelle figlie (`fusione_speciale_ingrediente`, `tesoro_modificatore`,
// `dlc_set_persona`, `skill_fonte_esecuzione`) restano come sono: la fotografia sta sulla riga del padre. Nessun valore cambia.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { aggiungiColonneCorrezione } from './colonneCorrezione.js';

export const migration217: Migration = {
  id: 217, name: 'compendio_correggibile',
  up(db) {
    aggiungiColonneCorrezione(db, 217,
      ['arcana', 'fusione_arcana', 'fusione_speciale', 'tesoro', 'eredita_matrice', 'dlc_set'],
      ['fusione_speciale_ingrediente', 'tesoro_modificatore', 'dlc_set_persona', 'skill_fonte_esecuzione', 'persona', 'skill', 'traduzione']);
  },
};
