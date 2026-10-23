// ============================================================
// effettiDiStatoService — gli effetti «segna lo stato» delle voci del Diario (R10-01, R10-03, R10-09)
// ============================================================
//
// Quattro tipi di effetto che citano il loro oggetto per chiave: `storia` (un evento di storia, per esempio la mansarda pulita),
// `domanda` (una domanda in classe o un esame), `cruciverba` (un cruciverba risolto), `richiesta` (una Richiesta completata),
// `articolo` (un articolo di un negozio comprato, tranne l'Aojiru; gli yen restano un promemoria). La spunta li segna con gli
// STESSI setter delle pagine (`impostaEventoStoria`, `impostaDomandaFatta`, `impostaCruciverba`, `impostaStatoRichiesta`,
// `impostaAcquisto`: una sola regola per azione); togliere la spunta riporta lo stato com'era PRIMA, anche dopo un
// ricaricamento (il «prima» sta in `utente.effetto_stato_voce`, non nella pagina). Ciò che c'era già non si disfa: se l'evento era
// già segnato a mano, togliere la spunta lo lascia segnato. Nessuna Dote cambia da qui (D6): la Conoscenza di una domanda o di un
// cruciverba resta da applicare dal pulsante sulla voce.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { EVENTI_PESCA } from '../../shared/pesca.js';
import type { EffettoDiStatoVoce } from '../../shared/effettiVoce.js';
import { impostaEventoStoria } from './semaforiService.js';
import { impostaDomandaFatta } from './domandeService.js';
import { impostaCruciverba } from './cruciverbaService.js';
import { impostaStatoRichiesta } from './richiesteService.js';
import { impostaAcquisto } from './negoziService.js';
import { eOffertaAojiru } from '../../shared/acquisti.js';

type StatoPrima = { gia: boolean; stato?: string | null };

/** L'oggetto citato esiste? Chiamata quando l'effetto si scrive nell'editor: una chiave sbagliata si rifiuta subito. */
export function verificaEffettoDiStato(e: EffettoDiStatoVoce): void {
  if (e.tipo === 'storia') {
    if (EVENTI_PESCA.includes(e.evento as typeof EVENTI_PESCA[number])) throw httpErrors.conflict('pesca-fatto-dedicato', 'Questo fatto usa il registro della pesca: non si segna da una voce.');
    return;
  }
  if (e.tipo === 'domanda' && !prepared('SELECT 1 FROM domanda WHERE id = ?').get(e.domanda)) throw httpErrors.notFound('domanda-non-trovata', `La domanda ${e.domanda} non esiste.`);
  if (e.tipo === 'cruciverba' && !prepared('SELECT 1 FROM cruciverba WHERE data = ?').get(e.data)) throw httpErrors.notFound('cruciverba-non-trovato', `Nessun cruciverba il ${e.data}.`);
  if (e.tipo === 'articolo') {
    const a = prepared('SELECT chiave, catalogo_chiave FROM articolo WHERE chiave = ?').get(e.articolo) as { chiave: string; catalogo_chiave: string | null } | undefined;
    if (!a) throw httpErrors.notFound('articolo-non-trovato', `L'articolo '${e.articolo}' non esiste.`);
    if (eOffertaAojiru({ chiave: a.chiave, catalogoChiave: a.catalogo_chiave })) throw httpErrors.conflict('articolo-aojiru', 'L’Aojiru ha i suoi consumi: usa l’effetto «Acquisto Aojiru».');
  }
  if (e.tipo === 'richiesta' && !prepared('SELECT 1 FROM richiesta WHERE chiave = ?').get(e.richiesta)) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${e.richiesta}' non esiste.`);
}

const chiaveDi = (e: EffettoDiStatoVoce): string => e.tipo === 'storia' ? e.evento : e.tipo === 'domanda' ? String(e.domanda) : e.tipo === 'cruciverba' ? e.data : e.tipo === 'articolo' ? e.articolo : e.richiesta;

function leggiPrima(p: number, e: EffettoDiStatoVoce): StatoPrima {
  if (e.tipo === 'storia') return { gia: (prepared('SELECT avvenuto FROM evento_storia_partita WHERE partita_id = ? AND evento_chiave = ?').get(p, e.evento) as { avvenuto: number } | undefined)?.avvenuto === 1 };
  if (e.tipo === 'domanda') return { gia: !!prepared('SELECT 1 FROM domanda_partita WHERE partita_id = ? AND domanda_id = ?').get(p, e.domanda) };
  if (e.tipo === 'cruciverba') return { gia: !!prepared('SELECT 1 FROM cruciverba_partita WHERE partita_id = ? AND data = ?').get(p, e.data) };
  if (e.tipo === 'articolo') return { gia: !!prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(p, e.articolo) };
  const stato = (prepared('SELECT stato FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').get(p, e.richiesta) as { stato: string } | undefined)?.stato ?? null;
  return { gia: stato === 'completata', stato };
}

/** Segna (nel verso `segna`) lo stato dell'effetto, o lo riporta com'era (`stato` della Richiesta). */
function scrivi(p: number, e: EffettoDiStatoVoce, segna: boolean, statoRichiesta: string | null = null): void {
  if (e.tipo === 'storia') impostaEventoStoria(p, e.evento, segna);
  else if (e.tipo === 'domanda') impostaDomandaFatta(p, e.domanda, segna, false);
  else if (e.tipo === 'cruciverba') impostaCruciverba(p, e.data, segna);
  else if (e.tipo === 'articolo') impostaAcquisto(p, e.articolo, segna);
  else impostaStatoRichiesta(p, e.richiesta, segna ? 'completata' : (statoRichiesta as 'completata' | null));
}

