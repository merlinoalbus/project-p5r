// ============================================================
// Rifornimento degli articoli — la regola della guida e il ciclo della scorta, calcolato in lettura (Ondata 5, Lotto A)
// ============================================================
//
// Decisione 21 dell'utente (26 ottobre, progetto ECC dell'ondata 5): ogni articolo ha una quantità per ciclo (`articolo.quantita`) e una
// regola di rifornimento (`articolo.rifornimento_json`), un solo punto. La guida italiana dà la regola articolo per articolo («1 pezzo,
// rifornimento il giorno successivo / il lunedì successivo / la domenica successiva / il 1° del mese successivo», elenco dei negozi; Tanaka:
// una copia alla volta, consegna in 3 giorni, negozi speciali); dove tace vale la regola dell'utente, il reset a ogni cambio di giornata
// (`origine: 'fallback-utente'`, quantità non indicata: nessun limite, il segno «comprato» vale fino al cambio di giornata).
//
// Il ciclo si calcola dalla data della partita e dalle righe del registro degli acquisti (`utente.registro_acquisti`), mai con una
// scrittura al cambio di giornata: se la data torna indietro o si toglie una spunta il conto resta giusto (gli acquisti con un giorno
// successivo alla data della partita non contano). Funzioni pure, senza database: le usano il server (`scorteService`) e l'interfaccia.
// ============================================================

import { GIORNI_SETTIMANA, dataLeggibile } from './condizioniSpillo.js';
import { annoDiGioco, giornoDellaSettimanaPiatto } from './date.js';

/** I modi in cui un articolo torna in negozio. */
export const TIPI_RIFORNIMENTO = ['giorno', 'settimana', 'mese', 'pioggia', 'mai', 'consegna', 'restituzione'] as const;
export type TipoRifornimento = (typeof TIPI_RIFORNIMENTO)[number];
export type GiornoRifornimento = (typeof GIORNI_SETTIMANA)[number]['chiave'];
/** Da dove viene la regola: la guida italiana, oppure la regola dell'utente dove la guida non dice niente. */
export type OrigineRifornimento = 'guida' | 'fallback-utente';

/**
 * La regola di rifornimento di un articolo.
 *   - `giorno`: torna il giorno dopo;
 *   - `settimana` con `giorno`: torna il `giorno` successivo (lunedì, domenica…);
 *   - `mese`: torna il 1° del mese successivo;
 *   - `pioggia`: una scorta per ogni giorno di pioggia (che l'articolo ci sia solo con la pioggia lo dicono le sue condizioni);
 *   - `mai`: pezzo unico, una volta comprato non torna;
 *   - `consegna` con `giorni`: un ordine alla volta, il successivo solo dopo la consegna (Tanaka, 3 giorni);
 *   - `restituzione`: il libro della biblioteca torna alla restituzione (quando è stato letto); Ondata 5 (lotto F-bis): anche il DVD
 *     noleggiato da Scarlet, quando è stato visto per intero.
 * `daVerificare`: la guida non è precisa (i distributori: «raramente» 1 pezzo invece di 2), il dato va verificato in gioco.
 */
export interface RegolaRifornimento {
  tipo: TipoRifornimento;
  giorno?: GiornoRifornimento;
  giorni?: number;
  origine: OrigineRifornimento;
  daVerificare?: boolean;
}

/** La regola dell'utente dove la guida tace: il segno «comprato» vale fino al cambio di giornata, senza limite di pezzi. */
export const REGOLA_FALLBACK_UTENTE: RegolaRifornimento = { tipo: 'giorno', origine: 'fallback-utente' };

const GIORNI_VALIDI: ReadonlySet<string> = new Set(GIORNI_SETTIMANA.map((g) => g.chiave));

