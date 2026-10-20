// ============================================================
// orariNegozio — quando un negozio è aperto, come valori e non come frase
// ============================================================
//
// La colonna `negozio.orari` portava ventuno frasi diverse per dire poche cose: i giorni della
// settimana, la fascia (giorno o sera), la chiusura con la pioggia. Da qui in poi gli orari sono un
// oggetto (`orari_json`, migrazione 069): liste vuote vogliono dire «sempre», e `nota` conserva ciò
// che la guida dice e l'app non sa valutare («in date specifiche del calendario»). Le condizioni di
// presenza che ne derivano (`orariComeCondizioni`) sono quelle che il visore già valuta.
// ============================================================

import { GIORNI_SETTIMANA, type RequisitoSpillo } from './condizioniSpillo.js';
import { congiunzione } from './testo.js';

export type GiornoChiave = (typeof GIORNI_SETTIMANA)[number]['chiave'];
export const GIORNI_SETTIMANA_CHIAVI = GIORNI_SETTIMANA.map((g) => g.chiave) as [GiornoChiave, ...GiornoChiave[]];
export const FASCE_ORARIO = [{ chiave: 'giorno', nome: 'di giorno' }, { chiave: 'sera', nome: 'di sera' }] as const;
export type FasciaOrario = (typeof FASCE_ORARIO)[number]['chiave'];

export interface OrariNegozio {
  /** Giorni di apertura; vuoto = tutti i giorni. */
  giorni: GiornoChiave[];
  /** Fasce di apertura; vuoto = giorno e sera. */
  fasce: FasciaOrario[];
  chiusoConPioggia: boolean;
  /** Ciò che la guida aggiunge e che non è un valore: resta scritto, non valutato. */
  nota: string | null;
}

export const ORARI_SEMPRE: OrariNegozio = { giorni: [], fasce: [], chiusoConPioggia: false, nota: null };

/**
 * L5 (R5-12c): dove la guida non dà un orario al luogo vale la **regola dichiarata dell'app**, «aperto giorno e sera, tutti i giorni»,
 * segnata come regola e mai come dato della guida. È l'unica costante: chi legge un luogo senza orari (`luogo.orari_json` NULL) usa questa.
 */
export const ORARI_REGOLA_APP: OrariNegozio = ORARI_SEMPRE;

/** Da dove vengono gli orari di un luogo: dalla guida (`luogo.orari_json`) o dalla regola dell'app (`ORARI_REGOLA_APP`). */
export type OrigineOrari = 'guida' | 'regola-app';

/** Gli orari di un luogo come li vede il client (L5): i valori e la loro origine. */
export interface OrariDelLuogo extends OrariNegozio { origine: OrigineOrari }

/** Gli orari di un luogo dalla sua colonna (L5): quelli della guida, o la regola dell'app se la colonna è vuota. */
export function orariDelLuogo(json: string | null | undefined): OrariDelLuogo {
  return json ? { ...leggiOrari(json), origine: 'guida' } : { ...ORARI_REGOLA_APP, origine: 'regola-app' };
}

/** Il testo della regola dell'app (R5-12c): si dice sempre che non è un dato della guida. */
export const TESTO_REGOLA_APP = 'Giorno e sera · regola dell’app: la guida non indica orari';

/** Gli orari di un luogo in parole (L5): la regola dell'app detta come tale; un orario della guida senza limiti è «Giorno e sera». */
export function descriviOrariDelLuogo(o: OrariDelLuogo): string {
  if (o.origine === 'regola-app') return TESTO_REGOLA_APP;
  if (o.giorni.length === 0 && o.fasce.length === 0 && !o.chiusoConPioggia) return o.nota ? `Giorno e sera (${o.nota})` : 'Giorno e sera';
  return descriviOrari(o);
}

const GIORNI: readonly string[] = GIORNI_SETTIMANA.map((g) => g.chiave);
const FASCE: readonly string[] = FASCE_ORARIO.map((f) => f.chiave);

/** Rende un valore qualunque un `OrariNegozio` valido: giorni e fasce sconosciuti cadono, l'ordine è quello del catalogo. */
export function normalizzaOrari(x: unknown): OrariNegozio {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const giorni = Array.isArray(o.giorni) ? GIORNI.filter((g) => (o.giorni as unknown[]).includes(g)) as GiornoChiave[] : [];
  const fasce = Array.isArray(o.fasce) ? FASCE.filter((f) => (o.fasce as unknown[]).includes(f)) as FasciaOrario[] : [];
  const nota = typeof o.nota === 'string' && o.nota.trim() ? o.nota.trim() : null;
  return { giorni: giorni.length === GIORNI.length ? [] : giorni, fasce: fasce.length === FASCE.length ? [] : fasce, chiusoConPioggia: o.chiusoConPioggia === true, nota };
}

