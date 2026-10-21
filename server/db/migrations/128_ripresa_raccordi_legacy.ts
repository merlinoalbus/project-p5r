import type { Migration } from '../migrationRunner.js';
import { applicaRaccordiLuoghiL5 } from './raccordiLuoghiL5.js';

/** Riprende soltanto i sei conflitti nominativi127; conserva fotografie legacy e rendiconto precedente. */
export const migration128: Migration = {
  id: 128, name: 'ripresa_raccordi_approvati_fotografie_legacy',
  up(db) { applicaRaccordiLuoghiL5(db, '127'); },
};
