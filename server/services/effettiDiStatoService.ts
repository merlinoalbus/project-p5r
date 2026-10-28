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
//
// L13 (decisione 19): la stessa scrittura vale anche fuori dalla spunta, effetto per effetto (`applicaUnEffettoDiStato`, `annullaEffettoDiStato`):
// salvando nella guida un effetto di stato su una voce già spuntata (`motoreDiario.riallineaStatiDellaVoce`) e approvando l'elenco del passato
// della partita (`motoreDiario.applicaStatoDelPassato`). Solo lì l'articolo si segna senza il controllo della disponibilità di adesso
// (`senzaDisponibilita`): la voce spuntata attesta l'acquisto nel suo giorno.
//
// 2026-10-26 (richiesta dell'utente: «se seleziono l'effetto Persona Registrata mi aspetto che sul Compendio risulti flaggata la persona
// selezionata. Devo poter scegliere se l'effetto si fermi solo al Compendio o se quella persona viene anche aggiunta alla scorta»): la Persona
// con `scorta` ha una seconda parte, l'esemplare in scorta, che è uno stato a sé (riga `<uid>:scorta`, tipo `persona-scorta`, chiave = id della
// Persona): si aggiunge con `aggiungiPosseduta` (l'unica scrittura della scorta) dopo il compendio, e si toglie solo se è ancora com'era alla
// nascita (`decidiAnnullo`, l'unica regola dell'annullo). La scorta piena non ferma niente (la capienza è solo informativa): la Persona entra
// e l'avviso lo dice, «oltre la capienza n/N» (decisione del PM per l'utente). Le due parti passano per le stesse vie degli altri stati: la
// spunta, il salvataggio della guida su una voce già spuntata e l'elenco del passato della decisione 19.
//
// 2026-10-28 (richiesta dell'utente: «manca la rimozione di una persona dalla scorta come possibile effetto. e la gestione di aggiunta punti
// rango del confidente (sempre come effetto) così da poterlo combinare ad altri effetti se necessario. altra cosa non gestita la restituzione di
// un oggetto in prestito... Libro o DVD … non c'è un vendi prodotto/restituisci prodotto per gestire vendita, restituzione»), tre effetti nuovi
// per le stesse vie (spunta, decisione 19, elenco del passato, ricevute «Applicato dalla spunta»):
//   - `personaTolta`: uno stato sì/no («la Persona non è nella scorta»). La spunta toglie l'esemplare ricordandolo per intero nel «prima»
//     (la riga e le skill); togliendo la spunta torna com'era, solo se nel frattempo la Persona non è rientrata nella scorta (allora resta quella);
//   - `puntiConfidente`: una riga che somma, nel registro cronologico dei punti (`puntiCronologici`, lo stesso delle note delle risposte, con
//     l'effetto che la porta): contano dove il rango sale a punti; togliendo la spunta, o l'effetto, se ne vanno e il Confidente si ricalcola;
//   - `uscitaOggetto`: una riga che somma, nel registro unico delle uscite (`consumo_oggetto_partita`, utente 055), mai oltre le copie possedute;
//     gli yen di una vendita li muove `motoreDiario.yenDellEffetto` (decisione 18), solo se l'uscita è stata scritta.
// ============================================================

import { nowIso, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { EVENTI_PESCA } from '../../shared/pesca.js';
import { chiaveSblocco, type EffettoDiStatoVoce, type EffettoVoce } from '../../shared/effettiVoce.js';
import { dettaglioCopie } from './copieOggetti.js';
import { scriviUscitaDaVoce, togliUscitaDaVoce, uscitaDellaVoce } from './consumiOggettiService.js';
import { applicaEventoDiario, puntiDellEffettoInVigore, togliPuntiDellEffetto } from './puntiCronologici.js';
import { confidente as confidenteDellaPartita, sogliaAPunti } from './partiteService.js';
import { registraEvento } from './storicoService.js';
import { impostaTrofeo } from './completamentoService.js';
import { impostaEventoStoria } from './semaforiService.js';
import { impostaDomandaFatta } from './domandeService.js';
import { impostaCruciverba } from './cruciverbaService.js';
import { impostaStatoRichiesta } from './richiesteService.js';
import { impostaAcquisto, registraCopiaDaVoce, togliCopiaDaVoce } from './negoziService.js';
import { eOffertaAojiru } from '../../shared/acquisti.js';
import { annullaInvito, registraInvito } from './inviti.js';
import { aggiungiPosseduta, registraPersona } from './partiteService.js';
import { assicuraNonDelGruppo } from './personeDelGruppo.js';
import { capienzaScorta } from './capienzaScortaService.js';
import { cediTrofeoAUnTurno } from './trofeiDegliEsitiService.js';
import { t } from './traduzioniService.js';
import type { StatoDisponibilita } from './disponibilitaService.js';

type StatoPrima = { gia: boolean; stato?: string | null };
type EffettoPersona = Extract<EffettoDiStatoVoce, { tipo: 'persona' }>;

/** Il tipo della riga di `utente.effetto_stato_voce` che ricorda l'esemplare che la voce ha aggiunto alla scorta (chiave = id della Persona). */
export const TIPO_SCORTA = 'persona-scorta';
const uidScorta = (uid: string): string => `${uid}:scorta`;
const conScorta = (e: EffettoVoce | EffettoDiStatoVoce): e is EffettoPersona & { scorta: true } => e.tipo === 'persona' && e.scorta === true;
/**
 * Il «prima» della scorta: `gia` = la Persona era già in scorta (la voce non ha toccato niente); altrimenti l'esemplare nato dalla voce,
 * com'era alla nascita (livello e skill), e l'obiettivo che la sua aggiunta ha chiuso, per riaprirlo togliendo la spunta.
 */
type PrimaScorta = { gia: boolean; possedutaId?: number; livello?: number; skillIds?: number[]; obiettivo?: { id: number; raggiuntoAt: string } };

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
    const p = prepared('SELECT rara, livello FROM persona WHERE id = ?').get(e.persona) as { rara: number; livello: number } | undefined;
    if (!p) throw httpErrors.notFound('persona-non-trovata', `La Persona ${e.persona} non esiste.`);
    assicuraNonDelGruppo(e.persona);
    // come la scelta della scorta (`ScortaPersona`): un Demone del Tesoro non si aggiunge alla scorta da qui
    if (e.scorta && p.rara === 1) throw httpErrors.badRequest('persona-rara-scorta', 'Un Demone del Tesoro non si aggiunge alla scorta da una voce: scegli «Solo nel Compendio».');
    // la stessa regola del campo dell'editor (`min` = livello base): una Persona non entra in scorta sotto il suo livello base
    if (e.livello !== undefined && e.livello < p.livello) throw httpErrors.badRequest('livello-sotto-base', `Il livello in scorta non può essere sotto il livello base della Persona (${p.livello}).`);
  }
  if (e.tipo === 'invito' && !prepared('SELECT 1 FROM confidente_invito WHERE chiave = ?').get(e.invito)) throw httpErrors.notFound('invito-non-trovato', `L'invito '${e.invito}' non esiste.`);
  if (e.tipo === 'richiesta' && !prepared('SELECT 1 FROM richiesta WHERE chiave = ?').get(e.richiesta)) throw httpErrors.notFound('richiesta-non-trovata', `La Richiesta '${e.richiesta}' non esiste.`);
  if (e.tipo === 'oggetto' && !prepared('SELECT 1 FROM catalogo_oggetto WHERE chiave = ?').get(e.oggetto)) throw httpErrors.notFound('oggetto-non-trovato', `L'oggetto '${e.oggetto}' non è nel catalogo.`);
  if (e.tipo === 'trofeo' && !prepared('SELECT 1 FROM trofeo WHERE chiave = ?').get(e.trofeo)) throw httpErrors.notFound('trofeo-non-trovato', `Il trofeo '${e.trofeo}' non esiste.`);
  if (e.tipo === 'sblocco' && !prepared(`SELECT 1 FROM ${e.bersaglio === 'richiesta' ? 'richiesta' : 'attivita'} WHERE chiave = ?`).get(e.chiave)) throw httpErrors.notFound('sblocco-bersaglio-non-trovato', `${e.bersaglio === 'richiesta' ? 'La Richiesta' : 'L’attività'} '${e.chiave}' non esiste.`);
  if (e.tipo === 'personaTolta') {
    if (!prepared('SELECT 1 FROM persona WHERE id = ?').get(e.persona)) throw httpErrors.notFound('persona-non-trovata', `La Persona ${e.persona} non esiste.`);
    // le Persone del gruppo non stanno nella scorta: non c'è niente da togliere (la stessa regola della scelta della scorta)
    assicuraNonDelGruppo(e.persona);
  }
  if (e.tipo === 'puntiConfidente' && !prepared('SELECT 1 FROM confidente WHERE chiave = ?').get(e.confidente)) throw httpErrors.notFound('confidente-non-trovato', `Il Confidente '${e.confidente}' non esiste.`);
  if (e.tipo === 'uscitaOggetto') {
    const o = prepared('SELECT nome FROM catalogo_oggetto WHERE chiave = ?').get(e.oggetto) as { nome: string } | undefined;
    if (!o) throw httpErrors.notFound('oggetto-non-trovato', `L'oggetto '${e.oggetto}' non è nel catalogo.`);
    // si restituisce un prestito: un oggetto che un'offerta dà con la regola «restituzione» (il libro della Biblioteca, il DVD a noleggio)
    if (e.modo === 'restituito' && !inPrestito(e.oggetto)) throw httpErrors.badRequest('oggetto-non-in-prestito', `«${o.nome}» non si prende in prestito (libro della Biblioteca, DVD a noleggio): scegli «Venduto».`);
  }
}