/** Gli orari salvati in una colonna JSON; una colonna vuota o illeggibile vale «sempre». */
export function leggiOrari(json: string | null | undefined): OrariNegozio {
  if (!json) return ORARI_SEMPRE;
  try { return normalizzaOrari(JSON.parse(json)); } catch { return ORARI_SEMPRE; }
}

/**
 * I giorni della settimana di un luogo (`luogo.giorni_json`, migrazione 080): solo le chiavi valide, senza doppioni, nell'ordine
 * del dato; vuoto se il JSON manca o è rovinato. Prima la stessa lettura era scritta due volte (città e presenza sulle mappe,
 * rilievo R8), e quella delle mappe accettava anche le chiavi ereditate da `Object` («constructor»).
 */
export function leggiGiorni(json: string | null | undefined): GiornoChiave[] {
  try {
    const v = JSON.parse(json || '[]') as unknown;
    return Array.isArray(v) ? [...new Set(v.map(String).filter((g): g is GiornoChiave => (GIORNI_SETTIMANA_CHIAVI as readonly string[]).includes(g)))] : [];
  } catch {
    return [];
  }
}

/** Le condizioni di presenza equivalenti: sono quelle che il visore e le schede sanno già valutare. */
export function orariComeCondizioni(o: OrariNegozio): RequisitoSpillo[] {
  const out: RequisitoSpillo[] = [];
  if (o.giorni.length > 0) out.push({ tipo: 'giorno-settimana', giorni: [...o.giorni] });
  if (o.fasce.length === 1) out.push({ tipo: 'fascia', fascia: o.fasce[0] });
  if (o.chiusoConPioggia) out.push({ tipo: 'meteo', condizione: 'non-piove' });
  return out;
}

const NOME_GIORNO: Record<string, string> = Object.fromEntries(GIORNI_SETTIMANA.map((g) => [g.chiave, g.nome]));

/**
 * I giorni in italiano: «dal lunedì al venerdì» (o «dal giovedì alla domenica») quando sono almeno tre consecutivi, «solo il
 * martedì» / «solo la domenica» quando è uno, altrimenti l'elenco «lunedì, mercoledì e sabato». Vuoto = nessuna limitazione:
 * stringa vuota (prima diventava « e undefined», e i luoghi senza giorni mostravano «Giorni:  e undefined»).
 */
export function descriviGiorni(giorni: GiornoChiave[]): string {
  if (giorni.length === 0) return '';
  const indici = giorni.map((g) => GIORNI.indexOf(g)).sort((a, b) => a - b);
  const consecutivi = indici.length >= 3 && indici.every((v, i) => i === 0 || v === indici[i - 1] + 1);
  // «domenica» è femminile: «al venerdì», ma «alla domenica» (e «la domenica»)
  const conArticolo = (preposizione: 'a' | 'solo', nome: string): string => (nome === 'domenica'
    ? `${preposizione === 'a' ? 'alla' : 'solo la'} ${nome}`
    : `${preposizione === 'a' ? 'al' : 'solo il'} ${nome}`);
  if (consecutivi) return `dal ${NOME_GIORNO[GIORNI[indici[0]]]} ${conArticolo('a', NOME_GIORNO[GIORNI[indici[indici.length - 1]]])}`;
  const nomi = indici.map((i) => NOME_GIORNO[GIORNI[i]]);
  if (nomi.length === 1) return conArticolo('solo', nomi[0]);
  return congiunzione(nomi);
}

/** La frase italiana degli orari: una sola per ogni valore uguale. Con l'origine «regola-app» (L5, R5-12c) dice che è la regola dell'app. */
export function descriviOrari(o: OrariNegozio | OrariDelLuogo): string {
  if ('origine' in o && o.origine === 'regola-app') return TESTO_REGOLA_APP;
  const parti: string[] = [];
  if (o.fasce.length === 1) parti.push(o.fasce[0] === 'giorno' ? 'Solo di giorno' : 'Solo di sera');
  if (o.giorni.length > 0) parti.push(descriviGiorni(o.giorni));
  if (o.chiusoConPioggia) parti.push('chiuso nei giorni di pioggia');
  let testo = parti.length ? parti.join(', ') : 'Sempre aperto';
  testo = testo.charAt(0).toUpperCase() + testo.slice(1);
  return o.nota ? `${testo} (${o.nota})` : testo;
}
