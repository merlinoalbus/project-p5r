// ============================================================
// semaforiService — semafori dei requisiti per rango dei Confidenti (Fase 12.3)
// ============================================================
//
// Ogni requisito del seed viene valutato sullo stato della partita: Doti (rango), Persona dell'arcano in scorta, Persona con una
// skill precisa in scorta (Gemelle Custodi), Palazzo (concluso: Tesoro del Palazzo raccolto e boss finale sconfitto, insieme — dal
// 2026-10-20 la raccolta al 100% vale solo per l'anello, §8.10 — `palazziService.statoPalazzi`, che dice anche cosa manca; mai grigio), richiesta dei Mementos completata, rango di un altro Confidente, data di gioco corrente,
// meteo del giorno corrente, evento di storia segnato nella partita (il caffè al Leblanc, il duello con Akechi: Partita →
// Progressi); le avvertenze («avviso») sono grigie ma non bloccano il rango (`bloccante: false`).
// L6 (§1, §2): un requisito è una condizione del vocabolario unico e si valuta col valutatore unico (`condizioni/valutatore.ts`,
// letto «come requisito»); niente più requisiti «manuali» né conferme a mano (R6-01b).
// ============================================================

import { getDb, nowIso, prepared } from '../db/dbService.js';
// quando un Palazzo è concluso lo decide `palazziService` (Tesoro e boss finale: mai la data)
import { statoPalazzi } from './palazziService.js';
import { EVENTI_STORIA, condizioneConTesto, dataLeggibile, normalizzaRequisitoSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { EVENTI_PESCA } from '../../shared/pesca.js';
import { leggiFattiPesca } from './pescaLetture.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { piove, type MeteoPartita } from '../../shared/meteoPartita.js';
import { eGiornoFestivo, giornoDellUltimoRango, giorniDalGiorno, verdettoDelConfidente, type StatoDelRamo } from './disponibilitaStrutturataService.js';
import { meteoOra } from './meteoService.js';
import { relazioneAlRango, relazioneRomantica, relazioniConGiorno } from './relazioneRomanticaService.js';
export { dataLeggibile };
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { valutaCondizione, type StatoValutazione } from './condizioni/valutatore.js';
import type { RequisitoRango, SemaforiRangoDto, SemaforoRequisitoDto } from '../../shared/types.js';

export interface RigaRequisito { confidente_chiave: string; rango: number; indice: number; tipo: RequisitoRango['tipo']; dati_json: string; testo: string }

/** Stato della partita letto una volta per tutti i Confidenti. */
export interface StatoPartitaSemafori {
  fattiPesca?: Map<string, 'avvenuto'|'non-avvenuto'|'ignoto'>;
  contestoPesca?: import('../../shared/pesca.js').OsservazionePesca;
  doti: Map<string, number>;
  arcaniInScorta: Set<string>;
  /** Coppie «persona|abilità» (minuscole) presenti nella scorta: per i requisiti scritti per nome (pacchetti di prima). */
  personeConAbilita: Set<string>;
  /** I Palazzi conclusi nella partita (Tesoro e boss finale, §8.10), con il perché (vedi `palazziConclusi`): i requisiti e le
   *  condizioni «Completare il Palazzo», gli ingressi e la mappa di Tokyo seguono questo livello, non il 100% della raccolta. */
  palazziConclusi: Map<string, string>;
  /** Che cosa manca ai Palazzi non conclusi (`statoPalazzi.mancaPerConcludere`): per dirlo nel requisito. Assente = si dicono le due condizioni. */
  palazziMancanze?: Map<string, string>;
  richiesteCompletate: Set<string>;
  /** Le Richieste che esistono nel file di gioco, per chiave e per nome in minuscolo: una citata che non c'è più (eliminata,
   *  2026-10-11) è un requisito da correggere, grigio, non una Richiesta «non completata». Assente = non si controlla. */
  richiesteEsistenti?: Set<string>;
  /** Il nome di ogni Richiesta per chiave: un requisito che la cita per chiave (dopo un cambio di nome o una correzione, 2026-10-11)
   *  la mostra col suo nome. Assente = si mostra quel che cita. */
  nomiRichieste?: Map<string, string>;
  ranghiConfidenti: Map<string, number>;
  /** I Ladri che hai detto di avere nel gruppo. */
  membriSquadra: Set<string>;
  /** Quelli che hai detto di **non** avere: e' una risposta, e vale rosso invece che grigio. */
  membriFuoriSquadra: Set<string>;
  dataGioco: string | null;
  /** Momento della giornata corrente della partita (scheda «Oggi»): «giorno» o «sera». */
  fasciaGioco: 'giorno' | 'sera' | null;
  /** Il meteo del giorno corrente **nella fascia corrente**: segnato nella partita o, se no, della guida (`meteoService.meteoOra`). */
  meteoOra: { meteo: MeteoPartita; origine: 'partita' | 'guida' } | null;
  /** L6: le coppie «id Persona|id abilità» della scorta (le condizioni `persona-abilita` per chiave, R6-03). */
  personeConAbilitaId?: Set<string>;
  /** L6: gli inviti dei Confidenti registrati nella partita (`utente.invito_partita`): le condizioni `invito`. */
  invitiRegistrati?: Set<string>;
  /** L13: gli sblocchi ricevuti nella partita da una voce spuntata (`utente.sblocco_partita`), come «richiesta:chiave» o «attivita:chiave». */
  sblocchiRicevuti?: Set<string>;
  /** Gli eventi segnati a mano nella partita: i requisiti `evento` li leggono (le aperture dei Dedali no: si calcolano, migrazione 305). */
  eventi: Set<string>;
  /** Non più letto (R6-01b: niente conferme a mano); `requisito_partita` è stata tolta (utente 44). */
  conferme?: Set<string>;
  /** La partita dello stato: il semaforo della disponibilità legge da qui il giorno dell'ultimo rango (registro degli incontri). Assente = non si sa. */
  partitaId?: number;
  /** L13 (O11-1, risposta dell'utente «Sì, in automatico»): le relazioni romantiche della partita con il giorno d'inizio (null = non registrato),
   *  dal punto unico `relazioniConGiorno`; le leggono le condizioni `relazione-romantica` e `relazioni-romantiche`. Assente = nessuna relazione. */
  relazioniRomantiche?: ReadonlyMap<string, string | null>;
}

/** Lo stato della partita che serve ai semafori: ranghi e Doti li passa chi chiama; qui si leggono arcani in scorta,
 *  coppie Persona|abilità (per id, e per nome in minuscolo), Richieste completate (per chiave e per nome in minuscolo), Palazzi conclusi,
 *  data e fascia di gioco (fascia «giorno» se non è «sera»), meteo del momento, membri della squadra dentro e fuori, eventi di storia
 *  avvenuti e inviti registrati. */
export function statoPartitaSemafori(partitaId: number, ranghiConfidenti: Map<string, number>, doti: Map<string, number>): StatoPartitaSemafori {
  const arcani = new Set((prepared('SELECT DISTINCT p.arcana FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id WHERE pp.partita_id = ?').all(partitaId) as Array<{ arcana: string }>).map((r) => r.arcana));
  const scorta = prepared(`SELECT p.id AS persona_id, s.id AS abilita_id, p.nome AS persona, s.nome AS abilita FROM persona_posseduta pp JOIN persona p ON p.id = pp.persona_id
    JOIN persona_posseduta_skill ps ON ps.posseduta_id = pp.id JOIN skill s ON s.id = ps.skill_id WHERE pp.partita_id = ?`).all(partitaId) as Array<{ persona_id: number; abilita_id: number; persona: string; abilita: string }>;
  const abilita = new Set(scorta.map((r) => `${r.persona.toLowerCase()}|${r.abilita.toLowerCase()}`));
  const personeConAbilitaId = new Set(scorta.map((r) => `${r.persona_id}|${r.abilita_id}`));
  const tutteLeRichieste = prepared('SELECT chiave, nome FROM richiesta').all() as Array<{ chiave: string; nome: string }>;
  const richiesteEsistenti = new Set(tutteLeRichieste.flatMap((r) => [r.chiave, r.nome.toLowerCase()]));
  const nomiRichieste = new Map(tutteLeRichieste.map((r) => [r.chiave, r.nome]));
  const richieste = new Set((prepared("SELECT rp.richiesta_chiave, r.nome FROM richiesta_partita rp JOIN richiesta r ON r.chiave = rp.richiesta_chiave WHERE rp.partita_id = ? AND rp.stato = 'completata'").all(partitaId) as Array<{ richiesta_chiave: string; nome: string }>).flatMap((r) => [r.richiesta_chiave, r.nome.toLowerCase()]));
  const partita = prepared('SELECT data_gioco, fascia_gioco FROM partita WHERE id = ?').get(partitaId) as { data_gioco: string | null; fascia_gioco: string | null } | undefined;
  const dataGioco = partita?.data_gioco ?? null;
  const fasciaGioco = partita ? (partita.fascia_gioco === 'sera' ? 'sera' : 'giorno') : null;
  // L6: gli inviti registrati (la tabella nasce con la migrazione utente 025: su uno schema di prima nessun invito)
  const conInviti = !!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'invito_partita'").get();
  const invitiRegistrati = new Set(conInviti ? (prepared('SELECT invito_chiave FROM invito_partita WHERE partita_id = ?').all(partitaId) as Array<{ invito_chiave: string }>).map((r) => r.invito_chiave) : []);
  // L13: gli sblocchi (la tabella nasce con la migrazione utente 046: su uno schema di prima nessuno sblocco)
  const sblocchiRicevuti = new Set(sblocchiDellaPartita(partitaId));
  // Chi e' in squadra: i Ladri con l'interruttore «In squadra» acceso (`in_squadra = 1`), e chi e' fuori quelli con
  // l'interruttore spento. **L'interruttore, non la presenza della riga.** Prima bastava avere segnato un livello (la riga
  // nasce li') perche' il Ladro risultasse in squadra: si accendeva per sbaglio e non si poteva spegnere.
  const membriSquadra = new Set((prepared('SELECT personaggio_chiave FROM membro_squadra_partita WHERE partita_id = ? AND in_squadra = 1').all(partitaId) as Array<{ personaggio_chiave: string }>).map((r) => r.personaggio_chiave));
  const membriFuoriSquadra = new Set((prepared('SELECT personaggio_chiave FROM membro_squadra_partita WHERE partita_id = ? AND in_squadra = 0').all(partitaId) as Array<{ personaggio_chiave: string }>).map((r) => r.personaggio_chiave));
  // gli eventi segnati a mano (Partita → Progressi, «Condizione soddisfatta»); le aperture dei Dedali le calcola il valutatore (305)
  const eventi = new Set((prepared('SELECT evento_chiave FROM evento_storia_partita WHERE partita_id = ? AND avvenuto = 1').all(partitaId) as Array<{ evento_chiave: string }>).map((r) => r.evento_chiave));
  const fattiPesca=new Map(leggiFattiPesca(partitaId,dataGioco&&fasciaGioco?{giorno:dataGioco,fascia:fasciaGioco,ordineVisita:Number.MAX_SAFE_INTEGER}:undefined,true).map(f=>[f.evento,f.valore]));
  // i Palazzi letti una volta: conclusi (Tesoro e boss finale, §8.10) col perché, gli altri con quel che manca al furto
  const palazzi = statoPalazzi(partitaId);
  // un Palazzo con la regola del boss dei Memento (Iweleth, §8.15) non entra negli effetti di Palazzo
  const palazziConclusi = new Map([...palazzi].flatMap(([k, s]) => (s.concluso && !s.senzaEffetti ? [[k, s.concluso] as [string, string]] : [])));
  const palazziMancanze = new Map([...palazzi].flatMap(([k, s]) => (s.mancaPerConcludere && !s.senzaEffetti ? [[k, s.mancaPerConcludere] as [string, string]] : [])));
  return { partitaId, doti, arcaniInScorta: arcani, personeConAbilita: abilita, personeConAbilitaId, palazziConclusi, palazziMancanze, richiesteCompletate: richieste, richiesteEsistenti, nomiRichieste, ranghiConfidenti, membriSquadra, membriFuoriSquadra, dataGioco, fasciaGioco, meteoOra: meteoOra(partitaId, dataGioco, fasciaGioco), eventi, invitiRegistrati, sblocchiRicevuti, fattiPesca,
    relazioniRomantiche: relazioniConGiorno(partitaId) };
}

/** Le chiavi degli sblocchi ricevuti nella partita («richiesta:chiave», «attivita:chiave»); vuoto se lo schema non ha ancora la tabella. */
export function sblocchiDellaPartita(partitaId: number): string[] {
  if (!prepared("SELECT 1 FROM utente.sqlite_master WHERE type = 'table' AND name = 'sblocco_partita'").get()) return [];
  return (prepared("SELECT bersaglio_tipo || ':' || bersaglio_chiave AS k FROM utente.sblocco_partita WHERE partita_id = ?").all(partitaId) as Array<{ k: string }>).map((r) => r.k);
}

// L'ordine del calendario di gioco e i nomi dei Palazzi vengono da `shared/condizioniSpillo.ts`: qui erano riscritti a mano
// (rilievo R2 della verifica completa, 2026-10-03).

/** La condizione di una riga di `confidente_requisito`: il tipo con i suoi dati (un avviso prende la frase della riga). Null per una riga
 *  che non è una condizione del vocabolario (un dato danneggiato). */
export function condizioneDelRequisito(r: Pick<RigaRequisito, 'tipo' | 'dati_json' | 'testo'>): RequisitoSpillo | null {
  let dati: Record<string, unknown>;
  try { dati = JSON.parse(r.dati_json) as Record<string, unknown>; } catch { return null; }
  if (r.tipo === 'avviso') return { tipo: 'avviso', testo: typeof dati.testo === 'string' && dati.testo.trim() ? dati.testo : r.testo };
  return normalizzaRequisitoSpillo({ ...dati, tipo: r.tipo });
}

/**
 * Il semaforo di un requisito di rango sullo stato della partita, col valutatore unico (letto «come requisito»: un evento non segnato è
 * «da segnare»): per tipo dice verde o rosso con il dettaglio di che cosa manca; gli avvisi non bloccano.
 */
export function valuta(r: RigaRequisito, st: StatoValutazione): SemaforoRequisitoDto {
  const c = condizioneDelRequisito(r);
  if (!c) return { indice: r.indice, tipo: r.tipo, testo: r.testo, confermato: false, stato: 'grigio', dettaglio: 'Requisito non leggibile: correggilo dalla pagina del Confidente', manuale: false };
  const nomi = nomiCondizioniMemo();
  return valutaCondizione(condizioneConTesto(c, nomi), r.indice, st, { comeRequisito: true, nomi });
}

/** Lo stato di una condizione sullo stato della partita, col valutatore unico letto «come requisito»: lo usa la disponibilità per i rami di un
 *  requisito «almeno una» con la pioggia (L13, ondata 8, migrazione 317), così semafori, scheda e requisiti dicono la stessa cosa. */
export function valutatoreDelloStato(st: StatoValutazione): StatoDelRamo {
  return (c) => {
    const nomi = nomiCondizioniMemo();
    return valutaCondizione(condizioneConTesto(c, nomi), 0, st, { comeRequisito: true, nomi }).stato;
  };
}

/** Il requisito conta per sapere se il rango è raggiungibile: le avvertenze no. */
export const requisitoBloccante = (r: SemaforoRequisitoDto): boolean => r.bloccante !== false;

/** Semafori dei ranghi superiori a `rangoAttuale` per un Confidente. */
export function semaforiConfidente(chiave: string, rangoAttuale: number, st: StatoValutazione): SemaforiRangoDto[] {
  const righe = prepared('SELECT * FROM confidente_requisito WHERE confidente_chiave = ? AND rango > ? ORDER BY rango, indice').all(chiave, rangoAttuale) as RigaRequisito[];
  const perRango = new Map<number, RigaRequisito[]>();
  for (const r of righe) { const l = perRango.get(r.rango) ?? []; l.push(r); perRango.set(r.rango, l); }
  const disponibilita = semaforoDisponibilita(chiave, rangoAttuale, st);
  return [...perRango.entries()].map(([rango, lista]) => {
    const requisiti = lista.map((r) => valuta(r, st));
    // la disponibilità d'adesso riguarda il prossimo incontro (rango + 1, non il primo rango che ha requisiti): in coda, e non blocca mai (R9-01)
    if (rango === rangoAttuale + 1 && disponibilita) requisiti.push(disponibilita);
    return { rango, requisiti, pronto: requisiti.filter(requisitoBloccante).every((q) => q.stato === 'verde') };
  });
}

/**
 * R9-01: il semaforo del giorno e della fascia dell'incontro, dalla disponibilità strutturata (stessa regola della scheda e degli avvisi del Diario;
 * i requisiti di sblocco e di rango stanno nei semafori accanto): verde se nel giorno e nella fascia della partita il Confidente c'è, rosso se non c'è, grigio se manca un dato (meteo, giorno dell'ultimo rango) o se
 * l'incontro non dipende dal calendario (su messaggio, con la trama). Non è mai bloccante. Senza una data di gioco non c'è.
 */
function semaforoDisponibilita(chiave: string, rangoAttuale: number, st: StatoValutazione): SemaforoRequisitoDto | null {
  if (!st.dataGioco) return null;
  // la pioggia la legge il verdetto dai requisiti del rango successivo (fonte unica, migrazione 306; i rami «almeno una» sullo stato della partita,
  // 317); i giorni dall'ultimo rango dal registro degli incontri
  const esito = verdettoDelConfidente(chiave, {
    data: st.dataGioco, fascia: st.fasciaGioco ?? 'giorno', festivo: eGiornoFestivo(st.dataGioco),
    piove: st.meteoOra ? piove(st.meteoOra.meteo) : null, rango: rangoAttuale,
    giorniDallUltimoRango: st.partitaId === undefined ? null : giorniDalGiorno(giornoDellUltimoRango(st.partitaId, chiave, rangoAttuale), st.dataGioco),
    // L13 (O10-2): la relazione romantica della partita, dal punto unico, per l'incontro successivo (senza partita non la sappiamo)
    relazioneRomantica: relazioneAlRango(st.partitaId === undefined ? null : relazioneRomantica(st.partitaId, chiave), rangoAttuale + 1),
  }, valutatoreDelloStato(st));
  if (!esito) return null;
  return { indice: 900, tipo: 'disponibilita', testo: 'Giorno e fascia dell’incontro', stato: esito.stato === 'disponibile' ? 'verde' : esito.stato === 'non-disponibile' ? 'rosso' : 'grigio',
    dettaglio: esito.motivo, manuale: false, confermato: false, bloccante: false };
}

/** Segna (o toglie) un evento di storia della partita: lo stesso dato dell'interruttore di Partita → Progressi. */
export function impostaEventoStoria(partitaId: number, evento: string, avvenuto: boolean): void {
  if(EVENTI_PESCA.includes(evento as typeof EVENTI_PESCA[number]))throw httpErrors.conflict('pesca-fatto-dedicato','Questo fatto usa fonti temporali nel registro della pesca, distinguendo ignoto e falso.');  prepared('INSERT INTO evento_storia_partita (partita_id, evento_chiave, avvenuto, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(partita_id, evento_chiave) DO UPDATE SET avvenuto = excluded.avvenuto, updated_at = excluded.updated_at').run(partitaId, evento, avvenuto ? 1 : 0, nowIso());
}

/** «Condizione soddisfatta» di un requisito `evento`: segna l'evento della partita, così il Confidente e Partita → Progressi dicono la
 *  stessa cosa. Gli altri tipi non si confermano a mano (R6-01b: niente conferme manuali; li dice lo stato della partita). */
export function confermaRequisito(partitaId: number, chiave: string, rango: number, indice: number, confermato: boolean): void {
  verificaPartita(partitaId);
  const riga = prepared('SELECT tipo, dati_json FROM confidente_requisito WHERE confidente_chiave = ? AND rango = ? AND indice = ?').get(chiave, rango, indice) as { tipo: string; dati_json: string } | undefined;
  if (!riga) throw httpErrors.notFound('requisito-non-trovato', 'Requisito non trovato.');
  if (riga.tipo === 'avviso') throw httpErrors.badRequest('requisito-non-confermabile', 'È un\'avvertenza da controllare nel gioco: non blocca il rango e non si conferma.');
  if (riga.tipo !== 'evento') throw httpErrors.badRequest('requisito-non-confermabile', 'Questo requisito lo dice lo stato della partita: non si conferma a mano.');
  const evento = String((JSON.parse(riga.dati_json) as { evento?: unknown }).evento ?? '');
  if (!EVENTI_STORIA.some((e) => e.chiave === evento)) throw httpErrors.notFound('evento-non-trovato', 'Evento di storia non trovato.');
  getDb().transaction(() => {
    impostaEventoStoria(partitaId, evento, confermato);
    prepared('UPDATE partita SET updated_at = ? WHERE id = ?').run(nowIso(), partitaId);
  })();
}

/** Per ogni evento di storia, i ranghi dei Confidenti che lo chiedono («Sojiro Sakura, rango 3»). */
export function ranghiPerEvento(): Map<string, string[]> {
  const righe = prepared(`SELECT r.rango, r.dati_json, c.nome FROM confidente_requisito r JOIN confidente c ON c.chiave = r.confidente_chiave
    WHERE r.tipo = 'evento' ORDER BY c.ordine, r.rango`).all() as Array<{ rango: number; dati_json: string; nome: string }>;
  const out = new Map<string, string[]>();
  for (const r of righe) {
    const evento = String((JSON.parse(r.dati_json) as { evento?: unknown }).evento ?? '');
    const l = out.get(evento) ?? [];
    l.push(`${r.nome}, rango ${r.rango}`);
    out.set(evento, l);
  }
  return out;
}