/** La regola letta dal dato salvato (testo JSON o oggetto); null se assente o non riconoscibile (nessuna regola: nessuna scorta). */
export function normalizzaRifornimento(raw: unknown): RegolaRifornimento | null {
  let v: unknown = raw;
  if (typeof raw === 'string') { try { v = JSON.parse(raw); } catch { return null; } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  if (!(TIPI_RIFORNIMENTO as readonly string[]).includes(String(o.tipo))) return null;
  if (o.origine !== 'guida' && o.origine !== 'fallback-utente') return null;
  const tipo = o.tipo as TipoRifornimento;
  const regola: RegolaRifornimento = { tipo, origine: o.origine };
  if (tipo === 'settimana') {
    if (typeof o.giorno !== 'string' || !GIORNI_VALIDI.has(o.giorno)) return null;
    regola.giorno = o.giorno as GiornoRifornimento;
  }
  if (tipo === 'consegna') {
    if (typeof o.giorni !== 'number' || !Number.isSafeInteger(o.giorni) || o.giorni < 1 || o.giorni > 60) return null;
    regola.giorni = o.giorni;
  }
  if (o.daVerificare === true) regola.daVerificare = true;
  return regola;
}

/** Un acquisto del registro, quanto serve al ciclo. */
export interface AcquistoDelCiclo { giorno: string; fascia: 'giorno' | 'sera'; quantita: number }

/** Il numero del giorno «MM-GG» nel calendario di gioco (2016-2017), per contare le distanze; null se la data non esiste. */
export function numeroGiorno(data: string | null | undefined): number | null {
  const m = /^(\d{2})-(\d{2})$/.exec(data ?? '');
  if (!m) return null;
  const mese = Number(m[1]), giorno = Number(m[2]);
  const d = Date.UTC(annoDiGioco(mese), mese - 1, giorno);
  const x = new Date(d);
  if (x.getUTCMonth() !== mese - 1 || x.getUTCDate() !== giorno) return null;
  return Math.round(d / 86_400_000);
}

/** Il giorno «MM-GG» di un numero di giorno (l'inverso di `numeroGiorno`). */
function dataDelNumero(n: number): string {
  const d = new Date(n * 86_400_000);
  return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

const INDICE_GIORNO: Record<string, number> = { domenica: 0, lunedi: 1, martedi: 2, mercoledi: 3, giovedi: 4, venerdi: 5, sabato: 6 };

/**
 * Il primo giorno del ciclo in corso alla data `oggi` (numero di giorno), e il giorno in cui comincia il successivo (il rifornimento).
 * `mai` e `restituzione` non hanno un ciclo di calendario (null, null); `consegna` non ha un inizio fisso (dipende dall'ultimo ordine).
 */
export function cicloDelGiorno(regola: RegolaRifornimento, oggi: number): { inizio: number | null; prossimo: number | null } {
  if (regola.tipo === 'giorno' || regola.tipo === 'pioggia') return { inizio: oggi, prossimo: oggi + 1 };
  if (regola.tipo === 'settimana') {
    const settimana = new Date(oggi * 86_400_000).getUTCDay();
    const voluto = INDICE_GIORNO[regola.giorno ?? 'lunedi'] ?? 1;
    const inizio = oggi - ((settimana - voluto + 7) % 7);
    return { inizio, prossimo: inizio + 7 };
  }
  if (regola.tipo === 'mese') {
    const d = new Date(oggi * 86_400_000);
    const inizio = Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 86_400_000);
    const prossimo = Math.round(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) / 86_400_000);
    return { inizio, prossimo };
  }
  return { inizio: null, prossimo: null };
}

/** Lo stato della scorta di un articolo alla data della partita. */
export interface StatoScorta {
  /** I pezzi per ciclo; null = nessun limite indicato. */
  quantita: number | null;
  /** I pezzi comprati nel ciclo in corso (per `mai`: in tutto; per `consegna`: l'ordine in viaggio). */
  comprati: number;
  /** I pezzi che restano nel ciclo in corso; null senza limite. */
  rimasti: number | null;
  /** Non se ne possono comprare altri in questo ciclo. */
  esaurito: boolean;
  /** Il giorno «MM-GG» del rifornimento, se il ciclo ne ha uno (null per `mai`, `restituzione` e per chi non è esaurito). */
  torna: string | null;
  /** Gli indici (nell'elenco passato) degli acquisti che contano nel ciclo in corso. */
  nelCiclo: number[];
  /** Il negozio vende a consegna (Tanaka) e ha in viaggio un ordine di un giorno precedente: fino all'arrivo non ne prende di nuovi. */
  ordineInViaggio?: boolean;
}

/**
 * Le opzioni del conto: `letto` per `restituzione`; `consegnaDelNegozio` per un negozio che spedisce (Tanaka): i giorni di consegna e gli
 * acquisti degli ALTRI articoli dello stesso negozio, qualunque sia la loro regola (anche i pezzi unici si ordinano e si spediscono).
 */
export interface OpzioniStatoScorta {
  letto?: boolean;
  consegnaDelNegozio?: { giorni: number; ordini: readonly AcquistoDelCiclo[] };
  /** 2026-10-28 (effetto della voce «oggetto restituito»): le copie del prestito restituite fino alla data della partita; per `restituzione`
   *  liberano altrettanti pezzi presi in prestito, dai più vecchi. */
  restituiti?: number;
}