/** L'oggetto del catalogo si prende in prestito: un'offerta lo dà con la regola di rifornimento «restituzione» (Biblioteca, noleggio dei DVD). */
export const inPrestito = (catalogo: string): boolean => !!prepared(`SELECT 1 FROM articolo WHERE catalogo_chiave = ? AND json_valid(rifornimento_json)
  AND json_extract(rifornimento_json, '$.tipo') = 'restituzione' LIMIT 1`).get(catalogo);

const chiaveDi = (e: EffettoDiStatoVoce): string => e.tipo === 'storia' ? e.evento : e.tipo === 'domanda' ? String(e.domanda) : e.tipo === 'cruciverba' ? e.data : e.tipo === 'articolo' ? e.articolo : e.tipo === 'invito' ? e.invito : e.tipo === 'persona' ? String(e.persona)
  : e.tipo === 'oggetto' ? e.oggetto : e.tipo === 'trofeo' ? e.trofeo : e.tipo === 'sblocco' ? chiaveSblocco(e.bersaglio, e.chiave)
    : e.tipo === 'personaTolta' ? String(e.persona) : e.tipo === 'puntiConfidente' ? e.confidente : e.tipo === 'uscitaOggetto' ? e.oggetto : e.richiesta;

/** L13: l'oggetto ricevuto non è uno stato sì/no ma un registro che somma: la riga è della voce e dell'effetto, e se ne va con la loro spunta. */
function scriviOggetto(p: number, voceUid: string, effettoUid: string, e: Extract<EffettoDiStatoVoce, { tipo: 'oggetto' }>): void {
  prepared('INSERT INTO utente.oggetto_ottenuto_partita (partita_id, voce_uid, effetto_uid, catalogo_chiave, quantita, creato_il) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(partita_id, voce_uid, effetto_uid) DO UPDATE SET catalogo_chiave = excluded.catalogo_chiave, quantita = excluded.quantita')
    .run(p, voceUid, effettoUid, e.oggetto, e.quantita, new Date().toISOString());
}

