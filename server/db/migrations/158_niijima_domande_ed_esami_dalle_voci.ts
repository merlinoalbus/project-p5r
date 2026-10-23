// ============================================================
// 158 — i banchi di Niijima, le date con due domande e gli esami (R10-04, R10-09, R10-12, decisioni del PM del 24/10)
// ============================================================
//
// Residui delle 154-157, decisi con le fonti Royal e la regola «vince il dato Royal, non si inventa niente»:
//   - Banchi di Niijima: la guida descrive UNA cassa, nella lobby dei soci (raggiungibile l'11-13). Le voci del 13/11 «Palazzo di Sae:
//     infiltrazione nel casino…» e del 14/11 «Palazzo di Niijima: Lobby del Piano Puntate Alte…» segnano l'evento
//     `niijima-banco-soci-accessibile`. L'evento `niijima-banco-alte-accessibile` NON si toglie: lo usano lo sblocco di un negozio e
//     tre condizioni di articoli (dato della guida): resta, e va detto al PM.
//   - Cinque date hanno una domanda in classe e una domanda del quiz TV (05-19, 05-26, 06-23, 09-29, 11-10): la voce del giorno copre
//     entrambe, quindi riceve un effetto «domanda» per ciascuna.
//   - Dodici voci «Sostenere gli esami / l'esame» (medi 05-11/12/13 e 10-17/18/19, finali 07-13/14/15 e 12-20/21/22): ognuna riceve
//     l'effetto «domanda» della domanda d'esame di quel giorno (una per data nel dataset).
// Restano senza effetto biliardo rango 3 (nessuna data nelle fonti), cruciverba 02-01, 08-16 e 08-29, Pietra Sacra, televendite e
// softair (nessun articolo). Le voci si ritrovano per uid (prefisso unico) e per testo; la domanda deve essere nello stesso giorno della
// voce. Testo, ordine, uid e spunte non cambiano; le spunte già date non riapplicano niente. Scrive solo in `main`. Idempotente.
// ============================================================

import type { Migration } from '../migrationRunner.js';
import { logger } from '../../utils/logger.js';
import { aggiungiEffettoAllaVoce } from './aggiungiEffettoVoce.js';

const SOCI = 'niijima-banco-soci-accessibile';
const VOCI_NIIJIMA: ReadonlyArray<readonly [string, string]> = [
  ['ebe00e6b2fe3f80a827f88f5503165fc', 'Palazzo di Sae: infiltrazione nel casino'],
  ['dece90bfb20d9d3328f2a6b0ca417590', 'Palazzo di Niijima: Lobby del Piano Puntate Alte'],
];
/** [voce (prefisso), testo, id domande del giorno]. */
const DOMANDE_DEL_GIORNO: ReadonlyArray<readonly [string, string, readonly number[]]> = [
  ['6be2c9026a1458', 'Rispondere alla domanda', [13, 68]], ['b8096fe6fc1a4c', 'Rispondere alla domanda', [16, 69]], ['eba81684557498', 'Rispondere alla domanda', [24, 71]],
  ['bcef2fd3c28dbb', 'Rispondere alla domanda', [42, 74]], ['274bfc5563d6a5', 'Rispondere alla domanda', [54, 75]],
  ['5f54d080', 'Sostenere', [9]], ['3a3a76ea', 'Sostenere', [10]], ['b290d874', 'Sostenere', [11]],
  ['5b09fca7', 'Sostenere', [32]], ['a0c30301', 'Sostenere', [33]], ['8d32076e', 'Sostenere', [34]],
  ['a33b2935', 'Sostenere', [46]], ['03cf4b22', 'Sostenere', [47]], ['c0e19947', 'Sostenere', [48]],
  ['a0d78233', 'Sostenere', [59]], ['48d9adfc', 'Sostenere', [60]], ['8af7b81b', 'Sostenere', [61]],
];

export const migration158: Migration = {
  id: 158,
  name: 'niijima_domande_ed_esami_dalle_voci',
  up(db) {
    let aggiunti = 0, saltati = 0;
    const conta = (e: string) => { if (e === 'aggiunto') aggiunti++; else if (e === 'saltato') saltati++; };
    for (const [voce, testo] of VOCI_NIIJIMA) conta(aggiungiEffettoAllaVoce(db, '158', voce, testo, { tipo: 'storia', evento: SOCI }, SOCI));
    for (const [voce, testo, domande] of DOMANDE_DEL_GIORNO) {
      for (const id of domande) {
        // la domanda deve esistere e stare nel giorno della voce
        if (!db.prepare('SELECT 1 FROM main.domanda d JOIN main.voce_giornata v ON v.uid LIKE ? AND v.data = d.data WHERE d.id = ?').get(`${voce}%`, id)) { saltati++; continue; }
        conta(aggiungiEffettoAllaVoce(db, '158', voce, testo, { tipo: 'domanda', domanda: id }, String(id)));
      }
    }
    logger.info({ aggiunti, saltati }, '158: Niijima, date con due domande ed esami collegati alle voci');
  },
};
