import type { Migration } from '../migrationRunner.js';

/**
 * BON-12: gli yen si cambiano a mano, l'app mostra solo un promemoria. Le proposte di yen ancora aperte si chiudono come «non più
 * dovute», senza effetti: nessun movimento di denaro, nessuna riga cancellata. Le proposte già decise restano come sono.
 */
export const utente031: Migration = {
  id: 31,
  name: 'yen_solo_promemoria',
  up(db) {
    db.prepare("UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='non-piu-dovuta',decisa_il=? WHERE tipo='yen' AND stato='aperta'").run(new Date().toISOString());
  },
};
