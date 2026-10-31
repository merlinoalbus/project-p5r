// ============================================================
// voceDovuta — quando una voce del Diario è dovuta nella partita: le sue condizioni, allo stato della partita al giorno della voce
// ============================================================
//
// L13, ondata 9, lotto O9-3. Istruzione dell'utente del 2026-10-31: «Televendite. é possibile non venga acquistato nessun set. in tal caso
// viene meno la consegna.». Una voce può dichiarare quando si fa («Si fa solo se»: `voce_giornata.condizioni_json`, migrazione 320), con il
// vocabolario unico delle condizioni (`shared/condizioniSpillo.ts`) e il valutatore unico della disponibilità (`condizioni/valutatore.ts`),
// allo stato della partita al momento della voce (`statoAlMomento`: il giorno e la fascia della voce, tutto il resto com'è nella partita).
// Senza condizioni la voce è sempre dovuta (tutte le voci di prima).
//
// Con le condizioni false la voce è «non dovuta»: non si spunta (409 `voce-non-dovuta`), non blocca l'avanzamento della fascia e del giorno
// (`avanzaSeFasciaCompleta` la conta come fatta) e non si conta fra le cose da fare del giorno. Una voce già spuntata resta spuntata: è la
// storia della partita, e togliendo la spunta si annulla come sempre. Una condizione grigia (manca un dato alla partita) non nega la voce: si
// dice «non dovuta» solo ciò che è falso. Il legame è un dato della voce, modificabile dal suo modulo: nessun caso scritto a mano qui.
// ============================================================

import { prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { leggiCondizioniSalvate, normalizzaCondizioniSpillo, type RequisitoSpillo } from '../../shared/condizioniSpillo.js';
import { valutazione } from './condizioni/valutatore.js';
import { nomiCondizioniMemo } from './condizioni/nomiCondizioni.js';
import { statoAlMomento } from './esitiAttivitaService.js';
import { statoDisponibilitaPartita, type StatoDisponibilita } from './disponibilitaService.js';
import { condizioniDellEffetto, type EffettoVoce } from '../../shared/effettiVoce.js';

/** Quante condizioni di primo livello può avere una voce (lo stesso limite degli altri elementi con condizioni). */
export const MASSIMO_CONDIZIONI_VOCE = 20;

/** Ciò che serve di una riga di `voce_giornata` per valutarla. */
export interface RigaVoceDovuta { uid: string; data: string; fascia: string; genere: string; condizioni_json?: string | null }

/** La colonna delle condizioni c'è (dalla migrazione 320)? Le migrazioni di prima che usano i servizi girano su uno schema senza. */
export function conCondizioniVoce(): boolean {
  return !!prepared("SELECT 1 FROM pragma_table_info('voce_giornata') WHERE name = 'condizioni_json'").get();
}

/** Le condizioni della voce («Si fa solo se»), già normalizzate; vuoto = sempre dovuta. */
export function condizioniDellaVoce(r: Pick<RigaVoceDovuta, 'condizioni_json'>): RequisitoSpillo[] {
  return leggiCondizioniSalvate(r.condizioni_json ?? null);
}

/**
 * Le condizioni da salvare per una voce: undefined se non arrivano (restano com'erano), null se vuote o se la voce non è un'azione (un
 * promemoria non si spunta: niente da condizionare). 400 se una condizione non si riconosce (zod le ha già controllate una per una: qui
 * cadono solo i doppioni, che non si scartano in silenzio).
 */
export function condizioniDaSalvare(condizioni: readonly unknown[] | undefined, genere: string): string | null | undefined {
  if (condizioni === undefined) return undefined;
  if (genere !== 'azione' || condizioni.length === 0) return null;
  const valide = normalizzaCondizioniSpillo(condizioni, MASSIMO_CONDIZIONI_VOCE);
  if (valide.length !== condizioni.length) throw httpErrors.badRequest('condizioni-non-valide', 'Le condizioni «Si fa solo se» non sono valide: c’è una condizione ripetuta o non riconosciuta.');
  return JSON.stringify(valide);
}

/** «Articolo ottenuto: A oppure Articolo ottenuto: B» → «Articolo ottenuto: A o B»: lo stesso inizio si dice una volta sola. */
function fraseCompatta(frase: string): string {
  const parti = frase.split(' oppure ');
  const due = parti[0]!.indexOf(': ');
  if (parti.length < 2 || due < 0) return frase;
  const inizio = parti[0]!.slice(0, due + 2);
  if (!parti.every((p) => p.startsWith(inizio))) return frase;
  const resti = parti.map((p) => p.slice(inizio.length));
  return `${inizio}${resti.slice(0, -1).join(', ')} o ${resti[resti.length - 1]}`;
}

/** Perché la voce non è dovuta allo stato dato (la condizione che manca, in parole), o null se è dovuta (o se resta da verificare). */
function motivoNelloStato(condizioni: readonly RequisitoSpillo[], st: StatoDisponibilita): string | null {
  if (!condizioni.length) return null;
  const tutte: RequisitoSpillo = condizioni.length === 1 ? condizioni[0]! : { tipo: 'gruppo', modo: 'tutte', condizioni: [...condizioni] };
  const v = valutazione(tutte, st, nomiCondizioniMemo());
  return v.esito === 'falso' ? fraseCompatta(v.manca ?? v.testo) : null;
}

/**
 * Il valutatore delle voci di una partita: per ogni voce, il motivo per cui NON è dovuta (null = dovuta). Lo stato della partita si legge alla
 * prima voce con condizioni, una volta sola, e si porta al momento di ciascuna voce: chi non ha voci condizionate non lo paga.
 */
export function valutatoreVociDovute(partitaId: number): (r: RigaVoceDovuta) => string | null {
  let base: StatoDisponibilita | null = null;
  const perMomento = new Map<string, StatoDisponibilita>();
  return (r) => {
    if (r.genere !== 'azione') return null;
    const condizioni = condizioniDellaVoce(r);
    if (!condizioni.length) return null;
    const fascia = r.fascia === 'sera' ? 'sera' : 'giorno';
    const chiave = `${r.data}:${fascia}`;
    let st = perMomento.get(chiave);
    if (!st) { st = statoAlMomento(partitaId, { data: r.data, fascia }, base ??= statoDisponibilitaPartita(partitaId)); perMomento.set(chiave, st); }
    return motivoNelloStato(condizioni, st);
  };
}

/**
 * Gli effetti di una voce con condizioni (`condizioni` dell'effetto, `shared/effettiVoce.ts` → `CondizioniEffetto`) che NON valgono nella
 * partita: le stesse regole di «Si fa solo se» della voce (lo stesso valutatore, allo stato della partita al giorno e alla fascia della voce;
 * una condizione grigia non nega). Uid dell'effetto → che cosa manca, in parole. Lo stato si legge solo se un effetto ha condizioni, una volta
 * per partita e per momento: chi non ne ha non lo paga. Lo usano la spunta, il salvataggio degli effetti di una voce già spuntata, l'elenco del
 * passato e la lettura della voce nella partita.
 */
export function valutatoreEffettiCondizionati(partitaId: number): (voce: { data: string; fascia: string }, effetti: ReadonlyArray<{ uid: string; effetto: EffettoVoce }>) => Map<string, string> {
  let base: StatoDisponibilita | null = null;
  const perMomento = new Map<string, StatoDisponibilita>();
  return (v, effetti) => {
    const out = new Map<string, string>();
    for (const { uid, effetto } of effetti) {
      const condizioni = condizioniDellEffetto(effetto);
      if (!condizioni.length) continue;
      const fascia = v.fascia === 'sera' ? 'sera' : 'giorno';
      const chiave = `${v.data}:${fascia}`;
      let st = perMomento.get(chiave);
      if (!st) { st = statoAlMomento(partitaId, { data: v.data, fascia }, base ??= statoDisponibilitaPartita(partitaId)); perMomento.set(chiave, st); }
      const motivo = motivoNelloStato(condizioni, st);
      if (motivo) out.set(uid, motivo);
    }
    return out;
  };
}

/** Come `valutatoreEffettiCondizionati`, per una voce sola (la voce si legge dal file di gioco). Vuoto se nessun effetto ha condizioni. */
export function effettiFuoriCondizione(partitaId: number, voceUid: string, effetti: ReadonlyArray<{ uid: string; effetto: EffettoVoce }>): Map<string, string> {
  if (!effetti.some((e) => condizioniDellEffetto(e.effetto).length)) return new Map();
  const v = prepared('SELECT data, fascia FROM voce_giornata WHERE uid = ?').get(voceUid) as { data: string; fascia: string } | undefined;
  return v ? valutatoreEffettiCondizionati(partitaId)(v, effetti) : new Map();
}

/** La frase per chi vede un effetto con condizioni che nella partita non vale. */
export const fraseEffettoFuoriCondizione = (motivo: string): string => `vale solo con «${motivo}», che in questa partita manca`;

/** La frase per chi prova a spuntare una voce non dovuta, la stessa del 409. */
export const fraseNonDovuta = (motivo: string): string => `Questa voce non è dovuta nella partita: manca «${motivo}».`;

/** 409 `voce-non-dovuta` se la voce, nella partita, non è dovuta (con il motivo). */
export function verificaVoceDovuta(partitaId: number, r: RigaVoceDovuta): void {
  const motivo = valutatoreVociDovute(partitaId)(r);
  if (motivo) throw httpErrors.conflict('voce-non-dovuta', fraseNonDovuta(motivo), { motivo });
}

/** Le voci (fra quelle date) non dovute nella partita e non spuntate: per l'avanzamento valgono come fatte. */
export function vociNonDovute(partitaId: number, righe: readonly RigaVoceDovuta[], fatte: ReadonlySet<string> | ReadonlyMap<string, unknown>): Set<string> {
  const valuta = valutatoreVociDovute(partitaId);
  return new Set(righe.filter((r) => !fatte.has(r.uid) && valuta(r) !== null).map((r) => r.uid));
}

/** Per l'indice dei giorni: quante azioni non spuntate e non dovute ha ogni giorno (non sono cose da fare). Solo le voci con condizioni. */
export function nonDovutePerGiorno(partitaId: number): Map<string, number> {
  const out = new Map<string, number>();
  if (!conCondizioniVoce()) return out;
  const righe = prepared(`SELECT v.uid, v.data, v.fascia, v.genere, v.condizioni_json FROM voce_giornata v
    LEFT JOIN spunta_voce_partita s ON s.voce_uid = v.uid AND s.partita_id = ?
    WHERE v.genere = 'azione' AND v.condizioni_json IS NOT NULL AND s.voce_uid IS NULL`).all(partitaId) as RigaVoceDovuta[];
  if (!righe.length) return out;
  const valuta = valutatoreVociDovute(partitaId);
  for (const r of righe) if (valuta(r) !== null) out.set(r.data, (out.get(r.data) ?? 0) + 1);
  return out;
}