function leggiPrima(p: number, e: EffettoDiStatoVoce): StatoPrima {
  if (e.tipo === 'oggetto' || e.tipo === 'puntiConfidente' || e.tipo === 'uscitaOggetto') return { gia: false };
  // la Persona tolta: lo stato «vero» è che non sia nella scorta
  if (e.tipo === 'personaTolta') return { gia: !inScorta(p, e.persona) };
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

/** Segna (nel verso `segna`) lo stato dell'effetto, o lo riporta com'era (`stato` della Richiesta). `opz` vale solo per l'articolo: lo stato
 *  in cui valutarne la disponibilità (`st`) o nessun controllo (`senzaDisponibilita`), vedi `OpzioniStato`. Ondata 5: con la voce e l'effetto
 *  (`effettoUid`) l'acquisto entra nel registro come copia di quella voce, e togliendolo se ne va solo quella riga. */
function scrivi(p: number, e: EffettoDiStatoVoce, segna: boolean, statoRichiesta: string | null = null, voceUid: string | null = null, opz: OpzioniStato = {}, effettoUid: string | null = null): void {
  // l'invito: la stessa regola del gesto diretto («Invito avvenuto»): solo con le condizioni vere (409 `invito-non-possibile`), una volta sola; si toglie solo se l'ha scritto la voce
  if (e.tipo === 'invito') { if (segna) registraInvito(p, e.invito, voceUid); else annullaInvito(p, e.invito, voceUid); }
  else if (e.tipo === 'trofeo') impostaTrofeo(p, e.trofeo, segna);
  else if (e.tipo === 'sblocco') {
    if (segna) prepared('INSERT OR IGNORE INTO utente.sblocco_partita (partita_id, bersaglio_tipo, bersaglio_chiave, voce_uid, creato_il) VALUES (?, ?, ?, ?, ?)').run(p, e.bersaglio, e.chiave, voceUid, new Date().toISOString());
    else prepared('DELETE FROM utente.sblocco_partita WHERE partita_id = ? AND bersaglio_tipo = ? AND bersaglio_chiave = ?').run(p, e.bersaglio, e.chiave);
  }
  else if (e.tipo === 'oggetto') throw new Error('L’oggetto ricevuto non è uno stato sì/no: si scrive con scriviOggetto.');
  else if (e.tipo === 'puntiConfidente' || e.tipo === 'uscitaOggetto') throw new Error('Punti e uscite della voce sono righe che sommano: si scrivono con applicaPunti e applicaUscita.');
  else if (e.tipo === 'personaTolta') throw new Error('La Persona tolta si toglie con togliDallaScorta e torna con rimettiInScorta.');
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
  else if (e.tipo === 'articolo') impostaAcquisto(p, e.articolo, segna, undefined, { ...(opz.st ? { st: opz.st } : {}), ...(opz.senzaDisponibilita ? { senzaDisponibilita: true } : {}),
    ...(voceUid && effettoUid ? { voce: { voceUid, effettoUid, ...(e.quantita ? { quantita: e.quantita } : {}) } } : {}) });
  else impostaStatoRichiesta(p, e.richiesta, segna ? 'completata' : (statoRichiesta as 'completata' | null));
}

/**
 * Come si valuta la disponibilità di un effetto «articolo» (gli altri effetti di stato le ignorano):
 *   - `st` e `scelto` (L13, decisione 4): l'articolo è il set scelto alla spunta fra quelli in alternativa, e `st` lo stato al giorno della voce
 *     in cui valutarlo (un set delle televendite si compra solo la sua domenica). Per lui un «non disponibile» non si ingoia: la scelta è già
 *     stata verificata, e se qui non vale la spunta si ferma invece di dire «comprato» senza segnarlo;
 *   - `senzaDisponibilita` (L13, decisione 19): solo per una voce GIÀ spuntata (salvataggio della guida, approvazione dell'elenco della partita),
 *     nessun controllo: la voce spuntata attesta l'acquisto nel suo giorno.
 * Senza opzioni: lo stato corrente della partita, e un articolo non disponibile resta da segnare dal negozio (la spunta prosegue).
 */
export interface OpzioniStato { st?: StatoDisponibilita; scelto?: boolean; senzaDisponibilita?: boolean }

const inScorta = (p: number, personaId: number): boolean => !!prepared('SELECT 1 FROM persona_posseduta WHERE partita_id = ? AND persona_id = ?').get(p, personaId);
const skillDellaPosseduta = (possedutaId: number): number[] =>
  (prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(possedutaId) as Array<{ skill_id: number }>).map((x) => x.skill_id);
const nomePersona = (personaId: number): string => {
  const r = prepared('SELECT nome FROM persona WHERE id = ?').get(personaId) as { nome: string } | undefined;
  return r ? t('persona', r.nome) : 'La Persona';
};

/**
 * L13 (decisione 19): lo stato è già vero nella partita (la stessa lettura del «prima» della spunta): l'elenco del passato non propone ciò che
 * c'è già. L'oggetto ricevuto non è uno stato sì/no: per lui vale solo la riga della voce (`effetto_stato_voce`). La Persona «anche nella
 * scorta» è vera solo con tutte e due le parti: registrata nel compendio e in scorta.
 */
export const statoGiaVero = (p: number, e: EffettoDiStatoVoce): boolean => leggiPrima(p, e).gia && (!conScorta(e) || inScorta(p, e.persona));

/** Le due parti della Persona nella partita (registrata nel compendio, presente in scorta): il motivo dell'elenco del passato dice quella che manca. */
export const partiDellaPersona = (p: number, e: EffettoPersona): { compendio: boolean; scorta: boolean } => ({ compendio: leggiPrima(p, e).gia, scorta: inScorta(p, e.persona) });

/** Il motivo dell'elenco del passato, a parole, attorno a che cosa manca nella partita (`statiMancantiService`). */
export const fraseMotivoDelPassato = (manca: string): string => `La spunta della voce non l’ha segnato, e ${manca} in questa partita.`;

// la Persona «Compendio e scorta»: la parte che manca, per ognuno dei tre casi possibili (con tutte e due le parti lo stato è già vero)
const MANCA_PERSONA_CON_SCORTA = {
  soloCompendio: 'la Persona è nel Compendio Personale ma non nella scorta',
  soloScorta: 'la Persona è nella scorta ma non è registrata nel Compendio Personale',
  nessuna: 'la Persona non è né nel Compendio Personale né nella scorta',
} as const;

/** La Persona «Compendio e scorta», a parole: esattamente la parte che manca adesso nella partita `p`. */
export function mancaPersonaConScorta(p: number, e: EffettoPersona): string {
  const { compendio, scorta } = partiDellaPersona(p, e);
  return compendio ? MANCA_PERSONA_CON_SCORTA.soloCompendio : scorta ? MANCA_PERSONA_CON_SCORTA.soloScorta : MANCA_PERSONA_CON_SCORTA.nessuna;
}

/**
 * Revisione della fusione (2026-10-26): il motivo della Persona «Compendio e scorta» scritto dal censimento dice la parte che mancava quando la
 * proposta è nata, e resta salvato; registrando poi la Persona nel Compendio, o mettendola nella scorta, quel testo non sarebbe più vero. In
 * lettura il motivo si riscrive con la parte che manca adesso, ma solo se `scritto` è uno dei tre motivi del censimento: un motivo diverso (la
 * spunta che non è riuscita ad applicarlo, `motoreDiario`, con la sua ragione) resta com'è. `null`: niente da riscrivere.
 */
export function motivoPersonaConScortaAdesso(p: number, e: EffettoDiStatoVoce, scritto: string): string | null {
  if (!conScorta(e)) return null;
  if (!Object.values(MANCA_PERSONA_CON_SCORTA).some((m) => fraseMotivoDelPassato(m) === scritto)) return null;
  return fraseMotivoDelPassato(mancaPersonaConScorta(p, e));
}

/**
 * La voce ha già segnato lo stato dell'effetto nella partita (le righe del «prima» che la spunta, il salvataggio o l'approvazione scrivono): la
 * riga dell'effetto e, per la Persona «anche nella scorta», anche quella della scorta. L'elenco del passato e la finestra della voce guardano
 * qui per sapere che cosa manca: un effetto passato a «Compendio e scorta» con il solo compendio segnato manca ancora della scorta.
 */
export function statoSegnatoDallaVoce(p: number, voceUid: string, effettoUid: string, e: EffettoVoce | null): boolean {
  const riga = (uid: string): boolean => !!prepared('SELECT 1 FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').get(p, voceUid, uid);
  return riga(effettoUid) && (!e || !conScorta(e) || riga(uidScorta(effettoUid)));
}

/** L'esito di un effetto di stato scritto da una voce: `segnato` (la voce lo tiene), `gia-presente` (c'era già, togliendo la spunta resta),
 *  `non-disponibile` (l'articolo resta da segnare dal negozio); `avvisi`: ciò che chi gioca deve sapere (la scorta oltre la capienza). */
export interface EsitoStato { esito: 'segnato' | 'gia-presente' | 'non-disponibile'; avvisi: string[] }

const SQL_RIGA_STATO = 'SELECT prima_json FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?';
const SQL_NUOVA_RIGA = 'INSERT INTO utente.effetto_stato_voce (partita_id, voce_uid, effetto_uid, tipo, chiave, prima_json, applicato_il) VALUES (?, ?, ?, ?, ?, ?, ?)';
/** Il «prima» di una riga, o null se non si legge (la riga resta com'è e decide la lettura di adesso). */
const primaDellaRiga = <T>(json: string): T | null => { try { return JSON.parse(json) as T; } catch { return null; } };

/** La prima parte di ogni effetto di stato: lo stato dell'effetto (per la Persona, il compendio), con gli avvisi per chi spunta. */
function applicaStato(p: number, voceUid: string, uid: string, e: EffettoDiStatoVoce, opz: OpzioniStato): EsitoStato {
  const ora = leggiPrima(p, e);
  // la riga c'è già (la voce tiene lo stato: un effetto corretto nella guida, decisione 19): il suo «prima» resta quello della prima volta, e
  // l'esito lo dice lui (lo stato è della voce, non «c'era già» per colpa della voce stessa)
  const vecchio = prepared(SQL_RIGA_STATO).get(p, voceUid, uid) as { prima_json: string } | undefined;
  if (!vecchio) prepared(SQL_NUOVA_RIGA).run(p, voceUid, uid, e.tipo, chiaveDi(e), JSON.stringify(ora), new Date().toISOString());
  const ricordato = vecchio ? primaDellaRiga<StatoPrima>(vecchio.prima_json) ?? ora : ora;
  const solo = (esito: EsitoStato['esito']): EsitoStato => ({ esito, avvisi: [] });
  if (e.tipo === 'oggetto') { scriviOggetto(p, voceUid, uid, e); return solo('segnato'); }
  if (e.tipo === 'puntiConfidente') return applicaPunti(p, voceUid, uid, e);
  if (e.tipo === 'uscitaOggetto') return applicaUscita(p, voceUid, uid, e, opz, !!vecchio);
  if (e.tipo === 'personaTolta') {
    // la voce tiene già lo stato (decisione 19): l'esemplare l'aveva tolto lei, o non c'era; non si tocca la scorta di adesso
    if (vecchio) return solo(ricordato.gia ? 'gia-presente' : 'segnato');
    if (ora.gia) return { esito: 'gia-presente', avvisi: [`${nomePersona(e.persona)} non è nella scorta: non c’è niente da togliere.`] };
    togliDallaScorta(p, voceUid, uid, e);
    return solo('segnato');
  }
  if (ora.gia) {
    // Ondata 5 (decisione 21): l'articolo già ottenuto comprato di nuovo da questa voce resta «ottenuto», e la copia entra nel registro
    if (e.tipo === 'articolo') registraCopiaDaVoce(p, e.articolo, { voceUid, effettoUid: uid, ...(e.quantita ? { quantita: e.quantita } : {}) });
    return solo(ricordato.gia ? 'gia-presente' : 'segnato');
  }
  try { scrivi(p, e, true, null, voceUid, opz, uid); }
  catch (err) {
    // un articolo non ancora disponibile nella partita non ferma la spunta della voce: resta da segnare dal negozio (non un set scelto)
    if (e.tipo === 'articolo' && !opz.scelto && (err as { code?: string }).code === 'articolo-non-disponibile') {
      if (!vecchio) prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, uid);
      return solo('non-disponibile');
    }
    throw err;
  }
  return solo('segnato');
}

type EffettoPuntiConfidente = Extract<EffettoDiStatoVoce, { tipo: 'puntiConfidente' }>;
type EffettoUscita = Extract<EffettoDiStatoVoce, { tipo: 'uscitaOggetto' }>;
type EffettoPersonaTolta = Extract<EffettoDiStatoVoce, { tipo: 'personaTolta' }>;

