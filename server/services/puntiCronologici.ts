// ============================================================
// puntiCronologici — i punti dei Confidenti in ordine cronologico del Diario, «solo da oggi» (R10-11c, R10-11f)
// ============================================================
//
// Decisione dell'utente: i valori di oggi (rango e punti) sono la BASE e non si riscrivono. Gli eventi NUOVI che il Diario dà a un Confidente — le note
// di una risposta (punti) e il passaggio di rango spuntato — si ricordano in `punti_confidente_voce` con la loro chiave d'ordine (data di gioco, fascia,
// ordine della voce nella giornata, ordine dentro la voce: prima il passaggio, poi le note) e i parametri del calcolo. Se un evento viene DOPO tutti
// gli altri si applica come sempre; se viene PRIMA di altri già applicati, o se una spunta si toglie, si rifà il calcolo dalla base della generazione
// corrente (`punti_confidente_generazione`), rigiocando gli eventi nell'ordine: stessa aritmetica del motore (`partiteService.aggiornaConfidente`:
// punti solo dove il rango sale a punti, riporto dell'eccedenza sulla soglia al passaggio), quindi ricalcolare da zero dà lo stesso risultato
// dell'applicazione passo per passo.
// La correzione a mano è prioritaria: la pagina Confidenti e i regali aprono una NUOVA generazione con la base uguale ai valori di quel momento; gli
// eventi delle generazioni precedenti non si ricalcolano più (la loro spunta si toglie col vecchio annullo, dalla ricevuta). Le spunte già date prima
// di questa regola non hanno eventi nel registro: restano com'erano.
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';
import { puntiConfidente as puntiDelModulo, type PiazzamentoEsame } from '../../shared/puntiConfidenti.js';
import type { ConfidentePartitaDto, EffettiAzioneDto } from '../../shared/types.js';
import { aggiornaConfidente, confidente as leggiConfidente, sogliaAPunti } from './partiteService.js';
import { registraEvento } from './storicoService.js';

export interface ParametriPunti { noteRisposta: 1 | 2 | 3; bonusArcano: boolean; invito: boolean; piazzamento: PiazzamentoEsame | null }
interface PosizioneNelDiario { voceUid: string; data: string; fascia: string; ordineVoce: number }
/** Un evento del Diario per un Confidente: le note di una risposta o il passaggio a un rango più alto. */
export type EventoDiario =
  | (PosizioneNelDiario & { tipo: 'punti'; parametri: ParametriPunti })
  | (PosizioneNelDiario & { tipo: 'passaggio'; verso: number });

interface Stato { sbloccato: number; rango: number; punti: number }
const round2 = (n: number): number => Math.round(n * 100) / 100;

const statoDi = (p: number, chiave: string): Stato =>
  (prepared('SELECT sbloccato, rango, punti FROM utente.confidente_partita WHERE partita_id = ? AND confidente_chiave = ?').get(p, chiave) as Stato | undefined) ?? { sbloccato: 0, rango: 0, punti: 0 };

/** La chiave d'ordine: data di gioco, fascia (giorno prima della sera), ordine della voce, e dentro la voce il passaggio prima delle note. */
function ordineDi(e: EventoDiario): [number, number, number, number] {
  return [ordineGioco(e.data), e.fascia === 'sera' ? 1 : 0, e.ordineVoce, e.tipo === 'passaggio' ? 0 : 1];
}

/** Rifà le chiavi d'ordine delle righe del Confidente dalla posizione di adesso delle voci (una voce può essere stata spostata di giorno, fascia o posto). */
function rinfrescaChiavi(p: number, chiave: string): void {
  const righe = prepared('SELECT id, voce_uid, tipo, o_data, o_fascia, o_voce, o_sub FROM utente.punti_confidente_voce WHERE partita_id = ? AND confidente_chiave = ?')
    .all(p, chiave) as Array<{ id: number; voce_uid: string; tipo: 'punti' | 'passaggio'; o_data: number; o_fascia: number; o_voce: number; o_sub: number }>;
  for (const r of righe) {
    const v = prepared('SELECT data, fascia, ordine FROM main.voce_giornata WHERE uid = ?').get(r.voce_uid) as { data: string; fascia: string; ordine: number } | undefined;
    if (!v) continue;
    const [d, f, o, s] = [ordineGioco(v.data), v.fascia === 'sera' ? 1 : 0, v.ordine, r.tipo === 'passaggio' ? 0 : 1];
    if (d !== r.o_data || f !== r.o_fascia || o !== r.o_voce || s !== r.o_sub) prepared('UPDATE utente.punti_confidente_voce SET o_data = ?, o_fascia = ?, o_voce = ?, o_sub = ? WHERE id = ?').run(d, f, o, s, r.id);
  }
}

