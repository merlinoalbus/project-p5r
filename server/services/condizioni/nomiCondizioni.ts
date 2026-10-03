// ============================================================
// nomiCondizioni — chiave → nome per leggere una condizione in italiano
// ============================================================
//
// Una condizione salvata porta chiavi (`sojiro`, `tanaka-affari-loschi`, `yumenoshima/laptop-rotto`);
// il testo che l'app mostra si **genera** con `descriviRequisitoSpillo`, che vuole i nomi. Sono
// gli stessi per spilli, negozi, articoli e catalogo: si leggono qui, una volta per risposta.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { giocabili } from '../squadraService.js';
import type { NomiCondizioni } from '../../../shared/condizioniSpillo.js';
import { statoDelTipo } from '../../../shared/spilli.js';

/** Gli elenchi dei negozi valutano centinaia di righe per risposta: i nomi si leggono una volta e restano buoni un secondo.
 *  Senza i pin: le condizioni del catalogo e della città non citano lo stato di un pin (2026-10-03). */
let memo: { nomi: NomiCondizioni; a: number } | null = null;
export function nomiCondizioniMemo(): NomiCondizioni {
  const ora = Date.now();
  if (!memo || ora - memo.a > 1000) memo = { nomi: nomiCondizioni({ conPin: false }), a: ora };
  return memo.nomi;
}

/** I nomi per descrivere le condizioni; `conPin` (di norma sì) legge anche i pin con stato, che servono solo alle mappe. */
export function nomiCondizioni(opz: { conPin?: boolean } = {}): NomiCondizioni {
  const mappa = (sql: string) => Object.fromEntries((prepared(sql).all() as Array<{ chiave: string; nome: string }>).map((r) => [r.chiave, r.nome]));
  return {
    articoli: mappa('SELECT chiave, COALESCE(nome_it, nome) AS nome FROM articolo'),
    letture: mappa('SELECT chiave, COALESCE(nome_it, nome) AS nome FROM libro UNION ALL SELECT chiave, COALESCE(nome_it, nome) FROM film'),
    confidenti: mappa('SELECT chiave, nome FROM confidente'), quartieri: mappa('SELECT chiave, nome FROM quartiere'),
    richieste: mappa('SELECT chiave, nome FROM richiesta'), dungeon: mappa('SELECT chiave, nome FROM dungeon'),
    attivita: mappa('SELECT chiave, nome FROM attivita'), negozi: mappa('SELECT chiave, nome FROM negozio'),
    squadra: Object.fromEntries(giocabili().map((p) => [p.chiave, p.nome])),
    ...(opz.conPin === false ? {} : { spilli: Object.fromEntries(pinConStato().map((p) => [p.uid, { nome: p.nome, tipo: p.tipo, mappa: p.mappa }])) }),
  };
}

/** I pin delle mappe che hanno uno stato da segnare (raccolto, azionato, aperta…): quelli che una condizione «Pin di una mappa»
 *  può citare. Col nome della mappa preceduto da quello del genitore («Palazzo di Kamoshida › Vecchio castello 1P»): le
 *  planimetrie di Palazzi diversi hanno spesso lo stesso nome. */
export function pinConStato(): Array<{ uid: string; nome: string; tipo: string; mappa: string }> {
  return (prepared(`SELECT s.uid, s.nome, s.tipo, CASE WHEN g.nome IS NULL THEN m.nome ELSE g.nome || ' › ' || m.nome END AS mappa
    FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave LEFT JOIN mappa g ON g.chiave = m.genitore_chiave
    WHERE s.uid IS NOT NULL ORDER BY mappa, s.ordine, s.nome`)
    .all() as Array<{ uid: string; nome: string; tipo: string; mappa: string }>).filter((p) => statoDelTipo(p.tipo) !== null);
}
