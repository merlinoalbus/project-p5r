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
// 2026-10-26 (richiesta dell'utente: «devo poter scegliere se l'effetto si fermi solo al Compendio o se quella persona viene anche aggiunta
// alla scorta»): la Persona con `scorta` ha una seconda parte, l'esemplare in scorta, che è uno stato a sé (riga `<uid>:scorta`, tipo
// `persona-scorta`): si aggiunge con `aggiungiPosseduta` (l'unica scrittura della scorta) e si toglie solo se è ancora com'era alla nascita.
// Per una voce già spuntata gli stati mancanti si applicano col gesto esplicito «Applica alla partita» (`statiMancanti` + `applicaParti`).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { HttpError, httpErrors } from '../utils/httpError.js';
import { EVENTI_PESCA } from '../../shared/pesca.js';
import { chiaveSblocco, fraseEffettoConNomi, type EffettoDiStatoVoce, type NomiFraseEffetto } from '../../shared/effettiVoce.js';
import { impostaTrofeo } from './completamentoService.js';
import { impostaEventoStoria } from './semaforiService.js';
import { impostaDomandaFatta } from './domandeService.js';
import { impostaCruciverba } from './cruciverbaService.js';
import { impostaStatoRichiesta } from './richiesteService.js';
import { impostaAcquisto } from './negoziService.js';
import { eOffertaAojiru } from '../../shared/acquisti.js';
import { annullaInvito, registraInvito } from './inviti.js';
import { aggiungiPosseduta, registraPersona } from './partiteService.js';
import { assicuraNonDelGruppo } from './personeDelGruppo.js';
import { t } from './traduzioniService.js';

type StatoPrima = { gia: boolean; stato?: string | null };
type EffettoPersona = Extract<EffettoDiStatoVoce, { tipo: 'persona' }>;

/** Il tipo della riga di `utente.effetto_stato_voce` che ricorda l'esemplare che la spunta ha aggiunto alla scorta (chiave = id della Persona). */
export const TIPO_SCORTA = 'persona-scorta';
const uidScorta = (uid: string): string => `${uid}:scorta`;
/**
 * Il «prima» della scorta: `gia` = la Persona era già in scorta (la spunta non ha toccato niente); altrimenti l'esemplare nato dalla spunta,
 * com'era alla nascita (livello e skill), e l'obiettivo che la sua aggiunta ha chiuso, per riaprirlo togliendo la spunta.
 */
type PrimaScorta = { gia: boolean; possedutaId?: number; livello?: number; skillIds?: number[]; obiettivo?: { id: number; raggiuntoAt: string } };

/** Una parte di un effetto di stato: lo stato dell'effetto e, per la Persona «anche nella scorta», l'esemplare in scorta (seconda parte). */
export interface ParteDiStato { effettoUid: string; uidRiga: string; scorta: boolean; effetto: EffettoDiStatoVoce }
const partiDi = (uid: string, e: EffettoDiStatoVoce): ParteDiStato[] => [
  { effettoUid: uid, uidRiga: uid, scorta: false, effetto: e },
  ...(e.tipo === 'persona' && e.scorta ? [{ effettoUid: uid, uidRiga: uidScorta(uid), scorta: true, effetto: e }] : []),
];

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
    const p = prepared('SELECT rara FROM persona WHERE id = ?').get(e.persona) as { rara: number } | undefined;
    if (!p) throw httpErrors.notFound('persona-non-trovata', `La Persona ${e.persona} non esiste.`);
    assicuraNonDelGruppo(e.persona);
    // come la scelta della scorta (`ScortaPersona`): un Demone del Tesoro non si aggiunge alla scorta da qui
    if (e.scorta && p.rara === 1) throw httpErrors.badRequest('persona-rara-scorta', 'Un Demone del Tesoro non si aggiunge alla scorta da una voce: scegli «Solo nel Compendio».');
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

const inScorta = (p: number, personaId: number): boolean => !!prepared('SELECT 1 FROM persona_posseduta WHERE partita_id = ? AND persona_id = ?').get(p, personaId);
const skillDellaPosseduta = (possedutaId: number): number[] =>
  (prepared('SELECT skill_id FROM persona_posseduta_skill WHERE posseduta_id = ? ORDER BY slot').all(possedutaId) as Array<{ skill_id: number }>).map((x) => x.skill_id);

