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
import { statoCitabile } from '../../../shared/spilli.js';
import { VOCE_DEL_PIN } from '../mappe/voceDelPin.js';

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
    ...(opz.conPin === false ? {} : { spilli: Object.fromEntries(pinConStato().map((p) => [p.uid, { nome: p.nome, tipo: p.tipo, mappa: p.mappa, parola: p.parola }])) }),
  };
}

/** I pin delle mappe che hanno uno stato da segnare: quelli che una condizione «Pin di una mappa» può citare — i tipi con uno stato
 *  (raccolto, aperto, parlato, incontrato, azionato…) e i pin collegati a una voce della guida non descrittiva, col suo «ottenuto» (un Confidente:
 *  2026-10-03, `statoCitabile`). Col nome della mappa preceduto da quello del genitore («Palazzo di Kamoshida › Vecchio castello
 *  1P»): le planimetrie di Palazzi diversi hanno spesso lo stesso nome. */
export function pinConStato(): Array<{ uid: string; nome: string; tipo: string; mappa: string; parola: string }> {
  return (prepared(`SELECT s.uid, s.nome, s.tipo, pi.tipo AS tipo_voce, CASE WHEN g.nome IS NULL THEN m.nome ELSE g.nome || ' › ' || m.nome END AS mappa
    FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave LEFT JOIN mappa g ON g.chiave = m.genitore_chiave
    LEFT JOIN punto_interesse pi ON pi.chiave = ${VOCE_DEL_PIN}
    WHERE s.uid IS NOT NULL ORDER BY mappa, s.ordine, s.nome`)
    .all() as Array<{ uid: string; nome: string; tipo: string; tipo_voce: string | null; mappa: string }>)
    .flatMap(({ tipo_voce, ...p }) => { const parola = statoCitabile(p.tipo, tipo_voce); return parola ? [{ ...p, parola }] : []; });
}

/** Il tipo e la parola dello stato di un pin citato, o null se il pin non c'è. `parola` è null se non è (più) citabile. */
export function pinCitato(uid: string): { nome: string; tipo: string; parola: string | null } | null {
  const p = prepared(`SELECT s.nome, s.tipo, pi.tipo AS tipo_voce FROM spillo s LEFT JOIN punto_interesse pi ON pi.chiave = ${VOCE_DEL_PIN} WHERE s.uid = ?`)
    .get(uid) as { nome: string; tipo: string; tipo_voce: string | null } | undefined;
  return p ? { nome: p.nome, tipo: p.tipo, parola: statoCitabile(p.tipo, p.tipo_voce) } : null;
}
