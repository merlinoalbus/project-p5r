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

export function eSempreAperto(o: OrariNegozio): boolean {
  return o.giorni.length === 0 && o.fasce.length === 0 && !o.chiusoConPioggia;
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

/** «dal lunedì al venerdì» quando i giorni sono consecutivi, altrimenti l'elenco. */
function descriviGiorni(giorni: GiornoChiave[]): string {
  const indici = giorni.map((g) => GIORNI.indexOf(g)).sort((a, b) => a - b);
  const consecutivi = indici.length >= 3 && indici.every((v, i) => i === 0 || v === indici[i - 1] + 1);
  if (consecutivi) return `dal ${NOME_GIORNO[GIORNI[indici[0]]]} al ${NOME_GIORNO[GIORNI[indici[indici.length - 1]]]}`;
  const nomi = indici.map((i) => NOME_GIORNO[GIORNI[i]]);
  if (nomi.length === 1) return `solo ${nomi[0] === 'domenica' ? 'la' : 'il'} ${nomi[0]}`;
  return `${nomi.slice(0, -1).join(', ')} e ${nomi[nomi.length - 1]}`;
}

/** La frase italiana degli orari: una sola per ogni valore uguale. */
export function descriviOrari(o: OrariNegozio): string {
  const parti: string[] = [];
  if (o.fasce.length === 1) parti.push(o.fasce[0] === 'giorno' ? 'Solo di giorno' : 'Solo di sera');
  if (o.giorni.length > 0) parti.push(descriviGiorni(o.giorni));
  if (o.chiusoConPioggia) parti.push('chiuso nei giorni di pioggia');
  let testo = parti.length ? parti.join(', ') : 'Sempre aperto';
  testo = testo.charAt(0).toUpperCase() + testo.slice(1);
  return o.nota ? `${testo} (${o.nota})` : testo;
}