/**
 * La parte «anche nella scorta»: se la Persona non è già in scorta la aggiunge con `aggiungiPosseduta` (l'unica scrittura della scorta: livello
 * indicato o base, skill apprese fino al livello, evento nello storico, obiettivi verificati). Il compendio l'ha già registrato la prima parte
 * dell'effetto, quindi l'istantanea del compendio non si riscrive. Restituisce il «prima» da ricordare.
 */
function aggiungiAllaScorta(p: number, e: EffettoPersona): PrimaScorta {
  if (inScorta(p, e.persona)) return { gia: true };
  const aperto = prepared("SELECT id FROM obiettivo_partita WHERE partita_id = ? AND persona_id = ? AND stato = 'aperto'").get(p, e.persona) as { id: number } | undefined;
  const x = aggiungiPosseduta(p, e.persona, { ...(e.livello ? { livello: e.livello } : {}), origine: 'dal Diario' });
  const chiuso = aperto ? prepared("SELECT raggiunto_at FROM obiettivo_partita WHERE id = ? AND stato = 'raggiunto'").get(aperto.id) as { raggiunto_at: string | null } | undefined : undefined;
  return { gia: false, possedutaId: x.id, livello: x.livello, skillIds: skillDellaPosseduta(x.id), ...(aperto && chiuso?.raggiunto_at ? { obiettivo: { id: aperto.id, raggiuntoAt: chiuso.raggiunto_at } } : {}) };
}

/**
 * Togliere la spunta: l'esemplare che la spunta aveva aggiunto se ne va solo se è ancora com'era alla nascita (stesso livello e stesse skill,
 * nessun bonus, valore osservato, tratto, nota o carica, sempre in squadra); con lui si riapre l'obiettivo che la sua aggiunta aveva chiuso,
 * se è ancora chiuso da quella. Modificato dopo, resta com'è (mai perdere ciò che è stato aggiunto) e l'avviso lo dice; l'evento della sua
 * aggiunta resta nello storico, senza più il legame con la voce. Restituisce l'avviso, o null.
 */
function togliDallaScorta(p: number, voceUid: string, personaId: number, prima: PrimaScorta): string | null {
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
  if (!intatta) {
    prepared("UPDATE utente.evento_partita SET voce_uid = NULL WHERE partita_id = ? AND voce_uid = ? AND persona_id = ? AND tipo IN ('persona-aggiunta', 'obiettivo-raggiunto')").run(p, voceUid, personaId);
    return `${t('persona', r.nome)} resta nella scorta (e nel compendio): l’hai modificata dopo la spunta.`;
  }
  prepared('DELETE FROM persona_posseduta WHERE id = ?').run(prima.possedutaId);
  if (prima.obiettivo) prepared("UPDATE obiettivo_partita SET stato = 'aperto', raggiunto_at = NULL, updated_at = ? WHERE id = ? AND partita_id = ? AND stato = 'raggiunto' AND raggiunto_at = ?").run(nowIso(), prima.obiettivo.id, p, prima.obiettivo.raggiuntoAt);
  return null;
}

const SQL_RIGA_STATO = 'SELECT prima_json FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?';

