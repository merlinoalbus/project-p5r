import type { Migration } from '../migrationRunner.js';

/**
 * R10-10/3: le proposte Dote che ancora aspettano da un consumo di Aojiru (nascono dai consumi già registrati) riguardano punti che
 * l'utente ha già nel saldo: si chiudono come «già nel saldo», chiuse dalla causa, senza applicare nulla e senza cancellare righe
 * (stato, delta e registri restano quelli che erano). Il riconciliatore non le riapre: vedi `riconciliaBeneficiCausa`.
 */
export const utente033: Migration = {
  id: 33,
  name: 'aojiru_proposte_gia_nel_saldo',
  up(db) {
    db.prepare(`UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='gia-nel-saldo',decisa_il=?
      WHERE stato='aperta' AND tipo='dote' AND causa_tipo='acquisto'
        AND EXISTS (SELECT 1 FROM utente.acquisto_registrato a WHERE a.partita_id=da_applicare.partita_id AND a.id=da_applicare.causa_chiave AND json_extract(a.dati_json,'$.regola')='aojiru')`)
      .run(new Date().toISOString());
  },
};
