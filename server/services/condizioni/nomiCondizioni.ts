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

/** Gli elenchi dei negozi valutano centinaia di righe per risposta: i nomi si leggono una volta e restano buoni un secondo. */
let memo: { nomi: NomiCondizioni; a: number } | null = null;
export function nomiCondizioniMemo(): NomiCondizioni {
  const ora = Date.now();
  if (!memo || ora - memo.a > 1000) memo = { nomi: nomiCondizioni(), a: ora };
  return memo.nomi;
}

export function nomiCondizioni(): NomiCondizioni {
  const mappa = (sql: string) => Object.fromEntries((prepared(sql).all() as Array<{ chiave: string; nome: string }>).map((r) => [r.chiave, r.nome]));
  return {
    articoli: mappa('SELECT chiave, COALESCE(nome_it, nome) AS nome FROM articolo'),
    letture: mappa('SELECT chiave, COALESCE(nome_it, nome) AS nome FROM libro UNION ALL SELECT chiave, COALESCE(nome_it, nome) FROM film'),
    confidenti: mappa('SELECT chiave, nome FROM confidente'), quartieri: mappa('SELECT chiave, nome FROM quartiere'),
    richieste: mappa('SELECT chiave, nome FROM richiesta'), dungeon: mappa('SELECT chiave, nome FROM dungeon'),
    attivita: mappa('SELECT chiave, nome FROM attivita'), negozi: mappa('SELECT chiave, nome FROM negozio'),
    squadra: Object.fromEntries(giocabili().map((p) => [p.chiave, p.nome])),
  };
}