/** Giorno, fascia e posto della voce nella giornata (il momento dei suoi punti nel registro cronologico, il giorno della sua uscita). */
function momentoDellaVoce(voceUid: string): { data: string; fascia: string; ordine: number } {
  const v = prepared('SELECT data, fascia, ordine FROM main.voce_giornata WHERE uid = ?').get(voceUid) as { data: string; fascia: string; ordine: number } | undefined;
  if (!v) throw httpErrors.notFound('voce-non-trovata', 'La voce del Diario non è più presente.');
  return v;
}

/**
 * I punti a un Confidente: la versione di prima dello stesso effetto esce dal registro (decisione 19: cambiati i punti nella guida), poi i punti
 * entrano nel registro cronologico nel momento della voce, con la stessa aritmetica delle note (contano solo dove il rango sale a punti). Nessun
 * incontro si registra da qui: l'incontro, se c'è, è quello della voce. L'avviso dice quando adesso non contano.
 */
function applicaPunti(p: number, voceUid: string, uid: string, e: EffettoPuntiConfidente): EsitoStato {
  togliPuntiDellEffetto(p, voceUid, uid);
  const v = momentoDellaVoce(voceUid);
  const c = confidenteDellaPartita(p, e.confidente);
  applicaEventoDiario(p, e.confidente, { tipo: 'punti', voceUid, data: v.data, fascia: v.fascia, ordineVoce: v.ordine, parametri: { fissi: e.punti, effetto: uid } });
  const aPunti = c.rango > 0 && c.rango < 10 && sogliaAPunti(e.confidente, c.rango) > 0;
  return { esito: 'segnato', avvisi: aPunti ? [] : [`${c.nome}: ${c.rango === 0 ? 'non ancora incontrato' : c.rango === 10 ? 'al rango massimo' : `il rango ${c.rango} non sale a punti`}, i punti dell’effetto adesso non contano.`] };
}

/**
 * L'oggetto restituito o venduto: escono le copie dell'effetto, mai più di quelle che la partita possiede (comprate, ricevute, nei set, meno
 * regalate, cedute e usate: `dettaglioCopie`, la stessa lettura della scelta dell'esito e di «Regala»), contando come sue quelle che la stessa
 * riga aveva già fatto uscire. Senza copie abbastanza: alla spunta non esce niente e l'avviso lo dice (la spunta non si ferma); su una voce già
 * spuntata (`senzaDisponibilita`: salvataggio della guida, elenco del passato) il rifiuto sale, e l'effetto resta da approvare con il motivo.
 */
function applicaUscita(p: number, voceUid: string, uid: string, e: EffettoUscita, opz: OpzioniStato, vecchio: boolean): EsitoStato {
  const mia = uscitaDellaVoce(p, voceUid, uid);
  const possedute = dettaglioCopie(p, e.oggetto).disponibili + (mia && mia.catalogo === e.oggetto ? mia.quantita : 0);
  if (possedute < e.quantita) {
    const nome = (prepared('SELECT nome FROM catalogo_oggetto WHERE chiave = ?').pluck().get(e.oggetto) as string | undefined) ?? 'L’oggetto';
    const motivo = possedute === 0 ? `«${nome}» non è fra le copie della partita: non esce niente.`
      : `Nella partita ${possedute === 1 ? 'c’è 1 copia' : `ci sono ${possedute} copie`} di «${nome}», meno delle ${e.quantita} indicate: non esce niente.`;
    if (opz.senzaDisponibilita) throw httpErrors.conflict('copie-insufficienti', motivo);
    if (mia) togliUscitaDaVoce(p, voceUid, uid);
    if (!vecchio) prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, uid);
    return { esito: 'non-disponibile', avvisi: [motivo] };
  }
  scriviUscitaDaVoce(p, voceUid, uid, { catalogo: e.oggetto, quantita: e.quantita, modo: e.modo, ...(e.prezzo ? { prezzo: e.prezzo } : {}), giorno: momentoDellaVoce(voceUid).data });
  return { esito: 'segnato', avvisi: [] };
}

/** Il «prima» della Persona tolta: `gia` = non era nella scorta (niente tolto); altrimenti l'esemplare com'era (la riga e le skill), per rimetterlo. */
type PrimaTolta = { gia: boolean; riga?: Record<string, unknown>; skill?: number[] };

/** Toglie dalla scorta l'esemplare della Persona, ricordandolo per intero nel «prima» della riga dell'effetto, con l'evento nello storico. */
function togliDallaScorta(p: number, voceUid: string, uid: string, e: EffettoPersonaTolta): void {
  const riga = prepared('SELECT * FROM persona_posseduta WHERE partita_id = ? AND persona_id = ?').get(p, e.persona) as (Record<string, unknown> & { id: number; livello: number }) | undefined;
  if (!riga) return;
  const prima: PrimaTolta = { gia: false, riga, skill: skillDellaPosseduta(riga.id) };
  prepared('UPDATE utente.effetto_stato_voce SET prima_json = ? WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(JSON.stringify(prima), p, voceUid, uid);
  prepared('DELETE FROM persona_posseduta WHERE id = ?').run(riga.id);
  registraEvento(p, 'persona-rimossa', `${nomePersona(e.persona)} rimossa dalla scorta`, `Era al livello ${riga.livello} · dal Diario.`, { livello: riga.livello, motivo: 'dal Diario' }, e.persona, voceUid);
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), p);
}

/**
 * Rimette nella scorta l'esemplare che la voce aveva tolto, com'era (stesso identificativo se è libero, stesse skill), solo se nel frattempo la
 * Persona non è rientrata nella scorta: allora resta quella, e l'avviso lo dice. La scorta piena non lo ferma (la capienza è solo informativa).
 */
function rimettiInScorta(p: number, personaId: number, prima: PrimaTolta): { avvisi: string[]; tornato: boolean } {
  if (prima.gia || !prima.riga) return { avvisi: [], tornato: false };
  if (inScorta(p, personaId)) return { avvisi: [`${nomePersona(personaId)} è di nuovo nella scorta: resta quella di adesso.`], tornato: false };
  const colonne = new Set((prepared("SELECT name FROM pragma_table_info('persona_posseduta', 'utente')").all() as Array<{ name: string }>).map((c) => c.name));
  const valori = Object.fromEntries(Object.entries(prima.riga).filter(([k]) => colonne.has(k)));
  // lo stesso identificativo, se nessun altro esemplare l'ha preso nel frattempo
  if (typeof valori.id === 'number' && prepared('SELECT 1 FROM persona_posseduta WHERE id = ?').get(valori.id)) delete valori.id;
  valori.partita_id = p; valori.persona_id = personaId; valori.updated_at = nowIso();
  const nomi = Object.keys(valori);
  const info = prepared(`INSERT INTO persona_posseduta (${nomi.map((n) => `"${n}"`).join(', ')}) VALUES (${nomi.map(() => '?').join(', ')})`).run(...nomi.map((n) => valori[n] as string | number | null));
  const id = typeof valori.id === 'number' ? valori.id : Number(info.lastInsertRowid);
  (prima.skill ?? []).forEach((s, i) => prepared('INSERT OR IGNORE INTO persona_posseduta_skill (posseduta_id, slot, skill_id) VALUES (?, ?, ?)').run(id, i + 1, s));
  prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), p);
  const oltre = oltreLaCapienza(p, 0);
  return { avvisi: oltre ? [`${nomePersona(personaId)} torna nella scorta oltre la capienza: ${oltre}.`] : [], tornato: true };
}

/**
 * La seconda parte della Persona «anche nella scorta»: se la Persona non è già in scorta la aggiunge con `aggiungiPosseduta` (l'unica scrittura
 * della scorta: livello indicato o base, skill apprese fino al livello, evento nello storico, obiettivi verificati), con il «prima» nella riga
 * `<uid>:scorta`. Il compendio l'ha già registrato la prima parte, quindi l'istantanea del compendio non si riscrive. La scorta piena non la
 * ferma: entra lo stesso, e l'avviso dice «oltre la capienza n/N».
 */