/**
 * Il conto della scorta: gli acquisti che cadono nel ciclo in corso (mai quelli con un giorno dopo `oggi`), i pezzi rimasti e il giorno del
 * rifornimento. `letto` vale per `restituzione`: il libro preso in prestito è stato letto, quindi restituito; `restituiti` (2026-10-28) le copie
 * restituite esplicitamente da una voce, che liberano i prestiti più vecchi. Senza data della partita (`oggi`
 * null) non c'è un ciclo: niente è esaurito (la disponibilità resta quella delle condizioni).
 *
 * Tanaka (guida italiana, Negozi speciali): «Gli oggetti ordinati richiedono però tre giorni per essere consegnati e fino all'arrivo della
 * spedizione non sarà possibile effettuare nuovi ordini», e una sola copia per oggetto alla volta (`consegna`). L'ordine è di un giorno: gli
 * articoli comprati lo stesso giorno sono lo stesso ordine (si possono aggiungere fino al cambio di giornata, una copia per articolo); un ordine
 * di un giorno precedente ancora in viaggio blocca tutto il negozio fino all'arrivo, pezzi unici compresi (`consegnaDelNegozio`).
 */
export function statoScorta(regola: RegolaRifornimento, quantita: number | null, acquisti: readonly AcquistoDelCiclo[], oggi: string | null, opz: OpzioniStatoScorta = {}): StatoScorta {
  const n = numeroGiorno(oggi);
  const vuoto: StatoScorta = { quantita, comprati: 0, rimasti: quantita, esaurito: false, torna: null, nelCiclo: [] };
  if (n === null) return vuoto;
  const giorni = acquisti.map((a) => numeroGiorno(a.giorno));
  const finoAOggi = (i: number): boolean => giorni[i] !== null && giorni[i]! <= n;
  let nelCiclo: number[];
  let torna: number | null = null;
  if (regola.tipo === 'mai') nelCiclo = acquisti.map((_, i) => i).filter(finoAOggi);
  else if (regola.tipo === 'restituzione') {
    nelCiclo = opz.letto ? [] : acquisti.map((_, i) => i).filter(finoAOggi);
    // le copie restituite (l'effetto della voce) tornano: escono dal ciclo i prestiti più vecchi, finché le restituzioni li coprono per intero
    let restano = Math.max(0, opz.restituiti ?? 0);
    if (restano > 0) {
      const ordinati = [...nelCiclo].sort((a, b) => giorni[a]! - giorni[b]! || a - b);
      const usciti = new Set<number>();
      for (const i of ordinati) { const q = Math.max(1, acquisti[i]!.quantita); if (q > restano) break; restano -= q; usciti.add(i); }
      nelCiclo = nelCiclo.filter((i) => !usciti.has(i));
    }
  }
  else if (regola.tipo === 'consegna') {
    const durata = regola.giorni ?? 1;
    nelCiclo = acquisti.map((_, i) => i).filter((i) => finoAOggi(i) && giorni[i]! + durata > n);
    if (nelCiclo.length) torna = Math.max(...nelCiclo.map((i) => giorni[i]! + durata));
  } else {
    const ciclo = cicloDelGiorno(regola, n);
    nelCiclo = acquisti.map((_, i) => i).filter((i) => finoAOggi(i) && ciclo.inizio !== null && giorni[i]! >= ciclo.inizio);
    torna = ciclo.prossimo;
  }
  const comprati = nelCiclo.reduce((s, i) => s + Math.max(1, acquisti[i]!.quantita), 0);
  // la consegna: un ordine alla volta, qualunque sia la quantità dell'articolo
  const limite = regola.tipo === 'consegna' ? 1 : quantita;
  const finito = limite !== null && limite - comprati <= 0;
  // il negozio che spedisce: gli ordini degli altri articoli di un giorno precedente ancora in viaggio (lo stesso giorno è lo stesso ordine)
  let arrivoOrdine: number | null = null;
  const consegna = regola.tipo === 'consegna' ? { giorni: regola.giorni ?? 1, ordini: opz.consegnaDelNegozio?.ordini ?? [] } : opz.consegnaDelNegozio;
  for (const a of consegna?.ordini ?? []) {
    const g = numeroGiorno(a.giorno);
    if (g !== null && g < n && g + consegna!.giorni > n) arrivoOrdine = Math.max(arrivoOrdine ?? 0, g + consegna!.giorni);
  }
  const ordineInViaggio = arrivoOrdine !== null;
  // il pezzo unico già comprato non torna: il suo giorno di ritorno resta vuoto anche con un ordine in viaggio
  if (ordineInViaggio && !(regola.tipo === 'mai' && finito)) torna = torna === null ? arrivoOrdine : Math.max(torna, arrivoOrdine!);
  const rimasti = ordineInViaggio ? 0 : limite === null ? null : Math.max(0, limite - comprati);
  const esaurito = ordineInViaggio || finito;
  return { quantita: limite, comprati, rimasti, esaurito, torna: esaurito && torna !== null ? dataDelNumero(torna) : null, nelCiclo, ...(ordineInViaggio ? { ordineInViaggio } : {}) };
}

