// ============================================================
// nomiCondizioni — chiave → nome per leggere una condizione in italiano
// ============================================================
//
// Una condizione salvata porta chiavi (`sojiro`, `tanaka-affari-loschi`, `yumenoshima/laptop-rotto`);
// il testo che l'app mostra si **genera** con `descriviRequisitoSpillo`, che vuole i nomi. Sono
// gli stessi per spilli, negozi, articoli e catalogo: si leggono qui, una volta per risposta.
// ============================================================

import { prepared } from '../../db/dbService.js';
import { registraCacheDiGioco } from '../cacheDiGioco.js';
import { giocabili } from '../squadraService.js';
import type { NomiCondizioni } from '../../../shared/condizioniSpillo.js';
import { sqlVoceDescrittiva, statoCitabile } from '../../../shared/spilli.js';
import { vociDelPinSql } from '../mappe/voceDelPin.js';

/** Vero (1) se il pin `s` ha almeno una voce della guida non descrittiva (è quella che lo rende citabile), in SQL. */
const VOCE_DA_SEGNARE = `EXISTS (SELECT 1 FROM punto_interesse pi WHERE pi.chiave IN ${vociDelPinSql('s')} AND NOT ${sqlVoceDescrittiva('pi')})`;

/** Gli elenchi dei negozi valutano centinaia di righe per risposta: i nomi si leggono una volta e restano buoni un secondo.
 *  Senza i pin: le condizioni del catalogo e della città non citano lo stato di un pin (2026-10-03). */
let memo: { nomi: NomiCondizioni; a: number } | null = null;
registraCacheDiGioco(() => { memo = null; });
/** I nomi senza pin dalla memoria, riletti se hanno più di un secondo o se la cache dei dati di gioco è stata svuotata. */
export function nomiCondizioniMemo(): NomiCondizioni {
  const ora = Date.now();
  if (!memo || ora - memo.a > 1000) memo = { nomi: nomiCondizioni({ conPin: false }), a: ora };
  return memo.nomi;
}

/**
 * I nomi per descrivere le condizioni; `conPin` (di norma sì) legge anche i pin con stato e le voci della guida, che servono solo
 * alle mappe.
 *
 * Ogni elenco si legge **la prima volta che lo si chiede**, poi resta per tutta la risposta: una mappa le cui condizioni citano
 * solo Confidenti non legge articoli, letture né tutti i pin con stato. Prima si leggevano tutti a ogni risposta, e i pin con stato
 * (una query su tutti gli spilli con due join e un ordinamento) erano da soli un terzo del tempo di una mappa (rilievo P6 della
 * verifica, 2026-10-03). I nomi letti sono sempre quelli di adesso: niente cache fra una risposta e l'altra.
 */
export function nomiCondizioni(opz: { conPin?: boolean } = {}): NomiCondizioni {
  /** Da una query chiave/nome a una funzione che, chiamata, restituisce l'oggetto chiave → nome. */
  const mappa = (sql: string) => () => Object.fromEntries((prepared(sql).all() as Array<{ chiave: string; nome: string }>).map((r) => [r.chiave, r.nome]));
  const elenchi: { [K in keyof NomiCondizioni]-?: () => NonNullable<NomiCondizioni[K]> } = {
    articoli: mappa('SELECT chiave, COALESCE(nome_it, nome) AS nome FROM articolo'),
    letture: mappa('SELECT chiave, COALESCE(nome_it, nome) AS nome FROM libro UNION ALL SELECT chiave, COALESCE(nome_it, nome) FROM film'),
    confidenti: mappa('SELECT chiave, nome FROM confidente'), quartieri: mappa('SELECT chiave, nome FROM quartiere'),
    richieste: mappa('SELECT chiave, nome FROM richiesta'), dungeon: mappa('SELECT chiave, nome FROM dungeon'),
    attivita: mappa('SELECT chiave, nome FROM attivita'), negozi: mappa('SELECT chiave, nome FROM negozio'),
    squadra: () => Object.fromEntries(giocabili().map((p) => [p.chiave, p.nome])),
    spilli: () => Object.fromEntries(pinConStato().map((p) => [p.uid, { nome: p.nome, tipo: p.tipo, mappa: p.mappa, parola: p.parola }])),
    voci: () => Object.fromEntries(vociCitabili().map((v) => [v.chiave, { nome: v.nome, posto: v.posto }])),
  };
  const nomi: NomiCondizioni = {};
  for (const chiave of Object.keys(elenchi) as Array<keyof NomiCondizioni>) {
    // le voci della guida, come i pin, si citano solo nelle condizioni dei pin delle mappe (2026-10-11)
    if ((chiave === 'spilli' || chiave === 'voci') && opz.conPin === false) continue;
    let valore: unknown;
    let letto = false;
    Object.defineProperty(nomi, chiave, {
      enumerable: true,
      configurable: true,
      get: () => { if (!letto) { valore = elenchi[chiave](); letto = true; } return valore; },
    });
  }
  return nomi;
}

