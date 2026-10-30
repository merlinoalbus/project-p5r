// ============================================================
// Disponibilità dei Confidenti strutturata (R9-01) — tipi e valutatore condivisi
// ============================================================
//
// La disponibilità di un Confidente è un dato strutturato (migrazione 163, fonte G-036): come si incontra (`modo`), in quali giorni della settimana e
// fasce, le eccezioni (giorni dopo un rango, fascia o giorni diversi a un rango, giorni del calendario in cui non si incontra), da quando è disponibile
// e, se non ha un luogo, perché. Il testo libero resta nelle note. Il valutatore dice se, in un dato momento, il Confidente è disponibile: lo usano la
// scheda, i semafori e il Diario.
// L13 (ondata 6, migrazione 306): la pioggia non è più un'eccezione della disponibilità. Ha una sola fonte, i requisiti di rango (`meteo non-piove`
// in `confidente_requisito`, col «Ripristina» da `confidente_requisito_guida`): chi chiama dice nel contesto se l'incontro del rango successivo non si
// fa con la pioggia (`nonConLaPioggia`), e il valutatore lo applica.
// ============================================================

import { giornoDellaSettimana } from './date.js';
import { ordineGioco, type RequisitoSpillo } from './condizioniSpillo.js';

export type ModoDisponibilita = 'settimanale' | 'su-messaggio' | 'stanza-velluto' | 'trama';
export const MODI_DISPONIBILITA: readonly ModoDisponibilita[] = ['settimanale', 'su-messaggio', 'stanza-velluto', 'trama'];
export type GiornoDisponibilita = 'lun' | 'mar' | 'mer' | 'gio' | 'ven' | 'sab' | 'dom' | 'festivi';
export const GIORNI_DISPONIBILITA: readonly GiornoDisponibilita[] = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom', 'festivi'];
export type FasciaDisponibilita = 'giorno' | 'sera';
export const FASCE_DISPONIBILITA: readonly FasciaDisponibilita[] = ['giorno', 'sera'];

export type EccezioneDisponibilita =
  | { tipo: 'dopo-rango'; giorni: number; effetto: 'non-disponibile' }
  | { tipo: 'fascia-rango'; rango: number; fasce: FasciaDisponibilita[] }
  /** Per l'incontro del rango indicato i giorni sono questi, al posto di quelli generali (come `fascia-rango` per le fasce). */
  | { tipo: 'giorni-rango'; rango: number; giorni: GiornoDisponibilita[] }
  /** I giorni del calendario di gioco («MM-GG») in cui non si incontra. */
  | { tipo: 'date'; date: string[]; effetto: 'non-disponibile' };

export interface DisponibilitaStrutturata {
  modo: ModoDisponibilita;
  giorni: GiornoDisponibilita[];
  fasce: FasciaDisponibilita[];
  eccezioni: EccezioneDisponibilita[];
  /** 'MM-GG' da cui è disponibile, se diverso dallo sblocco (le Gemelle, dal 18/5). */
  dal: string | null;
  motivoSenzaLuogo: string;
  fonte: string | null;
}

/** Un luogo del Confidente, per chiave (L5): il nome è quello di adesso. */
export interface LuogoConfidente { chiave: string; nome: string }

export interface DisponibilitaConfidenteDto {
  confidente: string;
  struttura: DisponibilitaStrutturata;
  luoghi: LuogoConfidente[];
  /** Vero se la struttura è stata cambiata rispetto alla fonte G-036: «Ripristina» la riporta com'era. */
  modificata: boolean;
  /** I ranghi il cui incontro non si fa con la pioggia, letti dai requisiti di rango (la fonte unica della pioggia): solo da mostrare. */
  ranghiNonConLaPioggia: number[];
  /** Presente se è stata indicata una partita: se il Confidente è disponibile adesso. */
  oggi?: EsitoDisponibilita;
}

/** Il momento in cui si chiede se il Confidente è disponibile; ciò che manca (`null`) rende il verdetto «sconosciuto» solo dove serve. */
export interface ContestoDisponibilita {
  data: string | null;
  fascia: FasciaDisponibilita | null;
  festivo?: boolean;
  piove?: boolean | null;
  /** Il rango che il Confidente ha adesso nella partita (0 = non ancora incontrato). */
  rango?: number | null;
  /** Quanti giorni di gioco sono passati dall'ultimo rango; null = non lo sappiamo. */
  giorniDallUltimoRango?: number | null;
  /** Vero se fra i requisiti del rango successivo c'è «non deve piovere» (lo calcola `nonConLaPioggia` di disponibilitaStrutturataService); null o assente = non lo sappiamo, non si controlla. */
  nonConLaPioggia?: boolean | null;
}