const pezzi = (q: number): string => (q === 1 ? '1 pezzo' : `${q} pezzi`);
const nomeGiorno = (g: GiornoRifornimento | undefined): string => GIORNI_SETTIMANA.find((x) => x.chiave === g)?.nome ?? 'lunedì';

/** La regola a parole, per il modulo dell'articolo e per i dettagli dell'offerta. */
export function descriviRifornimento(regola: RegolaRifornimento, quantita: number | null): string {
  const quanti = quantita === null ? 'Nessun limite di pezzi indicato' : pezzi(quantita);
  const verifica = regola.daVerificare ? ' (da verificare in gioco)' : '';
  switch (regola.tipo) {
    case 'mai': return `Pezzo unico: una volta comprato non torna${verifica}`;
    case 'restituzione': return `${quanti}: torna alla restituzione, quando il prestito è letto o visto per intero${verifica}`;
    case 'consegna': return `Un ordine alla volta: il successivo dopo la consegna, in ${regola.giorni ?? 1} ${regola.giorni === 1 ? 'giorno' : 'giorni'}${verifica}`;
    case 'pioggia': return `${quanti} per ogni giorno di pioggia${verifica}`;
    case 'settimana': return `${quanti}, rifornimento ogni ${nomeGiorno(regola.giorno)}${verifica}`;
    case 'mese': return `${quanti}, rifornimento il 1° del mese${verifica}`;
    default: return regola.origine === 'fallback-utente' && quantita === null
      ? 'La guida non indica limiti: il segno «comprato» vale fino al cambio di giornata'
      : `${quanti}, rifornimento il giorno dopo${verifica}`;
  }
}

/** Il requisito della scorta a parole: «Rimasti 1 di 3», «Esaurito: torna lunedì 25 aprile», «Pezzo unico già comprato». */
export function descriviStatoScorta(regola: RegolaRifornimento, s: StatoScorta): string {
  if (!s.esaurito) return s.rimasti === null ? 'Nessun limite di pezzi' : `Rimasti ${s.rimasti} di ${s.quantita}`;
  // il negozio che spedisce ha in viaggio un ordine di un altro giorno (e questo articolo non l'ha già comprato)
  if (s.comprati === 0 && s.ordineInViaggio) return s.torna ? `Un ordine è in consegna: nuovi ordini dal ${dataLeggibile(s.torna)}` : 'Un ordine è in consegna: nuovi ordini all’arrivo';
  if (regola.tipo === 'mai') return 'Pezzo unico già comprato';
  if (regola.tipo === 'restituzione') return 'In prestito: torna alla restituzione';
  if (regola.tipo === 'consegna') return s.torna ? `Ordine in consegna: arriva il ${dataLeggibile(s.torna)}` : 'Ordine in consegna';
  if (regola.tipo === 'pioggia') return 'Esaurito: torna con la prossima pioggia';
  if (!s.torna) return 'Esaurito';
  const g = giornoDellaSettimanaPiatto(s.torna);
  const nome = GIORNI_SETTIMANA.find((x) => x.chiave === g)?.nome;
  return `Esaurito: torna ${nome ? `${nome} ` : 'il '}${dataLeggibile(s.torna)}`;
}

/** Il ciclo ha senso per l'interfaccia (si compra più volte): tutte le regole tranne il pezzo unico. */
export const eRifornibile = (regola: RegolaRifornimento | null): regola is RegolaRifornimento => regola !== null && regola.tipo !== 'mai';

/**
 * Il pezzo unico: una volta comprato non torna (regola «mai»). Progetto dell'ondata 5, §9: «barra la riga solo per l'articolo "mai"»; un
 * articolo senza regola (l'Aojiru, con il suo registro, o una riga di prima) non si presenta come pezzo unico già posseduto (revisione finale,
 * R1: i servizi senza regola risultavano barrati per sempre).
 */
export const ePezzoUnico = (regola: RegolaRifornimento | null | undefined): boolean => regola?.tipo === 'mai';

/**
 * «Acquistato» per i filtri e i conteggi dei negozi (censimento dell'ondata 5, §3: «comprato in questo ciclo»): ciò che si rifornisce è
 * acquistato se nel ciclo in corso della sua sede ne è stato comprato almeno un pezzo, e torna «da acquistare» quando la scorta si rinnova;
 * il pezzo unico e ciò che non ha una regola restano acquistati una volta ottenuti. Il campo `acquistato` dell'offerta resta «ottenuto
 * almeno una volta»: lo leggono il segno barrato del pezzo unico, la condizione «articolo», le televendite e i regali.
 */
export function compratoNelCiclo(a: { acquistato: boolean; rifornimento?: { regola: RegolaRifornimento } | null; scorta?: { comprati: number } | null }): boolean {
  return eRifornibile(a.rifornimento?.regola ?? null) && a.scorta ? a.scorta.comprati > 0 : a.acquistato;
}
