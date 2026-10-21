import type { Migration } from '../migrationRunner.js';
import { bonificaInformazioniMakoto } from '../../services/disponibilitaConfidentiService.js';

/** Informazioni descrittive: calendario consigliato e Persona in scorta, senza cambiare requisiti operativi. */
export const migration131: Migration = {
  id: 131, name: 'informazioni_makoto',
  up(db) { db.transaction(() => bonificaInformazioniMakoto(db))(); },
};