function applicaScorta(p: number, voceUid: string, uid: string, e: EffettoPersona): { esito: 'segnato' | 'gia-presente'; avvisi: string[] } {
  const riga = uidScorta(uid);
  const vecchio = prepared(SQL_RIGA_STATO).get(p, voceUid, riga) as { prima_json: string } | undefined;
  if (inScorta(p, e.persona)) {
    if (!vecchio) prepared(SQL_NUOVA_RIGA).run(p, voceUid, riga, TIPO_SCORTA, String(e.persona), JSON.stringify({ gia: true } satisfies PrimaScorta), new Date().toISOString());
    // l'esemplare c'è: se l'aveva aggiunto questa voce resta suo, altrimenti c'era già
    return { esito: vecchio && primaDellaRiga<PrimaScorta>(vecchio.prima_json)?.gia === false ? 'segnato' : 'gia-presente', avvisi: [] };
  }
  // l'esemplare nuovo è quello da ricordare (anche al posto di uno di prima, tolto a mano dopo la spunta)
  const aperto = prepared("SELECT id FROM obiettivo_partita WHERE partita_id = ? AND persona_id = ? AND stato = 'aperto'").get(p, e.persona) as { id: number } | undefined;
  const x = aggiungiPosseduta(p, e.persona, { ...(e.livello ? { livello: e.livello } : {}), origine: 'dal Diario' });
  const chiuso = aperto ? prepared("SELECT raggiunto_at FROM obiettivo_partita WHERE id = ? AND stato = 'raggiunto'").get(aperto.id) as { raggiunto_at: string | null } | undefined : undefined;
  const prima: PrimaScorta = { gia: false, possedutaId: x.id, livello: x.livello, skillIds: skillDellaPosseduta(x.id), ...(aperto && chiuso?.raggiunto_at ? { obiettivo: { id: aperto.id, raggiuntoAt: chiuso.raggiunto_at } } : {}) };
  prepared(`${SQL_NUOVA_RIGA} ON CONFLICT(partita_id, voce_uid, effetto_uid) DO UPDATE SET prima_json = excluded.prima_json`)
    .run(p, voceUid, riga, TIPO_SCORTA, String(e.persona), JSON.stringify(prima), new Date().toISOString());
  const oltre = oltreLaCapienza(p, 0);
  return { esito: 'segnato', avvisi: oltre ? [`${nomePersona(e.persona)} è nella scorta oltre la capienza: ${oltre}.`] : [] };
}

/** «n/N» se la scorta, con `inPiu` Persone ancora da aggiungere, supera la sua capienza (rango di Igor); null se ci sta o la capienza non è nota. */
function oltreLaCapienza(p: number, inPiu: number): string | null {
  const { capienza } = capienzaScorta(p);
  const quante = (prepared('SELECT COUNT(*) FROM persona_posseduta WHERE partita_id = ?').pluck().get(p) as number) + inPiu;
  return capienza !== null && quante > capienza ? `${quante}/${capienza}` : null;
}

/**
 * L'anteprima dell'approvazione (l'elenco del passato) di una Persona «anche nella scorta»: se non è in scorta e la scorta è piena, la frase che
 * dice che entrerà lo stesso, oltre la capienza; null altrimenti. Sola lettura.
 */
export function avvisoScortaPiena(p: number, personaId: number): string | null {
  if (inScorta(p, personaId)) return null;
  const oltre = oltreLaCapienza(p, 1);
  return oltre ? `La scorta è piena: ${nomePersona(personaId)} entrerà oltre la capienza (${oltre}).` : null;
}

/**
 * Un effetto di stato della voce: segna lo stato ricordando com'era (dentro la transazione della spunta o del salvataggio). Lo usano la spunta
 * (`applicaEffettiDiStato`, per ogni effetto) e, L13 (decisione 19), il salvataggio della guida su una voce già spuntata e l'approvazione
 * dell'elenco della partita. `segnato`: la voce lo tiene; `gia-presente`: c'era già (togliendo la spunta resta); `non-disponibile`:
 * l'articolo non si vende adesso nella partita e, senza `senzaDisponibilita` e se non è il set scelto (`scelto`, che invece ferma la spunta),
 * resta da segnare dal negozio (nessuna riga). La Persona «anche nella scorta» scrive le sue due parti, il compendio prima della scorta.
 */
export function applicaUnEffettoDiStato(p: number, voceUid: string, uid: string, e: EffettoDiStatoVoce, opz: OpzioniStato = {}): EsitoStato {
  const stato = applicaStato(p, voceUid, uid, e, opz);
  if (!conScorta(e)) return stato;
  const scorta = applicaScorta(p, voceUid, uid, e);
  return { esito: stato.esito === 'segnato' || scorta.esito === 'segnato' ? 'segnato' : 'gia-presente', avvisi: [...stato.avvisi, ...scorta.avvisi] };
}

/**
 * La spunta: segna ogni effetto di stato della voce, ricordando com'era lo stato (dentro la transazione della spunta), con la stessa scrittura
 * per ogni effetto (`applicaUnEffettoDiStato`). L13 (decisione 4): `opz.scelti` sono gli articoli scelti alla spunta fra quelli in alternativa
 * e `opz.st` lo stato al giorno della voce, in cui SOLO per loro si valuta la disponibilità (`OpzioniStato.scelto`); ogni altro articolo resta
 * valutato sullo stato corrente della partita, come prima. Restituisce gli avvisi per chi spunta (la scorta oltre la capienza).
 */
export function applicaEffettiDiStato(p: number, voceUid: string, effetti: Array<{ uid: string; effetto: EffettoDiStatoVoce }>, opz: { st?: StatoDisponibilita; scelti?: ReadonlySet<string> } = {}): string[] {
  return effetti.flatMap(({ uid, effetto: e }) => applicaUnEffettoDiStato(p, voceUid, uid, e, opz.scelti?.has(uid) ? { ...(opz.st ? { st: opz.st } : {}), scelto: true } : {}).avvisi);
}

/** Una riga di `utente.effetto_stato_voce`: lo stato che una voce ha segnato (o trovato già segnato) e il suo «prima». */
interface RigaStato { effetto_uid: string; tipo: string; chiave: string; prima_json: string }

/** L'effetto che una riga ricorda (tipo e chiave), per toglierlo e per dirlo: la riga della scorta è la Persona «anche nella scorta». */
function effettoDaRiga(tipo: string, chiave: string): EffettoDiStatoVoce {
  return tipo === 'storia' ? { tipo: 'storia', evento: chiave } : tipo === 'domanda' ? { tipo: 'domanda', domanda: Number(chiave) }
    : tipo === 'cruciverba' ? { tipo: 'cruciverba', data: chiave } : tipo === 'articolo' ? { tipo: 'articolo', articolo: chiave } : tipo === 'invito' ? { tipo: 'invito', invito: chiave }
      : tipo === 'persona' ? { tipo: 'persona', persona: Number(chiave) } : tipo === TIPO_SCORTA ? { tipo: 'persona', persona: Number(chiave), scorta: true }
        : tipo === 'trofeo' ? { tipo: 'trofeo', trofeo: chiave } : tipo === 'oggetto' ? { tipo: 'oggetto', oggetto: chiave, quantita: 1 }
          : tipo === 'sblocco' ? { tipo: 'sblocco', bersaglio: chiave.startsWith('richiesta:') ? 'richiesta' : 'attivita', chiave: chiave.slice(chiave.indexOf(':') + 1) }
            // 2026-10-28: i punti e l'uscita si dicono dalla loro riga del registro (qui solo per il tipo e la chiave)
            : tipo === 'personaTolta' ? { tipo: 'personaTolta', persona: Number(chiave) } : tipo === 'puntiConfidente' ? { tipo: 'puntiConfidente', confidente: chiave, punti: 1 }
              : tipo === 'uscitaOggetto' ? { tipo: 'uscitaOggetto', oggetto: chiave, quantita: 1, modo: 'restituito' }
                : { tipo: 'richiesta', richiesta: chiave };
}

/**
 * L'esemplare che la voce aveva aggiunto alla scorta: null se non c'è più (tolto a mano dopo la spunta); `intatta` se è ancora com'era alla
 * nascita (stesso livello e stesse skill, nessun bonus, valore osservato, tratto, nota o carica, sempre in squadra). Solo lettura.
 */
