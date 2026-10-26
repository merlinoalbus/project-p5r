// ============================================================
// effettiDiStatoService — gli effetti «segna lo stato» delle voci del Diario (R10-01, R10-03, R10-09)
// ============================================================
//
// Quattro tipi di effetto che citano il loro oggetto per chiave: `storia` (un evento di storia, per esempio la mansarda pulita),
// `domanda` (una domanda in classe o un esame), `cruciverba` (un cruciverba risolto), `richiesta` (una Richiesta completata),
// `articolo` (un articolo di un negozio comprato, tranne l'Aojiru; L13, decisione 18: il prezzo lo scala da solo `motoreDiario.yenDellEffetto`,
// solo se l'acquisto è stato davvero segnato qui). La spunta li segna con gli
// STESSI setter delle pagine (`impostaEventoStoria`, `impostaDomandaFatta`, `impostaCruciverba`, `impostaStatoRichiesta`,
// `impostaAcquisto`: una sola regola per azione); togliere la spunta riporta lo stato com'era PRIMA, anche dopo un
// ricaricamento (il «prima» sta in `utente.effetto_stato_voce`, non nella pagina). Ciò che c'era già non si disfa: se l'evento era
// già segnato a mano, togliere la spunta lo lascia segnato. Nessuna Dote cambia da qui (D6): la Conoscenza di una domanda o di un
// cruciverba resta da applicare dal pulsante sulla voce.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { EVENTI_PESCA } from '../../shared/pesca.js';
import { chiaveSblocco, type EffettoDiStatoVoce } from '../../shared/effettiVoce.js';
import { impostaTrofeo } from './completamentoService.js';
import { impostaEventoStoria } from './semaforiService.js';
import { impostaDomandaFatta } from './domandeService.js';
import { impostaCruciverba } from './cruciverbaService.js';
import { impostaStatoRichiesta } from './richiesteService.js';
import { impostaAcquisto } from './negoziService.js';
import { eOffertaAojiru } from '../../shared/acquisti.js';
import { annullaInvito, registraInvito } from './inviti.js';
import { registraPersona } from './partiteService.js';
import { assicuraNonDelGruppo } from './personeDelGruppo.js';

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
  if (e.tipo === 'persona') {
    if (!prepared('SELECT 1 FROM persona WHERE id = ?').get(e.persona)) throw httpErrors.notFound('persona-non-trovata', `La Persona ${e.persona} non esiste.`);
    assicuraNonDelGruppo(e.persona);
  }
  if (e.tipo === 'invito' && !prepared('SELECT 1 FROM confidente_invito WHERE chiave = ?').get(e.invito)) throw httpErrors.notFound('invito-non-trovato', `L'invito '${e.invito}' non esiste.`);
  if (e.tipo === 'richiesta' && !prepared('SELECT 1 FROM richiesta WHERE chiave = ?').get(e.richiesta)) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${e.richiesta}' non esiste.`);
  if (e.tipo === 'oggetto' && !prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(e.oggetto)) throw httpErrors.notFound('oggetto-non-trovato', `L'oggetto '${e.oggetto}' non è nel catalogo.`);
  if (e.tipo === 'trofeo' && !prepared('SELECT 1 FROM trofeo WHERE chiave = ?').get(e.trofeo)) throw httpErrors.notFound('trofeo-non-trovato', `Il trofeo '${e.trofeo}' non esiste.`);
  if (e.tipo === 'sblocco' && !prepared(`SELECT 1 FROM ${e.bersaglio === 'richiesta' ? 'richiesta' : 'attivita'} WHERE chiave = ?`).get(e.chiave)) throw httpErrors.notFound('sblocco-bersaglio-non-trovato', `${e.bersaglio === 'richiesta' ? 'La Richiesta' : 'L’attività'} '${e.chiave}' non esiste.`);
}

const chiaveDi = (e: EffettoDiStatoVoce): string => e.tipo === 'storia' ? e.evento : e.tipo === 'domanda' ? String(e.domanda) : e.tipo === 'cruciverba' ? e.data : e.tipo === 'articolo' ? e.articolo : e.tipo === 'invito' ? e.invito : e.tipo === 'persona' ? String(e.persona)
  : e.tipo === 'oggetto' ? e.oggetto : e.tipo === 'trofeo' ? e.trofeo : e.tipo === 'sblocco' ? chiaveSblocco(e.bersaglio, e.chiave) : e.richiesta;