export interface EsitoDisponibilita {
  /** `disponibile`, `non-disponibile`, `su-messaggio` (si avanza su suo messaggio), `trama` (avanza da sola con la storia), `sconosciuto` (manca un dato). */
  stato: 'disponibile' | 'non-disponibile' | 'su-messaggio' | 'trama' | 'sconosciuto';
  motivo: string;
  /** Perché non è disponibile (solo con `non-disponibile`): il giorno della settimana, un giorno del calendario escluso, la fascia, la data di inizio,
   *  la pioggia o i giorni dopo un rango. */
  causa?: 'giorno' | 'date' | 'fascia' | 'dal' | 'pioggia' | 'dopo-rango';
}

/** Vero se la condizione chiede che non piova: «non deve piovere», anche dentro un gruppo «tutte» (in un «almeno una» non è un obbligo). */
export function richiedeNonPioggia(c: RequisitoSpillo): boolean {
  if (c.tipo === 'meteo') return c.condizione === 'non-piove';
  if (c.tipo === 'non') return c.condizione.tipo === 'piove';
  if (c.tipo === 'gruppo') return c.modo === 'tutte' && c.condizioni.some(richiedeNonPioggia);
  return false;
}

const SIGLE: Record<string, GiornoDisponibilita> = { Lunedì: 'lun', Martedì: 'mar', Mercoledì: 'mer', Giovedì: 'gio', Venerdì: 'ven', Sabato: 'sab', Domenica: 'dom' };
const NOME_GIORNO: Record<GiornoDisponibilita, string> = { lun: 'lunedì', mar: 'martedì', mer: 'mercoledì', gio: 'giovedì', ven: 'venerdì', sab: 'sabato', dom: 'domenica', festivi: 'festivi' };
/** «MM-GG» → «GG/MM». */
const dataBreve = (mmgg: string): string => `${mmgg.slice(3)}/${mmgg.slice(0, 2)}`;

/** Un'eccezione del vocabolario con i campi che il valutatore legge (un elenco che non è un elenco la renderebbe illeggibile): le altre si scartano. */
function eccezioneLeggibile(e: unknown): e is EccezioneDisponibilita {
  if (!e || typeof e !== 'object') return false;
  const o = e as Record<string, unknown>;
  switch (o.tipo) {
    case 'dopo-rango': return typeof o.giorni === 'number';
    case 'fascia-rango': return typeof o.rango === 'number' && Array.isArray(o.fasce);
    case 'giorni-rango': return typeof o.rango === 'number' && Array.isArray(o.giorni);
    case 'date': return Array.isArray(o.date) && o.date.every((d) => typeof d === 'string');
    default: return false;
  }
}

/** Legge la struttura dalle colonne della riga; una colonna illeggibile dà una struttura vuota di quel campo, mai un'eccezione. */
export function strutturaDaColonne(r: { modo: string; giorni_settimana_json: string; fasce_orarie_json: string; eccezioni_json: string; dal: string | null; motivo_senza_luogo: string; fonte: string | null }): DisponibilitaStrutturata {
  const lista = <T>(testo: string, ammessi: readonly T[]): T[] => {
    try { const v = JSON.parse(testo) as unknown; return Array.isArray(v) ? v.filter((x): x is T => (ammessi as readonly unknown[]).includes(x)) : []; } catch { return []; }
  };
  let eccezioni: EccezioneDisponibilita[] = [];
  try {
    const v = JSON.parse(r.eccezioni_json) as unknown;
    // le righe `pioggia` rimaste da prima della 306 non si leggono più: la pioggia sta nei requisiti di rango
    if (Array.isArray(v)) eccezioni = v.filter(eccezioneLeggibile);
  } catch { /* eccezioni illeggibili: nessuna */ }
  return {
    modo: (MODI_DISPONIBILITA as readonly string[]).includes(r.modo) ? r.modo as ModoDisponibilita : 'settimanale',
    giorni: lista(r.giorni_settimana_json, GIORNI_DISPONIBILITA), fasce: lista(r.fasce_orarie_json, FASCE_DISPONIBILITA),
    eccezioni, dal: r.dal, motivoSenzaLuogo: r.motivo_senza_luogo, fonte: r.fonte,
  };
}

/** Il giorno è fra quelli ammessi? I «festivi» valgono dove il contesto dice che il giorno lo è. */
function giornoAmmesso(giorni: readonly GiornoDisponibilita[], c: ContestoDisponibilita): boolean | null {
  const g = giornoDellaSettimana(c.data);
  if (g === null) return null;
  if (giorni.includes(SIGLE[g]!)) return true;
  return giorni.includes('festivi') && c.festivo === true;
}

