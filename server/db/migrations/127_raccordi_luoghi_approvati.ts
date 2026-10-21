import type { Migration } from '../migrationRunner.js';
import { applicaRaccordiLuoghiL5 } from './raccordiLuoghiL5.js';

/** Elenco di otto raccordi approvato dall'utente: qui soltanto i sei seed; i due personali passano dal CAS. */
export const migration127: Migration = {
  id: 127, name: 'sei_raccordi_luoghi_approvati',
  up(db) { applicaRaccordiLuoghiL5(db); },
};