/** L13: l'oggetto ricevuto non è uno stato sì/no ma un registro che somma: la riga è della voce e dell'effetto, e se ne va con la loro spunta. */
function scriviOggetto(p: number, voceUid: string, effettoUid: string, e: Extract<EffettoDiStatoVoce, { tipo: 'oggetto' }>): void {
  prepared('INSERT INTO utente.oggetto_ottenuto_partita (partita_id, voce_uid, effetto_uid, catalogo_chiave, quantita, creato_il) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(partita_id, voce_uid, effetto_uid) DO UPDATE SET catalogo_chiave = excluded.catalogo_chiave, quantita = excluded.quantita')
    .run(p, voceUid, effettoUid, e.oggetto, e.quantita, new Date().toISOString());
}

function leggiPrima(p: number, e: EffettoDiStatoVoce): StatoPrima {
  if (e.tipo === 'oggetto') return { gia: false };
  if (e.tipo === 'trofeo') return { gia: !!prepared('SELECT 1 FROM trofeo_partita WHERE partita_id = ? AND trofeo_chiave = ?').get(p, e.trofeo) };
  if (e.tipo === 'sblocco') return { gia: !!prepared('SELECT 1 FROM utente.sblocco_partita WHERE partita_id = ? AND bersaglio_tipo = ? AND bersaglio_chiave = ?').get(p, e.bersaglio, e.chiave) };
  // la Persona: «già» = registrata nel compendio; `stato` = 'riga' se c'era una riga di compendio non registrata (bonus, skill: si conserva), altrimenti null
  if (e.tipo === 'persona') {
    const r = prepared('SELECT registrata FROM compendio_partita WHERE partita_id = ? AND persona_id = ?').get(p, e.persona) as { registrata: number } | undefined;
    return { gia: r?.registrata === 1, stato: r ? 'riga' : null };
  }
  if (e.tipo === 'storia') return { gia: (prepared('SELECT avvenuto FROM evento_storia_partita WHERE partita_id = ? AND evento_chiave = ?').get(p, e.evento) as { avvenuto: number } | undefined)?.avvenuto === 1 };
  if (e.tipo === 'domanda') return { gia: !!prepared('SELECT 1 FROM domanda_partita WHERE partita_id = ? AND domanda_id = ?').get(p, e.domanda) };
  if (e.tipo === 'cruciverba') return { gia: !!prepared('SELECT 1 FROM cruciverba_partita WHERE partita_id = ? AND data = ?').get(p, e.data) };
  if (e.tipo === 'invito') return { gia: !!prepared('SELECT 1 FROM invito_partita WHERE partita_id = ? AND invito_chiave = ?').get(p, e.invito) };
  if (e.tipo === 'articolo') return { gia: !!prepared('SELECT 1 FROM acquisto_partita WHERE partita_id = ? AND articolo_chiave = ?').get(p, e.articolo) };
  const stato = (prepared('SELECT stato FROM richiesta_partita WHERE partita_id = ? AND richiesta_chiave = ?').get(p, e.richiesta) as { stato: string } | undefined)?.stato ?? null;
  return { gia: stato === 'completata', stato };
}