/** La spunta: segna ogni effetto di stato della voce, ricordando com'era lo stato (dentro la transazione della spunta). */
export function applicaEffettiDiStato(p: number, voceUid: string, effetti: Array<{ uid: string; effetto: EffettoDiStatoVoce }>): void {
  for (const { uid, effetto: e } of effetti) {
    const prima = leggiPrima(p, e);
    // rispuntando, il «prima» resta quello della prima volta (non diventa «già segnato» per colpa della spunta di prima)
    const vecchio = prepared('SELECT prima_json FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').get(p, voceUid, uid) as { prima_json: string } | undefined;
    if (!vecchio) {
      prepared('INSERT INTO utente.effetto_stato_voce (partita_id, voce_uid, effetto_uid, tipo, chiave, prima_json, applicato_il) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(p, voceUid, uid, e.tipo, chiaveDi(e), JSON.stringify(prima), new Date().toISOString());
    }
    if (prima.gia) continue;
    try { scrivi(p, e, true); }
    catch (err) {
      // un articolo non ancora disponibile nella partita non ferma la spunta della voce: resta da segnare dal negozio
      if (e.tipo === 'articolo' && (err as { code?: string }).code === 'articolo-non-disponibile') {
        if (!vecchio) prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, uid);
        continue;
      }
      throw err;
    }
  }
}

/** Per ogni stato, l'evento dello storico che i setter scrivono segnandolo (tipo e campo dei dati che lo identifica); la storia non ne scrive. */
const EVENTO_DELLO_STATO: Record<string, { tipo: string; campo: string } | undefined> = {
  domanda: { tipo: 'domanda-risposta', campo: 'domandaId' }, cruciverba: { tipo: 'cruciverba', campo: 'data' },
  articolo: { tipo: 'acquisto', campo: 'articolo' }, richiesta: { tipo: 'richiesta-completata', campo: 'richiesta' },
};

/** Togliere la spunta: ogni effetto di stato che la spunta aveva segnato torna com'era; ciò che c'era già resta. */
export function annullaEffettiDiStato(p: number, voceUid: string): void {
  const righe = prepared('SELECT effetto_uid, tipo, chiave, prima_json FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ?').all(p, voceUid) as Array<{ effetto_uid: string; tipo: string; chiave: string; prima_json: string }>;
  for (const r of righe) {
    const prima = JSON.parse(r.prima_json) as StatoPrima;
    // Lo stato lo rivendicano tutte le voci spuntate con lo stesso effetto (le righe esistono solo per le spunte attive): si revoca solo
    // se nessun'altra lo rivendica. Se un'altra lo rivendica, il «prima» originale (non ancora segnato) passa a lei, così lo revoca
    // l'ultima voce che toglie la spunta.
    const altre = prepared('SELECT voce_uid, effetto_uid FROM utente.effetto_stato_voce WHERE partita_id = ? AND tipo = ? AND chiave = ? AND NOT (voce_uid = ? AND effetto_uid = ?)').all(p, r.tipo, r.chiave, voceUid, r.effetto_uid) as Array<{ voce_uid: string; effetto_uid: string }>;
    if (altre.length > 0) {
      if (!prima.gia) {
        for (const o of altre) prepared('UPDATE utente.effetto_stato_voce SET prima_json = ? WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(r.prima_json, p, o.voce_uid, o.effetto_uid);
        // anche l'evento che questa voce aveva scritto segnando lo stato passa a chi lo tiene ancora: resta nello storico (e nella
        // provenienza) finché lo stato c'è, e lo revoca l'ultima voce che toglie la spunta
        const erede = prepared('SELECT voce_uid FROM utente.effetto_stato_voce WHERE partita_id = ? AND tipo = ? AND chiave = ? AND NOT (voce_uid = ? AND effetto_uid = ?) ORDER BY applicato_il, voce_uid LIMIT 1').get(p, r.tipo, r.chiave, voceUid, r.effetto_uid) as { voce_uid: string } | undefined;
        const evento = EVENTO_DELLO_STATO[r.tipo];
        if (erede && evento) prepared(`UPDATE utente.evento_partita SET voce_uid = ? WHERE partita_id = ? AND voce_uid = ? AND tipo = ? AND json_extract(dati_json, '$.${evento.campo}') = ?`)
          .run(erede.voce_uid, p, voceUid, evento.tipo, r.tipo === 'domanda' ? Number(r.chiave) : r.chiave);
      }
    } else if (!prima.gia) {
      const e: EffettoDiStatoVoce = r.tipo === 'storia' ? { tipo: 'storia', evento: r.chiave } : r.tipo === 'domanda' ? { tipo: 'domanda', domanda: Number(r.chiave) }
        : r.tipo === 'cruciverba' ? { tipo: 'cruciverba', data: r.chiave } : r.tipo === 'articolo' ? { tipo: 'articolo', articolo: r.chiave } : { tipo: 'richiesta', richiesta: r.chiave };
      // l'oggetto potrebbe non esserci più (guida cambiata): non si ferma l'annullo della spunta
      try { scrivi(p, e, false, prima.stato ?? null); } catch (err) { if (!(err instanceof Error) || !/non-trovat|non esiste|Nessun/i.test(`${(err as { code?: string }).code ?? ''} ${err.message}`)) throw err; }
    }
    prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, r.effetto_uid);
  }
}