/**
 * La voce ha cambiato giorno, fascia o posto (R10-11f «cambiarne i campi»): le chiavi d'ordine dei suoi eventi si rifanno e i Confidenti toccati si
 * ricalcolano dalla base nel nuovo ordine. Solo gli eventi della generazione corrente; senza eventi non fa niente. Va chiamata nella transazione.
 */
export function riallineaVoceNelRegistro(voceUid: string): void {
  const righe = prepared(`SELECT DISTINCT v.partita_id, v.confidente_chiave FROM utente.punti_confidente_voce v
    JOIN utente.punti_confidente_generazione g ON g.partita_id = v.partita_id AND g.confidente_chiave = v.confidente_chiave AND g.generazione = v.generazione WHERE v.voce_uid = ?`)
    .all(voceUid) as Array<{ partita_id: number; confidente_chiave: string }>;
  for (const r of righe) ricalcola(r.partita_id, r.confidente_chiave);
}

/** La generazione corrente del Confidente nella partita; se non c'è si apre adesso, con la base uguale ai valori di questo momento. */
function generazioneCorrente(p: number, chiave: string): number {
  const g = prepared('SELECT generazione FROM utente.punti_confidente_generazione WHERE partita_id = ? AND confidente_chiave = ?').get(p, chiave) as { generazione: number } | undefined;
  if (g) return g.generazione;
  const s = statoDi(p, chiave);
  prepared('INSERT INTO utente.punti_confidente_generazione (partita_id, confidente_chiave, generazione, rango_base, punti_base, sbloccato_base, creata_il) VALUES (?, ?, 1, ?, ?, ?, ?)')
    .run(p, chiave, s.rango, s.punti, s.sbloccato, nowIso());
  return 1;
}

/**
 * Applica un evento del Diario: lo ricorda nel registro e, se non ci sono eventi successivi nella stessa generazione, lo applica come sempre
 * (`aggiornaConfidente`); se ce ne sono, rifà il calcolo dalla base in ordine cronologico. Va chiamata nella transazione della spunta.
 */