function esemplareDellaSpunta(p: number, personaId: number, prima: PrimaScorta): { nome: string; intatta: boolean } | null {
  if (prima.gia || prima.possedutaId === undefined) return null;
  const r = prepared(`SELECT pp.livello, pp.bonus_forza AS b1, pp.bonus_magia AS b2, pp.bonus_resistenza AS b3, pp.bonus_agilita AS b4, pp.bonus_fortuna AS b5, pp.tratto_skill_id, pp.in_squadra, pp.carica, pp.note,
      pp.osservate_livello, pp.osservate_forza, pp.osservate_magia, pp.osservate_resistenza, pp.osservate_agilita, pp.osservate_fortuna, p.nome
    FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id WHERE pp.id = ? AND pp.partita_id = ? AND pp.persona_id = ?`).get(prima.possedutaId, p, personaId) as
    { livello: number; b1: number; b2: number; b3: number; b4: number; b5: number; tratto_skill_id: number | null; in_squadra: number; carica: number; note: string;
      osservate_livello: number | null; osservate_forza: number | null; osservate_magia: number | null; osservate_resistenza: number | null; osservate_agilita: number | null; osservate_fortuna: number | null; nome: string } | undefined;
  // tolta a mano dopo la spunta: non c'è più niente da togliere
  if (!r) return null;
  const skill = skillDellaPosseduta(prima.possedutaId), attese = prima.skillIds ?? [];
  const intatta = r.livello === prima.livello && r.b1 === 0 && r.b2 === 0 && r.b3 === 0 && r.b4 === 0 && r.b5 === 0 && r.tratto_skill_id === null && r.in_squadra === 1 && r.carica === 0 && r.note === ''
    && r.osservate_livello === null && r.osservate_forza === null && r.osservate_magia === null && r.osservate_resistenza === null && r.osservate_agilita === null && r.osservate_fortuna === null
    && skill.length === attese.length && skill.every((s, i) => s === attese[i]);
  return { nome: t('persona', r.nome), intatta };
}

/**
 * 2026-10-26 (le ricevute della spunta, `applicatoDallaSpunta.ts`): gli effetti di stato che la spunta della voce ha davvero segnato e che
 * togliere la spunta riporta com'erano. Non quelli che c'erano già (`prima.gia`: la spunta non li ha toccati e togliendola restano), né quelli
 * rivendicati anche da un'altra voce spuntata (`annullaEffettiDiStato`: lo stato lo revoca solo l'ultima voce che toglie la spunta, quindi
 * togliendo questa resta; due effetti della stessa voce sullo stesso stato si annullano insieme e contano come suoi); l'oggetto ricevuto
 * sempre, con la quantità della sua riga (è della voce e dell'effetto). `quantita` dell'articolo dalla lista attuale della voce
 * (`quantitaArticolo`): la riga ricorda solo l'articolo. La Persona «anche nella scorta» (la regola di `decidiAnnullo`): l'esemplare solo se è
 * ancora com'era (togliendo la spunta esce), e allora una voce sola con le due parti; un esemplare modificato dopo resta, e con lui il
 * compendio: nessuna delle due si dice. `parte: 'scorta'`: della Persona la voce ha aggiunto solo l'esemplare (il compendio c'era già). Sola lettura.
 */
export function effettiDiStatoApplicati(p: number, voceUid: string, quantitaArticolo: (effettoUid: string) => number | undefined): Array<{ effettoUid: string; effetto: EffettoDiStatoVoce; applicatoIl: string; parte?: 'scorta' }> {
  const righe = prepared('SELECT effetto_uid, tipo, chiave, prima_json, applicato_il FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? ORDER BY applicato_il, rowid').all(p, voceUid) as Array<RigaStato & { applicato_il: string }>;
  const altraVoce = (r: RigaStato): boolean => !!prepared('SELECT 1 FROM utente.effetto_stato_voce WHERE partita_id = ? AND tipo = ? AND chiave = ? AND voce_uid <> ? LIMIT 1').get(p, r.tipo, r.chiave, voceUid);
  // l'esemplare della scorta di ogni effetto: che cosa ne fa togliere la spunta (`intatta`: esce; altrimenti resta, e il compendio con lui)
  const scorte = new Map<string, { intatta: boolean; livello?: number }>();
  for (const r of righe) {
    if (r.tipo !== TIPO_SCORTA) continue;
    const prima = primaDellaRiga<PrimaScorta>(r.prima_json);
    if (!prima || prima.gia || altraVoce(r)) continue;
    const x = esemplareDellaSpunta(p, Number(r.chiave), prima);
    if (x) scorte.set(r.effetto_uid.slice(0, -':scorta'.length), { intatta: x.intatta, ...(prima.livello !== undefined ? { livello: prima.livello } : {}) });
  }
  const out: Array<{ effettoUid: string; effetto: EffettoDiStatoVoce; applicatoIl: string; parte?: 'scorta' }> = [];
  const compendioDetto = new Set<string>();
  for (const r of righe) {
    if (r.tipo === TIPO_SCORTA) continue;
    if (r.tipo === 'oggetto') {
      const o = prepared('SELECT catalogo_chiave, quantita FROM utente.oggetto_ottenuto_partita WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').get(p, voceUid, r.effetto_uid) as { catalogo_chiave: string; quantita: number } | undefined;
      if (o) out.push({ effettoUid: r.effetto_uid, effetto: { tipo: 'oggetto', oggetto: o.catalogo_chiave, quantita: o.quantita }, applicatoIl: r.applicato_il });
      continue;
    }
    // 2026-10-28: i punti al Confidente solo se il registro li tiene ancora nella generazione corrente (dopo una correzione a mano dalla pagina
    // Confidenti, prioritaria, togliendo la spunta non si ricalcolano: restano), l'uscita dell'oggetto dalla sua riga
    if (r.tipo === 'puntiConfidente') {
      const x = puntiDellEffettoInVigore(p, voceUid, r.effetto_uid);
      if (x) out.push({ effettoUid: r.effetto_uid, effetto: { tipo: 'puntiConfidente', confidente: x.confidente, punti: x.punti }, applicatoIl: r.applicato_il });
      continue;
    }
    if (r.tipo === 'uscitaOggetto') {
      const u = uscitaDellaVoce(p, voceUid, r.effetto_uid);
      if (u) out.push({ effettoUid: r.effetto_uid, effetto: { tipo: 'uscitaOggetto', oggetto: u.catalogo, quantita: u.quantita, modo: u.modo, ...(u.modo === 'venduto' && u.prezzo ? { prezzo: u.prezzo } : {}) }, applicatoIl: r.applicato_il });
      continue;
    }
    const prima = primaDellaRiga<StatoPrima>(r.prima_json);
    if (!prima || prima.gia || altraVoce(r)) continue;
    const e = effettoDaRiga(r.tipo, r.chiave);
    // la Persona tolta torna togliendo la spunta solo se non è rientrata nella scorta nel frattempo (`rimettiInScorta`)
    if (e.tipo === 'personaTolta' && inScorta(p, e.persona)) continue;
    if (e.tipo === 'persona') {
      const s = scorte.get(r.effetto_uid);
      // l'esemplare modificato dopo la spunta resta, e la Persona resta registrata con lui
      if (s && !s.intatta) continue;
      compendioDetto.add(r.effetto_uid);
      out.push({ effettoUid: r.effetto_uid, effetto: s ? { ...e, scorta: true, ...(s.livello !== undefined ? { livello: s.livello } : {}) } : e, applicatoIl: r.applicato_il });
      continue;
    }
    const q = e.tipo === 'articolo' ? quantitaArticolo(r.effetto_uid) : undefined;
    out.push({ effettoUid: r.effetto_uid, effetto: e.tipo === 'articolo' && q && q > 1 ? { ...e, quantita: q } : e, applicatoIl: r.applicato_il });
  }
  // l'esemplare intatto di una Persona che era già nel compendio: si dice solo la scorta
  for (const r of righe) {
    if (r.tipo !== TIPO_SCORTA) continue;
    const effettoUid = r.effetto_uid.slice(0, -':scorta'.length), s = scorte.get(effettoUid);
    if (!s?.intatta || compendioDetto.has(effettoUid)) continue;
    out.push({ effettoUid, effetto: { tipo: 'persona', persona: Number(r.chiave), scorta: true, ...(s.livello !== undefined ? { livello: s.livello } : {}) }, applicatoIl: r.applicato_il, parte: 'scorta' });
  }
  return out;
}

