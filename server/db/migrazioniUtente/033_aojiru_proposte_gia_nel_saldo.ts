import type { Migration } from '../migrationRunner.js';

/**
 * R10-10/3 (corretta il 23/10 dal censimento sui dati di p5s): le proposte «effetto della voce» ancora aperte per una spunta fatta
 * PRIMA di «Doti a mano» (dc50f6a4, 30/09/2026 17:46 UTC) riguardano punti che l'app aveva già messo nel saldo: si chiudono come
 * «già nel saldo», chiuse dalla causa, senza applicare nulla e senza cancellare righe. Le spunte successive restano aperte: non si sa
 * se l'utente abbia segnato i punti, e li applica dal pulsante sulla voce (BON-01). Il riconciliatore non riapre le chiuse.
 */
export const utente033: Migration = {
  id: 33,
  name: 'aojiru_proposte_gia_nel_saldo',
  up(db) {
    db.prepare(`UPDATE utente.da_applicare SET stato='scartata',chiusa_da='causa',motivo_chiusura='gia-nel-saldo',decisa_il=?
      WHERE stato='aperta' AND tipo='effetto-voce' AND causa_tipo='voce'
        AND EXISTS (SELECT 1 FROM utente.spunta_voce_partita s WHERE s.partita_id=da_applicare.partita_id AND s.voce_uid=da_applicare.voce_uid AND s.fatta_at < '2026-09-30T17:46:01Z')`)
      .run(new Date().toISOString());
  },
};