export function applicaEventoDiario(partitaId: number, chiave: string, e: EventoDiario): ConfidentePartitaDto {
  const generazione = generazioneCorrente(partitaId, chiave);
  rinfrescaChiavi(partitaId, chiave);
  const [d, f, v, s] = ordineDi(e);
  const successivi = (prepared(`SELECT COUNT(*) AS n FROM utente.punti_confidente_voce WHERE partita_id = ? AND confidente_chiave = ? AND generazione = ?
    AND (o_data, o_fascia, o_voce, o_sub) > (?, ?, ?, ?)`).get(partitaId, chiave, generazione, d, f, v, s) as { n: number }).n;
  prepared(`INSERT INTO utente.punti_confidente_voce (partita_id, confidente_chiave, voce_uid, generazione, tipo, o_data, o_fascia, o_voce, o_sub, parametri_json, creato_il)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(partitaId, chiave, e.voceUid, generazione, e.tipo, d, f, v, s, JSON.stringify(e.tipo === 'punti' ? e.parametri : { verso: e.verso }), nowIso());
  if (successivi > 0) return ricalcola(partitaId, chiave);
  return e.tipo === 'passaggio'
    ? aggiornaConfidente(partitaId, chiave, { rango: e.verso, forza: true }, { origine: 'diario', voce: e.voceUid })
    : aggiornaConfidente(partitaId, chiave, { noteRisposta: e.parametri.noteRisposta, bonusArcano: e.parametri.bonusArcano, ...(e.parametri.invito ? { invito: true } : {}) });
}

/** Rifà il calcolo del Confidente dalla base della generazione corrente, rigiocando gli eventi in ordine cronologico, e scrive il risultato. */
export function ricalcola(partitaId: number, chiave: string): ConfidentePartitaDto {
  const g = prepared('SELECT generazione, rango_base, punti_base, sbloccato_base FROM utente.punti_confidente_generazione WHERE partita_id = ? AND confidente_chiave = ?')
    .get(partitaId, chiave) as { generazione: number; rango_base: number; punti_base: number; sbloccato_base: number } | undefined;
  if (!g) return leggiConfidente(partitaId, chiave);
  rinfrescaChiavi(partitaId, chiave);
  const righe = prepared(`SELECT tipo, parametri_json FROM utente.punti_confidente_voce WHERE partita_id = ? AND confidente_chiave = ? AND generazione = ?
    ORDER BY o_data, o_fascia, o_voce, o_sub, id`).all(partitaId, chiave, g.generazione) as Array<{ tipo: 'punti' | 'passaggio'; parametri_json: string }>;
  let rango = g.rango_base, punti = g.punti_base;
  for (const r of righe) {
    if (r.tipo === 'passaggio') {
      const { verso } = JSON.parse(r.parametri_json) as { verso: number };
      if (verso <= rango) continue;
      // lo stesso riporto del motore: solo l'eccedenza sulla soglia di un rango che sale a punti
      let riporto = punti;
      for (let k = rango; k < verso && riporto > 0; k++) { const soglia = sogliaAPunti(chiave, k); riporto = soglia > 0 ? Math.max(0, riporto - soglia) : 0; }
      punti = round2(riporto); rango = verso;
    } else if (rango > 0 && rango < 10 && sogliaAPunti(chiave, rango) > 0) {
      const par = JSON.parse(r.parametri_json) as ParametriPunti;
      punti = round2(Math.max(0, punti + puntiDelModulo({ confidente: chiave, noteRisposta: par.noteRisposta, bonusArcano: par.bonusArcano, invito: par.invito, piazzamento: par.piazzamento })));
    }
  }
  const prima = statoDi(partitaId, chiave);
  const sbloccato = rango > 0 || g.sbloccato_base === 1 ? 1 : 0;
  if (prima.rango === rango && prima.punti === punti && prima.sbloccato === sbloccato) return leggiConfidente(partitaId, chiave);
  const adesso = nowIso();
  prepared(`INSERT INTO utente.confidente_partita (partita_id, confidente_chiave, sbloccato, rango, punti, note, updated_at) VALUES (?, ?, ?, ?, ?, '', ?)
    ON CONFLICT(partita_id, confidente_chiave) DO UPDATE SET sbloccato = excluded.sbloccato, rango = excluded.rango, punti = excluded.punti, updated_at = excluded.updated_at`)
    .run(partitaId, chiave, sbloccato, rango, punti, adesso);
  prepared('UPDATE utente.partita SET updated_at = ? WHERE id = ?').run(adesso, partitaId);
  const dopo = leggiConfidente(partitaId, chiave);
  if (sbloccato === 1 && prima.sbloccato === 0) registraEvento(partitaId, 'confidente-sbloccato', `${dopo.nome} (${dopo.arcanaNome}) sbloccato`, 'Ricalcolo in ordine cronologico del Diario.', { confidente: chiave });
  if (rango !== prima.rango) {
    registraEvento(partitaId, 'confidente-rango', `${dopo.nome} (${dopo.arcanaNome}): rango ${rango}${rango === 10 ? ' — massimo' : ''}`,
      `Da rango ${prima.rango}. Ricalcolo in ordine cronologico del Diario.`, { confidente: chiave, da: prima.rango, a: rango, origine: 'diario' });
  }
  return dopo;
}

/** Quali Confidenti ha toccato la spunta di una voce, per tipo di evento, nella generazione corrente (chi non ha eventi correnti usa il vecchio annullo). */
export type EventiTolti = Map<string, { punti: boolean; passaggio: boolean }>;

/**
 * Toglie dal registro gli eventi di una voce (la spunta tolta) e rifà il calcolo dei Confidenti toccati: i rank up non più raggiunti tornano indietro e
 * i punti dopo di loro si riassegnano al rango giusto (R10-11f). Gli eventi di generazioni precedenti si cancellano senza ricalcolo: il loro annullo è
 * quello vecchio, dalla ricevuta. Va chiamata nella transazione della spunta.
 */
export function togliEventiDellaVoce(partitaId: number, voceUid: string): EventiTolti {
  const righe = prepared('SELECT confidente_chiave, generazione, tipo FROM utente.punti_confidente_voce WHERE partita_id = ? AND voce_uid = ?')
    .all(partitaId, voceUid) as Array<{ confidente_chiave: string; generazione: number; tipo: 'punti' | 'passaggio' }>;
  if (righe.length === 0) return new Map();
  const correnti = new Map((prepared('SELECT confidente_chiave, generazione FROM utente.punti_confidente_generazione WHERE partita_id = ?').all(partitaId) as Array<{ confidente_chiave: string; generazione: number }>)
    .map((r) => [r.confidente_chiave, r.generazione]));
  const tolti: EventiTolti = new Map();
  for (const r of righe) {
    if (correnti.get(r.confidente_chiave) !== r.generazione) continue;
    const voce = tolti.get(r.confidente_chiave) ?? { punti: false, passaggio: false };
    if (r.tipo === 'punti') voce.punti = true; else voce.passaggio = true;
    tolti.set(r.confidente_chiave, voce);
  }
  prepared('DELETE FROM utente.punti_confidente_voce WHERE partita_id = ? AND voce_uid = ?').run(partitaId, voceUid);
  for (const chiave of tolti.keys()) ricalcola(partitaId, chiave);
  return tolti;
}

/**
 * La ricevuta della spunta senza ciò che il registro ha già disfatto con il ricalcolo: i punti di un Confidente (`confidente`) e il rango che il
 * passaggio aveva alzato (`incontro.rango`) non si annullano due volte. L'incontro (la Dote del passaggio, la riga) si toglie come sempre.
 */
export function senzaEventiGestiti(ricevuta: EffettiAzioneDto | null, tolti: EventiTolti): EffettiAzioneDto | null {
  if (!ricevuta || tolti.size === 0) return ricevuta;
  const copia: EffettiAzioneDto = { ...ricevuta };
  if (copia.confidente && tolti.get(copia.confidente.chiave)?.punti) copia.confidente = null;
  if (copia.incontro?.rango && tolti.get(copia.incontro.confidente)?.passaggio) { const { rango: _rango, ...resto } = copia.incontro; copia.incontro = resto; }
  return copia;
}

/** I Confidenti i cui punti o il cui rango la ricevuta disfa con il vecchio annullo (la spunta non era nel registro corrente): dopo, il loro registro riparte da lì. */
export function confidentiAnnullatiAlVecchioModo(ricevuta: EffettiAzioneDto | null, tolti: EventiTolti): string[] {
  const out = new Set<string>();
  if (ricevuta?.confidente && !tolti.get(ricevuta.confidente.chiave)?.punti) out.add(ricevuta.confidente.chiave);
  if (ricevuta?.incontro?.rango && !tolti.get(ricevuta.incontro.confidente)?.passaggio) out.add(ricevuta.incontro.confidente);
  return [...out];
}

/**
 * La correzione a mano è prioritaria: apre una nuova generazione con la base uguale ai valori di adesso (rango, punti, sblocco). Gli eventi del Diario
 * già registrati restano della generazione di prima e non si ricalcolano. Senza eventi registrati non c'è niente da fare.
 */
export function nuovaGenerazione(partitaId: number, chiave: string): void {
  if (!prepared('SELECT 1 FROM utente.punti_confidente_generazione WHERE partita_id = ? AND confidente_chiave = ?').get(partitaId, chiave)) return;
  const s = statoDi(partitaId, chiave);
  prepared('UPDATE utente.punti_confidente_generazione SET generazione = generazione + 1, rango_base = ?, punti_base = ?, sbloccato_base = ?, creata_il = ? WHERE partita_id = ? AND confidente_chiave = ?')
    .run(s.rango, s.punti, s.sbloccato, nowIso(), partitaId, chiave);
}

/**
 * Dopo il ripristino dal Cestino di una voce: il ripristino rimette la spunta e, con essa, le righe del registro, ma non è detto che abbia rimesso i
 * valori del Confidente (se nel frattempo sono cambiati a mano, restano i nuovi). Le righe senza spunta si cancellano (orfane); per le altre la base
 * riparte dai valori di adesso, e quelle righe non si ricalcolano più (la loro spunta si toglie con il vecchio annullo, dalla ricevuta). Così un
 * ricalcolo successivo non riporta mai punti che lo stato non contiene.
 */
export function riconciliaRegistroDopoRipristino(partitaId: number, uids: readonly string[]): void {
  for (const uid of uids) {
    const chiavi = (prepared('SELECT DISTINCT confidente_chiave FROM utente.punti_confidente_voce WHERE partita_id = ? AND voce_uid = ?').all(partitaId, uid) as Array<{ confidente_chiave: string }>).map((r) => r.confidente_chiave);
    if (chiavi.length === 0) continue;
    if (!prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id = ? AND voce_uid = ?').get(partitaId, uid)) {
      prepared('DELETE FROM utente.punti_confidente_voce WHERE partita_id = ? AND voce_uid = ?').run(partitaId, uid);
      continue;
    }
    for (const chiave of chiavi) nuovaGenerazione(partitaId, chiave);
  }
}

/** Gli eventi di tutte le generazioni: serve al controllo di sola lettura di chi vuole vedere il registro di una partita. */
export const eventiDelRegistro = (partitaId: number): number => (getDb().prepare('SELECT COUNT(*) AS n FROM utente.punti_confidente_voce WHERE partita_id = ?').get(partitaId) as { n: number }).n;