/** Applica una parte di un effetto di stato, ricordando com'era lo stato (dentro la transazione di chi la chiama). */
function applicaParte(p: number, voceUid: string, parte: ParteDiStato): void {
  const { uidRiga: uid, effetto: e } = parte;
  // rispuntando, il «prima» resta quello della prima volta (non diventa «già segnato» per colpa della spunta di prima)
  const vecchio = prepared(SQL_RIGA_STATO).get(p, voceUid, uid) as { prima_json: string } | undefined;
  if (parte.scorta) {
    const persona = (e as EffettoPersona).persona;
    if (inScorta(p, persona)) {
      if (!vecchio) prepared('INSERT INTO utente.effetto_stato_voce (partita_id, voce_uid, effetto_uid, tipo, chiave, prima_json, applicato_il) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(p, voceUid, uid, TIPO_SCORTA, String(persona), JSON.stringify({ gia: true } satisfies PrimaScorta), new Date().toISOString());
      return;
    }
    // l'esemplare nuovo è quello da ricordare (anche al posto di uno di prima, che non c'è più)
    const prima = aggiungiAllaScorta(p, e as EffettoPersona);
    prepared('INSERT INTO utente.effetto_stato_voce (partita_id, voce_uid, effetto_uid, tipo, chiave, prima_json, applicato_il) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(partita_id, voce_uid, effetto_uid) DO UPDATE SET prima_json = excluded.prima_json')
      .run(p, voceUid, uid, TIPO_SCORTA, String(persona), JSON.stringify(prima), new Date().toISOString());
    return;
  }
  const prima = leggiPrima(p, e);
  if (!vecchio) {
    prepared('INSERT INTO utente.effetto_stato_voce (partita_id, voce_uid, effetto_uid, tipo, chiave, prima_json, applicato_il) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(p, voceUid, uid, e.tipo, chiaveDi(e), JSON.stringify(prima), new Date().toISOString());
  }
  if (e.tipo === 'oggetto') { scriviOggetto(p, voceUid, uid, e); return; }
  if (prima.gia) return;
  try { scrivi(p, e, true, null, voceUid); }
  catch (err) {
    // un articolo non ancora disponibile nella partita non ferma la spunta della voce: resta da segnare dal negozio
    if (e.tipo === 'articolo' && (err as { code?: string }).code === 'articolo-non-disponibile') {
      if (!vecchio) prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, uid);
      return;
    }
    throw err;
  }
}

/** La spunta: segna ogni effetto di stato della voce, ricordando com'era lo stato (dentro la transazione della spunta). */
export function applicaEffettiDiStato(p: number, voceUid: string, effetti: Array<{ uid: string; effetto: EffettoDiStatoVoce }>): void {
  for (const { uid, effetto } of effetti) for (const parte of partiDi(uid, effetto)) applicaParte(p, voceUid, parte);
}

/**
 * Voce già spuntata (2026-10-26): le parti degli effetti di stato che nella partita non risultano ancora segnate dalla voce (nessuna riga in
 * `utente.effetto_stato_voce`: effetto aggiunto o cambiato dopo la spunta) e il cui stato non c'è già per altra via (una Persona registrata a
 * mano, un trofeo ottenuto dalla sua pagina: niente legami inventati). Sola lettura: le scrive solo il gesto esplicito (`applicaParti`).
 */
export function statiMancanti(p: number, voceUid: string, effetti: ReadonlyArray<{ uid: string; effetto: EffettoDiStatoVoce }>): ParteDiStato[] {
  return effetti.flatMap(({ uid, effetto }) => partiDi(uid, effetto)).filter((parte) => {
    if (prepared(SQL_RIGA_STATO).get(p, voceUid, parte.uidRiga)) return false;
    if (parte.scorta) return !inScorta(p, (parte.effetto as EffettoPersona).persona);
    if (parte.effetto.tipo === 'oggetto') return true;
    return !leggiPrima(p, parte.effetto).gia;
  });
}

/**
 * Il gesto «Applica alla partita» di una voce già spuntata: applica le parti indicate come le avrebbe applicate la spunta (stesse scritture,
 * stesso «prima», quindi togliendo la spunta tornano come gli altri). Ogni parte in un punto di ripristino suo: una che il gioco non permette
 * ancora (un invito senza le condizioni, un articolo non disponibile) resta da applicare, con il motivo, e non ferma le altre.
 */
export function applicaParti(p: number, voceUid: string, parti: readonly ParteDiStato[]): { scritte: ParteDiStato[]; nonApplicate: Array<{ parte: ParteDiStato; motivo: string }> } {
  const scritte: ParteDiStato[] = [], nonApplicate: Array<{ parte: ParteDiStato; motivo: string }> = [];
  for (const parte of parti) {
    try { getDb().transaction(() => applicaParte(p, voceUid, parte))(); }
    catch (err) {
      if (err instanceof HttpError && err.status < 500) { nonApplicate.push({ parte, motivo: err.message }); continue; }
      throw err;
    }
    if (prepared(SQL_RIGA_STATO).get(p, voceUid, parte.uidRiga)) scritte.push(parte);
    else nonApplicate.push({ parte, motivo: 'L’articolo non è ancora disponibile nella partita: segnalo dal negozio quando lo compri.' });
  }
  return { scritte, nonApplicate };
}

/** La frase di una parte, per l'avviso «non ancora applicato» e per la risposta del gesto: la stessa frase condivisa degli effetti. */
export function descriviParte(parte: ParteDiStato, nomi: NomiFraseEffetto): string {
  const e = parte.effetto;
  if (e.tipo !== 'persona') return fraseEffettoConNomi(e, nomi);
  if (!parte.scorta) return fraseEffettoConNomi({ tipo: 'persona', persona: e.persona }, nomi);
  return `${nomi.persona(e.persona) ?? 'La Persona'} nella scorta${e.livello ? ` al livello ${e.livello}` : ''}`;
}

/** Per ogni stato, l'evento dello storico che i setter scrivono segnandolo (tipo e campo dei dati che lo identifica); la storia non ne scrive. */
const EVENTO_DELLO_STATO: Record<string, { tipo: string; campo: string } | undefined> = {
  domanda: { tipo: 'domanda-risposta', campo: 'domandaId' }, cruciverba: { tipo: 'cruciverba', campo: 'data' },
  articolo: { tipo: 'acquisto', campo: 'articolo' }, richiesta: { tipo: 'richiesta-completata', campo: 'richiesta' },
  trofeo: { tipo: 'trofeo', campo: 'trofeo' },
};
/** Gli eventi della Persona che la spunta scrive (legati per `persona_id`): la registrazione nel compendio, l'aggiunta alla scorta e l'obiettivo che chiude. */
const EVENTI_DELLA_PERSONA: Record<string, readonly string[] | undefined> = {
  persona: ['compendio-registrata'], [TIPO_SCORTA]: ['persona-aggiunta', 'obiettivo-raggiunto'],
};

/**
 * Togliere la spunta: ogni effetto di stato che la spunta aveva segnato torna com'era; ciò che c'era già resta. Restituisce gli avvisi da
 * mostrare a chi toglie la spunta (un esemplare in scorta modificato dopo, che resta).
 */
export function annullaEffettiDiStato(p: number, voceUid: string): string[] {
  const righe = (prepared('SELECT effetto_uid, tipo, chiave, prima_json FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ?').all(p, voceUid) as Array<{ effetto_uid: string; tipo: string; chiave: string; prima_json: string }>)
    // la scorta per prima: se il suo esemplare resta (modificato dopo), la Persona resta anche nel compendio
    .sort((a, b) => Number(b.tipo === TIPO_SCORTA) - Number(a.tipo === TIPO_SCORTA));
  const avvisi: string[] = [];
  const restanoInScorta = new Set<string>();
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
        const eventiPersona = EVENTI_DELLA_PERSONA[r.tipo];
        if (erede && eventiPersona) prepared(`UPDATE utente.evento_partita SET voce_uid = ? WHERE partita_id = ? AND voce_uid = ? AND persona_id = ? AND tipo IN (${eventiPersona.map(() => '?').join(', ')})`)
          .run(erede.voce_uid, p, voceUid, Number(r.chiave), ...eventiPersona);
      }
    } else if (r.tipo === TIPO_SCORTA) {
      const avviso = togliDallaScorta(p, voceUid, Number(r.chiave), prima as PrimaScorta);
      if (avviso) { avvisi.push(avviso); restanoInScorta.add(r.chiave); }
    } else if (!prima.gia) {
      if (r.tipo === 'persona' && restanoInScorta.has(r.chiave)) {
        // l'esemplare resta in scorta: la Persona resta registrata (ottenerla la registra), e l'evento della registrazione resta nello storico
        prepared("UPDATE utente.evento_partita SET voce_uid = NULL WHERE partita_id = ? AND voce_uid = ? AND persona_id = ? AND tipo = 'compendio-registrata'").run(p, voceUid, Number(r.chiave));
      } else {
        const e: EffettoDiStatoVoce = r.tipo === 'storia' ? { tipo: 'storia', evento: r.chiave } : r.tipo === 'domanda' ? { tipo: 'domanda', domanda: Number(r.chiave) }
          : r.tipo === 'cruciverba' ? { tipo: 'cruciverba', data: r.chiave } : r.tipo === 'articolo' ? { tipo: 'articolo', articolo: r.chiave } : r.tipo === 'invito' ? { tipo: 'invito', invito: r.chiave } : r.tipo === 'persona' ? { tipo: 'persona', persona: Number(r.chiave) }
            : r.tipo === 'trofeo' ? { tipo: 'trofeo', trofeo: r.chiave }
            : r.tipo === 'sblocco' ? { tipo: 'sblocco', bersaglio: r.chiave.startsWith('richiesta:') ? 'richiesta' : 'attivita', chiave: r.chiave.slice(r.chiave.indexOf(':') + 1) }
            : { tipo: 'richiesta', richiesta: r.chiave };
        // l'oggetto potrebbe non esserci più (guida cambiata): non si ferma l'annullo della spunta
        try { scrivi(p, e, false, prima.stato ?? null, voceUid); } catch (err) { if (!(err instanceof Error) || !/non-trovat|non esiste|Nessun/i.test(`${(err as { code?: string }).code ?? ''} ${err.message}`)) throw err; }
      }
    }
    prepared('DELETE FROM utente.effetto_stato_voce WHERE partita_id = ? AND voce_uid = ? AND effetto_uid = ?').run(p, voceUid, r.effetto_uid);
  }
  return avvisi;
}