/** Segna (nel verso `segna`) lo stato dell'effetto, o lo riporta com'era (`stato` della Richiesta). */
function scrivi(p: number, e: EffettoDiStatoVoce, segna: boolean, statoRichiesta: string | null = null, voceUid: string | null = null): void {
  // l'invito: la stessa regola del gesto diretto («Invito avvenuto»): solo con le condizioni vere (409 `invito-non-possibile`), una volta sola; si toglie solo se l'ha scritto la voce
  if (e.tipo === 'invito') { if (segna) registraInvito(p, e.invito, voceUid); else annullaInvito(p, e.invito, voceUid); }
  else if (e.tipo === 'trofeo') impostaTrofeo(p, e.trofeo, segna);
  else if (e.tipo === 'sblocco') {
    if (segna) prepared('INSERT OR IGNORE INTO utente.sblocco_partita (partita_id, bersaglio_tipo, bersaglio_chiave, voce_uid, creato_il) VALUES (?, ?, ?, ?, ?)').run(p, e.bersaglio, e.chiave, voceUid, new Date().toISOString());
    else prepared('DELETE FROM utente.sblocco_partita WHERE partita_id = ? AND bersaglio_tipo = ? AND bersaglio_chiave = ?').run(p, e.bersaglio, e.chiave);
  }
  else if (e.tipo === 'oggetto') throw new Error('L’oggetto ricevuto non è uno stato sì/no: si scrive con scriviOggetto.');
  // la Persona: la stessa registrazione del compendio (`registraPersona`, l'unica scrittura); togliendo la spunta, la riga nata dalla spunta si toglie,
  // una che c'era già (non registrata) torna non registrata senza perdere ciò che portava
  else if (e.tipo === 'persona') {
    if (segna) registraPersona(p, e.persona);
    else if (statoRichiesta === 'riga') prepared('UPDATE compendio_partita SET registrata = 0 WHERE partita_id = ? AND persona_id = ?').run(p, e.persona);
    else {
      // la riga è nata dalla spunta: si toglie solo se è ancora com'era alla nascita (niente livello, bonus, skill, tratto, carica o valori osservati
      // scritti dopo); se qualcuno l'ha modificata dopo, resta com'è e torna solo «non registrata» (N-c: mai perdere ciò che è stato aggiunto)
      const intatta = !!prepared(`SELECT 1 FROM compendio_partita WHERE partita_id = ? AND persona_id = ? AND livello_registrato IS NULL
        AND bonus_forza = 0 AND bonus_magia = 0 AND bonus_resistenza = 0 AND bonus_agilita = 0 AND bonus_fortuna = 0 AND skill_ids_json IS NULL AND tratto_skill_id IS NULL AND carica = 0
        AND osservate_livello IS NULL AND osservate_forza IS NULL AND osservate_magia IS NULL AND osservate_resistenza IS NULL AND osservate_agilita IS NULL AND osservate_fortuna IS NULL`).get(p, e.persona);
      if (intatta) prepared('DELETE FROM compendio_partita WHERE partita_id = ? AND persona_id = ?').run(p, e.persona);
      else prepared('UPDATE compendio_partita SET registrata = 0 WHERE partita_id = ? AND persona_id = ?').run(p, e.persona);
    }
  }
  else if (e.tipo === 'storia') impostaEventoStoria(p, e.evento, segna);
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
    if (e.tipo === 'oggetto') { scriviOggetto(p, voceUid, uid, e); continue; }
    if (prima.gia) continue;
    try { scrivi(p, e, true, null, voceUid); }
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
  trofeo: { tipo: 'trofeo', campo: 'trofeo' },
};

/** L'effetto di stato (non l'oggetto ricevuto, che ha la sua riga) ricostruito dal tipo e dalla chiave con cui la spunta l'ha ricordato. */
function effettoDallaRiga(tipo: string, chiave: string): Exclude<EffettoDiStatoVoce, { tipo: 'oggetto' }> {
  return tipo === 'storia' ? { tipo: 'storia', evento: chiave } : tipo === 'domanda' ? { tipo: 'domanda', domanda: Number(chiave) }
    : tipo === 'cruciverba' ? { tipo: 'cruciverba', data: chiave } : tipo === 'articolo' ? { tipo: 'articolo', articolo: chiave } : tipo === 'invito' ? { tipo: 'invito', invito: chiave } : tipo === 'persona' ? { tipo: 'persona', persona: Number(chiave) }
      : tipo === 'trofeo' ? { tipo: 'trofeo', trofeo: chiave }
      : tipo === 'sblocco' ? { tipo: 'sblocco', bersaglio: chiave.startsWith('richiesta:') ? 'richiesta' : 'attivita', chiave: chiave.slice(chiave.indexOf(':') + 1) }
      : { tipo: 'richiesta', richiesta: chiave };
}

/**
 * 2026-10-26 (le ricevute della spunta, `applicatoDallaSpunta.ts`): gli effetti di stato che la spunta della voce ha davvero segnato e che
 * togliere la spunta riporta com'erano. Non quelli che c'erano già (`prima.gia`: la spunta non li ha toccati e togliendola restano); l'oggetto
 * ricevuto sempre, con la quantità della sua riga (è della voce e dell'effetto). `quantita` dell'articolo dalla lista attuale della voce
 * (`quantitaArticolo`): la riga ricorda solo l'articolo. Sola lettura.
 */