/** I pin delle mappe che hanno uno stato da segnare: quelli che una condizione «Pin di una mappa» può citare — i tipi con uno stato
 *  (raccolto, aperto, parlato, incontrato, azionato…) e i pin collegati a una voce della guida non descrittiva, col suo «ottenuto» (un Confidente:
 *  2026-10-03, `statoCitabile`). Col nome della mappa preceduto da quello del genitore («Palazzo di Kamoshida › Vecchio castello
 *  1P»): le planimetrie di Palazzi diversi hanno spesso lo stesso nome. */
export function pinConStato(): Array<{ uid: string; nome: string; tipo: string; mappa: string; parola: string }> {
  return (prepared(`SELECT s.uid, s.nome, s.tipo, ${VOCE_DA_SEGNARE} AS da_segnare, CASE WHEN g.nome IS NULL THEN m.nome ELSE g.nome || ' › ' || m.nome END AS mappa
    FROM spillo s JOIN mappa m ON m.chiave = s.mappa_chiave LEFT JOIN mappa g ON g.chiave = m.genitore_chiave
    WHERE s.uid IS NOT NULL ORDER BY mappa, s.ordine, s.nome`)
    .all() as Array<{ uid: string; nome: string; tipo: string; da_segnare: number; mappa: string }>)
    .flatMap(({ da_segnare, ...p }) => { const parola = statoCitabile(p.tipo, da_segnare === 1); return parola ? [{ ...p, parola }] : []; });
}

/** Il tipo e la parola dello stato di un pin citato, o null se il pin non c'è. `parola` è null se non è (più) citabile. */
export function pinCitato(uid: string): { nome: string; tipo: string; parola: string | null } | null {
  const p = prepared(`SELECT s.nome, s.tipo, ${VOCE_DA_SEGNARE} AS da_segnare FROM spillo s WHERE s.uid = ?`)
    .get(uid) as { nome: string; tipo: string; da_segnare: number } | undefined;
  return p ? { nome: p.nome, tipo: p.tipo, parola: statoCitabile(p.tipo, p.da_segnare === 1) } : null;
}

/**
 * Le voci della guida dei Palazzi e dei Memento (scelta dell'utente) che una condizione «Voce della guida» può citare (2026-10-11): tutte tranne le descrittive
 * («Altro» fuori dalle aree dei dedali, 099), che uno stato non lo hanno; i passi degli Enigmi compresi. In ordine di guida (Palazzo,
 * area, area del dedalo, Enigma coi suoi passi, voce), col posto da mostrare («Palazzo di Kamoshida › 2. Sala Centrale», «Memento ›
 * 1. Dedalo di Qimranut › Area 1»).
 */
export function vociCitabili(): Array<{ chiave: string; nome: string; tipo: string; posto: string }> {
  return prepared(`SELECT p.chiave, p.nome, p.tipo, d.nome || ' › ' || (a.ordine + 1) || '. ' || a.nome || COALESCE(' › ' || ad.nome, '') AS posto
    FROM punto_interesse p JOIN dungeon_area a ON a.chiave = p.area_chiave JOIN dungeon d ON d.chiave = a.dungeon_chiave
    LEFT JOIN punto_interesse e ON e.chiave = p.contenitore_chiave LEFT JOIN area_dedalo ad ON ad.chiave = p.area_dedalo_chiave
    WHERE NOT ${sqlVoceDescrittiva('p')}
    ORDER BY d.ordine, a.ordine, ad.ordine, COALESCE(e.ordine, p.ordine), p.contenitore_chiave IS NOT NULL, p.ordine, p.chiave`)
    .all() as Array<{ chiave: string; nome: string; tipo: string; posto: string }>;
}
