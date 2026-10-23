import type { Migration } from '../migrationRunner.js';
import { completaContinuitaLegacy } from '../acquistiLegacy.js';

/** Il bootstrap pre-main del runner conserva il contributo precedente senza riscrivere le tuple. */
export const utente030: Migration = {
  id: 30,
  name: 'continuita_acquisti',
  up: completaContinuitaLegacy,
};