export function effettiDiStatoApplicati(p: number, voceUid: string, quantitaArticolo: (effettoUid: string) => number | undefined): Array<{ effettoUid: string; effetto: EffettoDiStatoVoce; applicatoIl: string }> {
  const righe = prepared('SELECT effetto_uid, tipo, chiave, prima_json, applicato_il FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? ORDER BY applicato_il, rowid').all(p, voceUid) as Array<{ effetto_uid: string; tipo: string; chiave: string; prima_json: string; applicato_il: string }>;
  return righe.flatMap((r): Array<{ effettoUid: string; effetto: EffettoDiStatoVoce; applicatoIl: string }> => {
    if (r.tipo === 'oggetto') {
      const o = prepared('SELECT catalogo_chiave, quantita FROM utente.oggetto_ottenuto_partita WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').get(p, voceUid, r.effetto_uid) as { catalogo_chiave: string; quantita: number } | undefined;
      return o ? [{ effettoUid: r.effetto_uid, effetto: { tipo: 'oggetto' as const, oggetto: o.catalogo_chiave, quantita: o.quantita }, applicatoIl: r.applicato_il }] : [];
    }
    let prima: StatoPrima;
    try { prima = JSON.parse(r.prima_json) as StatoPrima; } catch { return []; }
    if (prima.gia) return [];
    const e = effettoDallaRiga(r.tipo, r.chiave);
    const q = e.tipo === 'articolo' ? quantitaArticolo(r.effetto_uid) : undefined;
    return [{ effettoUid: r.effetto_uid, effetto: e.tipo === 'articolo' && q && q > 1 ? { ...e, quantita: q } : e, applicatoIl: r.applicato_il }];
  });
}

/** Togliere la spunta: ogni effetto di stato che la spunta aveva segnato torna com'era; ciò che c'era già resta. */
export function annullaEffettiDiStato(p: number, voceUid: string): void {
  const righe = prepared('SELECT effetto_uid, tipo, chiave, prima_json FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ?').all(p, voceUid) as Array<{ effetto_uid: string; tipo: string; chiave: string; prima_json: string }>;
  for (const r of righe) {
    // L13: l'oggetto ricevuto è della voce e dell'effetto, non uno stato condiviso: si toglie la sua riga e basta (le altre voci tengono le loro)
    if (r.tipo === 'oggetto') {
      prepared('DELETE FROM utente.oggetto_ottenuto_partita WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, r.effetto_uid);
      prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, r.effetto_uid);
      continue;
    }
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
        // l'invito lo tiene la riga `invito_partita`: la voce che lo ha scritto passa il legame, perché lo possa togliere l'ultima
        if (erede && r.tipo === 'invito') prepared('UPDATE utente.invito_partita SET voce_uid = ? WHERE partita_id = ? AND invito_chiave = ? AND voce_uid = ?').run(erede.voce_uid, p, r.chiave, voceUid);
        if (erede && r.tipo === 'sblocco') prepared("UPDATE utente.sblocco_partita SET voce_uid = ? WHERE partita_id = ? AND bersaglio_tipo || ':' || bersaglio_chiave = ? AND voce_uid = ?").run(erede.voce_uid, p, r.chiave, voceUid);
        const evento = EVENTO_DELLO_STATO[r.tipo];
        if (erede && evento) prepared(`UPDATE utente.evento_partita SET voce_uid = ? WHERE partita_id = ? AND voce_uid = ? AND tipo = ? AND json_extract(dati_json, '$.${evento.campo}') = ?`)
          .run(erede.voce_uid, p, voceUid, evento.tipo, r.tipo === 'domanda' ? Number(r.chiave) : r.chiave);
      }
    } else if (!prima.gia) {
      const e = effettoDallaRiga(r.tipo, r.chiave);
      // l'oggetto potrebbe non esserci più (guida cambiata): non si ferma l'annullo della spunta
      try { scrivi(p, e, false, prima.stato ?? null, voceUid); } catch (err) { if (!(err instanceof Error) || !/non-trovat|non esiste|Nessun/i.test(`${(err as { code?: string }).code ?? ''} ${err.message}`)) throw err; }
    }
    prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, r.effetto_uid);
  }
}