/** Se, nel momento dato, il Confidente è disponibile e perché. Non legge né scrive niente: le eccezioni che dipendono da un dato mancante lo dicono. */
export function valutaDisponibilita(s: DisponibilitaStrutturata, c: ContestoDisponibilita): EsitoDisponibilita {
  if (s.modo === 'trama') return { stato: 'trama', motivo: 'Il legame avanza da solo con la trama.' };
  if (s.modo === 'su-messaggio') return { stato: 'su-messaggio', motivo: 'Si avanza solo dopo un suo messaggio o incontrandola nel luogo indicato.' };
  if (s.dal && c.data && ordineGioco(c.data) < ordineGioco(s.dal)) return { stato: 'non-disponibile', causa: 'dal', motivo: `Disponibile dal ${s.dal.slice(3)}/${s.dal.slice(0, 2)}.` };
  if (s.modo === 'stanza-velluto') return { stato: 'disponibile', motivo: 'Sempre accessibile, alla Stanza di Velluto.' };
  if (!c.data) return { stato: 'sconosciuto', motivo: 'Manca il giorno di gioco.' };
  const prossimo = (c.rango ?? 0) + 1;
  // un giorno del calendario escluso vale qualunque sia il giorno della settimana
  if (s.eccezioni.some((e) => e.tipo === 'date' && e.date.includes(c.data!))) return { stato: 'non-disponibile', causa: 'date', motivo: `Il ${dataBreve(c.data)} non si incontra.` };
  // i giorni del rango successivo, se ha i suoi, prendono il posto di quelli generali
  const giorniRango = s.eccezioni.find((e): e is Extract<EccezioneDisponibilita, { tipo: 'giorni-rango' }> => e.tipo === 'giorni-rango' && e.rango === prossimo);
  const giornoOk = giornoAmmesso(giorniRango ? giorniRango.giorni : s.giorni, c);
  if (giornoOk === null) return { stato: 'sconosciuto', motivo: 'Il giorno non è una data del calendario di gioco.' };
  if (!giornoOk) return { stato: 'non-disponibile', causa: 'giorno', motivo: giorniRango ? `Per il rango ${prossimo} non è disponibile di ${NOME_GIORNO[SIGLE[giornoDellaSettimana(c.data)!]!]}.` : `Non è disponibile di ${NOME_GIORNO[SIGLE[giornoDellaSettimana(c.data)!]!]}.` };
  const fasceRango = s.eccezioni.find((e): e is Extract<EccezioneDisponibilita, { tipo: 'fascia-rango' }> => e.tipo === 'fascia-rango' && e.rango === prossimo);
  const fasce = fasceRango ? fasceRango.fasce : s.fasce;
  if (c.fascia === null) return { stato: 'sconosciuto', motivo: 'Manca la fascia del giorno.' };
  if (fasce.length > 0 && !fasce.includes(c.fascia)) return { stato: 'non-disponibile', causa: 'fascia', motivo: `È disponibile ${fasce.join(' e ')}, non di ${c.fascia}.` };
  // la pioggia: dai requisiti del rango successivo (fonte unica), che chi chiama riassume in `nonConLaPioggia`
  if (c.nonConLaPioggia === true) {
    if (c.piove === true) return { stato: 'non-disponibile', causa: 'pioggia', motivo: `L'incontro del rango ${prossimo} non si fa con la pioggia.` };
    if (c.piove === null || c.piove === undefined) return { stato: 'sconosciuto', motivo: 'Manca il meteo: con la pioggia non è disponibile.' };
  }
  for (const e of s.eccezioni) {
    // prima del primo incontro (rango 0) non c'è un rango dopo cui aspettare
    if (e.tipo === 'dopo-rango' && c.rango !== 0) {
      if (c.giorniDallUltimoRango === null || c.giorniDallUltimoRango === undefined) return { stato: 'sconosciuto', motivo: `Non è disponibile nei ${e.giorni} giorni dopo un rango: manca il giorno dell'ultimo rango.` };
      // «nei 2 giorni dopo»: il giorno del rango e i 2 successivi; dal terzo sì («al massimo una volta ogni tre giorni»)
      if (c.giorniDallUltimoRango <= e.giorni) return { stato: 'non-disponibile', causa: 'dopo-rango', motivo: `Non è disponibile nei ${e.giorni} giorni dopo un rango.` };
    }
  }
  return { stato: 'disponibile', motivo: 'Disponibile.' };
}
