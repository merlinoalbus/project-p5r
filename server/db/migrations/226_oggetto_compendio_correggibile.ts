// ============================================================
// 226 — categoria e vincolo degli oggetti del compendio si correggono e si ripristinano (L11 · R11-17/1)
// ============================================================
//
// `oggetto` riceve le tre colonne del registro dei ripristini (`origine`, `seed_json`, `updated_at`: vedi `colonneCorrezione.ts`). Nome e descrizione restano nelle
// traduzioni, il legame col catalogo in `catalogo_chiave`. Nessun valore cambia; l'impronta delle colonne esistenti e delle tabelle collegate è identica prima e dopo.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { aggiungiColonneCorrezione } from './colonneCorrezione.js';

export const migration226: Migration = {
  id: 226, name: 'oggetto_compendio_correggibile',
  up(db) {
    aggiungiColonneCorrezione(db, 226, ['oggetto'], ['persona', 'catalogo_oggetto', 'traduzione']);
  },
};
