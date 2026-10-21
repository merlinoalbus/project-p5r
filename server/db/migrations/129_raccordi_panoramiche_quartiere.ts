import type { Migration } from '../migrationRunner.js';
import { applicaRaccordiLuoghiL5 } from './raccordiLuoghiL5.js';

/** Tre coppie attestate: conserva i pin della panoramica e collega quelli della planimetria fisica. */
export const migration129: Migration = {
  id: 129, name: 'raccordi_approvati_con_panoramiche_quartiere',
  up(db) { applicaRaccordiLuoghiL5(db, '128'); },
};