/** Per ogni stato, l'evento dello storico che i setter scrivono segnandolo (tipo e campo dei dati che lo identifica); la storia non ne scrive. */
const EVENTO_DELLO_STATO: Record<string, { tipo: string; campo: string } | undefined> = {
  domanda: { tipo: 'domanda-risposta', campo: 'domandaId' }, cruciverba: { tipo: 'cruciverba', campo: 'data' },
  articolo: { tipo: 'acquisto', campo: 'articolo' }, richiesta: { tipo: 'richiesta-completata', campo: 'richiesta' },
  trofeo: { tipo: 'trofeo', campo: 'trofeo' },
};
/** Gli eventi della Persona che la voce scrive (legati per `persona_id`): la registrazione nel compendio, l'aggiunta alla scorta e l'obiettivo che chiude. */
const EVENTI_DELLA_PERSONA: Record<string, readonly string[] | undefined> = {
  persona: ['compendio-registrata'], [TIPO_SCORTA]: ['persona-aggiunta', 'obiettivo-raggiunto'], personaTolta: ['persona-rimossa'],
};

/**
 * Che cosa fa «togli la spunta» su una riga: l'UNICA regola dell'annullo (la spunta tolta, il cestino, l'effetto tolto o cambiato nella guida).
 * - `registro`: l'oggetto ricevuto, i punti al Confidente e l'oggetto restituito o venduto sono della voce e dell'effetto, non uno stato
 *   condiviso: se ne va la loro riga (i punti escono dal registro cronologico e il Confidente si ricalcola, le copie uscite tornano);
 * - `erede`: un'altra riga (di un'altra voce spuntata o di un altro effetto della stessa) rivendica lo stesso stato: resta, e il «prima» (con
 *   gli eventi) passa a lei;
 * - `gia`: lo stato c'era già prima della voce: resta;
 * - `scorta-assente` / `scorta-tolta` / `scorta-modificata`: l'esemplare nato dalla voce non c'è più, se ne va (intatto), resta (modificato dopo);
 * - `persona-in-scorta`: l'esemplare resta in scorta, quindi la Persona resta registrata (ottenerla la registra);
 * - `torna`: lo stato torna com'era prima della voce.
 * `restanoInScorta`: le Persone il cui esemplare resta in scorta, dalle righe della scorta decise prima (vanno per prime).
 */
type DecisioneAnnullo = { modo: 'registro' | 'gia' | 'scorta-assente' | 'persona-in-scorta' | 'torna' } | { modo: 'erede'; altre: Array<{ voce_uid: string; effetto_uid: string }> }
  | { modo: 'scorta-tolta' | 'scorta-modificata'; nome: string };
function decidiAnnullo(p: number, voceUid: string, r: RigaStato, restanoInScorta: ReadonlySet<string>): DecisioneAnnullo {
  if (r.tipo === 'oggetto' || r.tipo === 'puntiConfidente' || r.tipo === 'uscitaOggetto') return { modo: 'registro' };
  const prima = JSON.parse(r.prima_json) as StatoPrima & PrimaScorta;
  // Lo stato lo rivendicano tutte le voci spuntate con lo stesso effetto (le righe esistono solo per le spunte attive): si revoca solo
  // se nessun'altra lo rivendica. Se un'altra lo rivendica, il «prima» originale (non ancora segnato) passa a lei, così lo revoca
  // l'ultima voce che toglie la spunta.
  const altre = prepared('SELECT voce_uid, effetto_uid FROM utente.effetto_stato_voce WHERE partita_id = ? AND tipo = ? AND chiave = ? AND NOT (voce_uid = ? AND effetto_uid = ?)').all(p, r.tipo, r.chiave, voceUid, r.effetto_uid) as Array<{ voce_uid: string; effetto_uid: string }>;
  if (altre.length > 0) return { modo: 'erede', altre };
  // Ondata 5 (lotto G): il trofeo lo rivendica anche un turno registrato con un esito che lo dà (la lotteria vinta): resta, e se l'aveva
  // segnato la voce il segno passa al turno (`cediTrofeoAUnTurno`, la stessa regola dell'erede)
  if (r.tipo === 'trofeo' && cediTrofeoAUnTurno(p, r.chiave, voceUid, !prima.gia)) return { modo: 'gia' };
  if (prima.gia) return { modo: 'gia' };
  if (r.tipo === TIPO_SCORTA) {
    const x = esemplareDellaSpunta(p, Number(r.chiave), prima);
    return !x ? { modo: 'scorta-assente' } : { modo: x.intatta ? 'scorta-tolta' : 'scorta-modificata', nome: x.nome };
  }
  if (r.tipo === 'persona' && restanoInScorta.has(r.chiave)) return { modo: 'persona-in-scorta' };
  return { modo: 'torna' };
}
/** La scorta per prima: se il suo esemplare resta (modificato dopo), la Persona resta anche nel compendio. */
const scortaPerPrima = (righe: readonly RigaStato[]): RigaStato[] => [...righe].sort((a, b) => Number(b.tipo === TIPO_SCORTA) - Number(a.tipo === TIPO_SCORTA));

/**
 * Gli eventi dello storico che la voce aveva scritto segnando lo stato di una riga, legati alla voce: se ne vanno con lo stato quando un effetto
 * tolto o cambiato nella guida torna com'era (togliendo la spunta li revoca tutti insieme `revocaEventiDellaVoce`).
 */
function revocaEventiDelloStato(p: number, voceUid: string, r: RigaStato): void {
  const evento = EVENTO_DELLO_STATO[r.tipo];
  if (evento) prepared(`DELETE FROM utente.evento_partita WHERE partita_id = ? AND voce_uid = ? AND tipo = ? AND json_extract(dati_json, '$.${evento.campo}') = ?`)
    .run(p, voceUid, evento.tipo, r.tipo === 'domanda' ? Number(r.chiave) : r.chiave);
  const eventiPersona = EVENTI_DELLA_PERSONA[r.tipo];
  if (eventiPersona) prepared(`DELETE FROM utente.evento_partita WHERE partita_id = ? AND voce_uid = ? AND persona_id = ? AND tipo IN (${eventiPersona.map(() => '?').join(', ')})`)
    .run(p, voceUid, Number(r.chiave), ...eventiPersona);
}

/**
 * Riporta com'erano gli stati delle righe indicate (dentro la transazione di chi la chiama), con la regola di `decidiAnnullo`, e le toglie.
 * `revocaEventi`: anche gli eventi che la voce aveva scritto per quegli stati se ne vanno (un effetto tolto o cambiato nella guida; togliendo la
 * spunta li revoca `revocaEventiDellaVoce`, tutti insieme). Restituisce gli avvisi (un esemplare in scorta modificato dopo, che resta) e se
 * qualcosa è davvero tornato com'era (`tornato`: uno stato riportato indietro, un esemplare o un oggetto tolti; non ciò che resta perché c'era
 * già, lo tiene un'altra voce o è stato modificato dopo).
 */
function annullaRighe(p: number, voceUid: string, righe: readonly RigaStato[], revocaEventi: boolean): { avvisi: string[]; tornato: boolean } {
  const avvisi: string[] = [];
  let tornato = false;
  const restanoInScorta = new Set<string>();
  for (const r of scortaPerPrima(righe)) {
    const d = decidiAnnullo(p, voceUid, r, restanoInScorta);
    if (d.modo === 'scorta-tolta' || (d.modo === 'torna' && r.tipo !== 'personaTolta')) tornato = true;
    const prima = JSON.parse(r.prima_json) as StatoPrima & PrimaScorta & PrimaTolta;
    if (d.modo === 'registro') {
      // l'oggetto ricevuto se ne va con la sua riga; i punti escono dal registro (il Confidente si ricalcola, se sono della generazione
      // corrente: dopo una correzione a mano dalla pagina restano); le copie restituite o vendute tornano
      if (r.tipo === 'oggetto') { prepared('DELETE FROM utente.oggetto_ottenuto_partita WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, r.effetto_uid); tornato = true; }
      else if (r.tipo === 'puntiConfidente') { if (togliPuntiDellEffetto(p, voceUid, r.effetto_uid)) tornato = true; }
      else if (togliUscitaDaVoce(p, voceUid, r.effetto_uid)) tornato = true;
    } else if (d.modo === 'torna' && r.tipo === 'personaTolta') {
      // l'esemplare tolto dalla voce torna com'era, se la Persona non è rientrata nella scorta nel frattempo (allora resta quella, e lo si dice)
      const x = rimettiInScorta(p, Number(r.chiave), prima);
      avvisi.push(...x.avvisi);
      if (x.tornato) { tornato = true; if (revocaEventi) revocaEventiDelloStato(p, voceUid, r); }
      else prepared("UPDATE utente.evento_partita SET voce_uid = NULL WHERE partita_id = ? AND voce_uid = ? AND persona_id = ? AND tipo = 'persona-rimossa'").run(p, voceUid, Number(r.chiave));
    } else if (d.modo === 'erede') {
      if (!prima.gia) {
        for (const o of d.altre) prepared('UPDATE utente.effetto_stato_voce SET prima_json = ? WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(r.prima_json, p, o.voce_uid, o.effetto_uid);
        // anche l'evento che questa voce aveva scritto segnando lo stato passa a chi lo tiene ancora: resta nello storico (e nella
        // provenienza) finché lo stato c'è, e lo revoca l'ultima voce che toglie la spunta
        const erede = prepared('SELECT voce_uid FROM utente.effetto_stato_voce WHERE partita_id = ? AND tipo = ? AND chiave = ? AND NOT (voce_uid = ? AND effetto_uid = ?) ORDER BY applicato_il, voce_uid LIMIT 1').get(p, r.tipo, r.chiave, voceUid, r.effetto_uid) as { voce_uid: string } | undefined;
        // l'invito lo tiene la riga `invito_partita`: la voce che lo ha scritto passa il legame, perché lo possa togliere l'ultima
        if (erede && r.tipo === 'invito') prepared('UPDATE utente.invito_partita SET voce_uid = ? WHERE partita_id = ? AND invito_chiave = ? AND voce_uid = ?').run(erede.voce_uid, p, r.chiave, voceUid);
        if (erede && r.tipo === 'sblocco') prepared("UPDATE utente.sblocco_partita SET voce_uid = ? WHERE partita_id = ? AND bersaglio_tipo || ':' || bersaglio_chiave = ? AND voce_uid = ?").run(erede.voce_uid, p, r.chiave, voceUid);
        const evento = EVENTO_DELLO_STATO[r.tipo];
        if (erede && evento) prepared(`UPDATE utente.evento_partita SET voce_uid = ? WHERE partita_id = ? AND voce_uid = ? AND tipo = ? AND json_extract(dati_json, '$.${evento.campo}') = ?`)
          .run(erede.voce_uid, p, voceUid, evento.tipo, r.tipo === 'domanda' ? Number(r.chiave) : r.chiave);
        const eventiPersona = EVENTI_DELLA_PERSONA[r.tipo];
        if (erede && eventiPersona) prepared(`UPDATE utente.evento_partita SET voce_uid = ? WHERE partita_id = ? AND voce_uid = ? AND persona_id = ? AND tipo IN (${eventiPersona.map(() => '?').join(', ')})`)
          .run(erede.voce_uid, p, voceUid, Number(r.chiave), ...eventiPersona);
      }
    } else if (d.modo === 'scorta-modificata') {
      // l'esemplare è stato modificato dopo la spunta: resta com'è (mai perdere ciò che è stato aggiunto) e l'avviso lo dice; l'evento della sua
      // aggiunta resta nello storico, senza più il legame con la voce
      prepared("UPDATE utente.evento_partita SET voce_uid = NULL WHERE partita_id = ? AND voce_uid = ? AND persona_id = ? AND tipo IN ('persona-aggiunta', 'obiettivo-raggiunto')").run(p, voceUid, Number(r.chiave));
      avvisi.push(`${d.nome} resta nella scorta (e nel compendio): l’hai modificata dopo la spunta.`);
      restanoInScorta.add(r.chiave);
    } else if (d.modo === 'scorta-tolta') {
      // l'esemplare intatto se ne va e con lui si riapre l'obiettivo che la sua aggiunta aveva chiuso, se è ancora chiuso da quella
      prepared('DELETE FROM persona_posseduta WHERE id = ?').run(prima.possedutaId);
      if (prima.obiettivo) prepared("UPDATE obiettivo_partita SET stato = 'aperto', raggiunto_at = NULL, updated_at = ? WHERE id = ? AND partita_id = ? AND stato = 'raggiunto' AND raggiunto_at = ?").run(nowIso(), prima.obiettivo.id, p, prima.obiettivo.raggiuntoAt);
      if (revocaEventi) revocaEventiDelloStato(p, voceUid, r);
    } else if (d.modo === 'persona-in-scorta') {
      // l'esemplare resta in scorta: la Persona resta registrata (ottenerla la registra), e l'evento della registrazione resta nello storico
      prepared("UPDATE utente.evento_partita SET voce_uid = NULL WHERE partita_id = ? AND voce_uid = ? AND persona_id = ? AND tipo = 'compendio-registrata'").run(p, voceUid, Number(r.chiave));
    } else if (d.modo === 'torna') {
      // l'oggetto potrebbe non esserci più (guida cambiata): non si ferma l'annullo della spunta
      try { scrivi(p, effettoDaRiga(r.tipo, r.chiave), false, prima.stato ?? null, voceUid, {}, r.effetto_uid); } catch (err) { if (!(err instanceof Error) || !/non-trovat|non esiste|Nessun/i.test(`${(err as { code?: string }).code ?? ''} ${err.message}`)) throw err; }
      if (revocaEventi) revocaEventiDelloStato(p, voceUid, r);
    }
    // Ondata 5: la copia della voce lascia il registro in ogni caso (anche quando lo stato «ottenuto» resta: c'era già o lo tiene un'altra voce)
    if (r.tipo === 'articolo') togliCopiaDaVoce(p, voceUid, r.effetto_uid);
    prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, r.effetto_uid);
  }
  return { avvisi, tornato };
}

/**
 * Togliere la spunta: ogni effetto di stato che la spunta aveva segnato torna com'era; ciò che c'era già resta. Restituisce gli avvisi da
 * mostrare a chi toglie la spunta (un esemplare in scorta modificato dopo, che resta).
 */
export function annullaEffettiDiStato(p: number, voceUid: string): string[] {
  return annullaRighe(p, voceUid, prepared('SELECT effetto_uid, tipo, chiave, prima_json FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ?').all(p, voceUid) as RigaStato[], false).avvisi;
}

/**
 * L13 (decisione 19): annulla UN effetto di stato della voce, tolto o cambiato nella guida mentre la voce è spuntata, con la stessa regola di
 * «togli la spunta» (`decidiAnnullo`): torna com'era prima solo ciò che la voce aveva aggiunto, e solo se intatto; gli eventi che aveva scritto
 * per quegli stati se ne vanno con loro. `resta`: la versione nuova dello stesso effetto; le parti che dice ancora (stesso tipo, stessa chiave:
 * la stessa Persona, lo stesso trofeo) restano com'erano, con il loro «prima», e se ne vanno solo quelle superate (l'Arsène di un effetto
 * diventato Pixie, la scorta di un effetto tornato «Solo nel Compendio»). `tolto`: qualcosa è davvero tornato com'era (non ciò che c'era già, che
 * un'altra voce tiene o che è stato modificato dopo); `avvisi`: ciò che resta perché modificato dopo (un esemplare in scorta).
 */
export function annullaEffettoDiStato(p: number, voceUid: string, effettoUid: string, resta?: EffettoDiStatoVoce): { tolto: boolean; avvisi: string[] } {
  const righe = prepared('SELECT effetto_uid, tipo, chiave, prima_json FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid IN (?, ?)')
    .all(p, voceUid, effettoUid, uidScorta(effettoUid)) as RigaStato[];
  const restano = !resta ? [] : [
    { uid: effettoUid, tipo: resta.tipo, chiave: chiaveDi(resta) },
    ...(conScorta(resta) ? [{ uid: uidScorta(effettoUid), tipo: TIPO_SCORTA, chiave: String(resta.persona) }] : []),
  ];
  const superate = righe.filter((r) => !restano.some((x) => x.uid === r.effetto_uid && x.tipo === r.tipo && x.chiave === r.chiave));
  if (!superate.length) return { tolto: false, avvisi: [] };
  const { avvisi, tornato } = annullaRighe(p, voceUid, superate, true);
  return { tolto: tornato, avvisi };
}
