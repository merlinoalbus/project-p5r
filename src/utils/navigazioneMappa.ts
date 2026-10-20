// ============================================================
// navigazioneMappa — indirizzi delle mappe della guida e destinazioni degli spilli di spostamento
// ============================================================
//
// L2 (2026-10-20): ogni mappa ha **una casa**, l'unica pagina che la mostra (La città per Tokyo, la pagina del quartiere per la sua
// illustrazione, la pagina dell'Area per le sue planimetrie, il visore per il resto). La regola sta nel server (`casaMappa.ts`) e viaggia
// nei DTO (`casa`): qui si aggiunge solo il punto d'arrivo (`urlCasa`). Dove il DTO ha solo la chiave resta `urlMappa`, e il redirect
// di `MappaPage` porta comunque alla casa.
// ============================================================

import type { DestinazioneSpillo, SpilloDto } from '../types';
import { categoriaSpillo } from '../../shared/spilli';

/** Un punto d'arrivo in percentuale con zoom (ingressi dei quartieri sulla mappa di Tokyo) oppure uno spillo da selezionare. */
export type PuntoArrivo = { x: number; y: number; zoom: number } | { spillo: number };
export type NavigaMappa = (mappa: string, arrivo?: PuntoArrivo) => void;

/** I parametri della query che dicono l'arrivo: `spillo`, oppure `x`, `y` e `zoom`. */
function parametriArrivo(arrivo: PuntoArrivo): URLSearchParams {
  return 'spillo' in arrivo
    ? new URLSearchParams({ spillo: String(arrivo.spillo) })
    : new URLSearchParams({ x: String(arrivo.x), y: String(arrivo.y), zoom: String(arrivo.zoom) });
}

/** Indirizzo della pagina della mappa; l'arrivo, se c'è, va nella query (`spillo`, oppure `x`, `y` e `zoom`). */
export function urlMappa(mappa: string, arrivo?: PuntoArrivo): string {
  const base = `/guida/mappe/${encodeURIComponent(mappa)}`;
  return arrivo ? `${base}?${parametriArrivo(arrivo)}` : base;
}

/** Indirizzo della casa di una mappa (dal DTO, già con l'eventuale `?planimetria=`), con il punto d'arrivo aggiunto nella query: `?` o
 *  `&` secondo che la casa abbia già una query. Un arrivo già presente nella casa viene sostituito. */
export function urlCasa(casa: string, arrivo?: PuntoArrivo): string {
  if (!arrivo) return casa;
  const [percorso, query = ''] = casa.split('?', 2) as [string, string | undefined];
  const parametri = new URLSearchParams(query);
  for (const k of ['spillo', 'x', 'y', 'zoom']) parametri.delete(k);
  for (const [k, v] of parametriArrivo(arrivo)) parametri.set(k, v);
  return `${percorso}?${parametri}`;
}

/** I parametri d'arrivo che un indirizzo vecchio `/guida/mappe/<k>` porta con sé fino alla casa: lo spillo da selezionare, il punto,
 *  il contesto della planimetria e l'area della guida. */
const PARAMETRI_CONSERVATI = ['spillo', 'x', 'y', 'zoom', 'contesto', 'area'] as const;

/** La casa con i parametri d'arrivo della query di partenza aggiunti (la casa vince sui propri, come `planimetria`). */
export function casaConArrivo(casa: string, ricerca: URLSearchParams): string {
  const [percorso, query = ''] = casa.split('?', 2) as [string, string | undefined];
  const parametri = new URLSearchParams(query);
  for (const k of PARAMETRI_CONSERVATI) { const v = ricerca.get(k); if (v !== null && !parametri.has(k)) parametri.set(k, v); }
  const s = parametri.toString();
  return s ? `${percorso}?${s}` : percorso;
}

/** Vero se la casa è proprio la pagina `/guida/mappe/<chiave>` su cui si è (stessa chiave, codifiche a parte): lì non si reindirizza,
 *  ed è ciò che impedisce un giro di redirect sulle mappe la cui casa è il visore (Palazzi, Memento). */
export function casaEQuesta(casa: string, chiave: string): boolean {
  const percorso = casa.split('?', 1)[0];
  const decodifica = (s: string) => { try { return decodeURIComponent(s); } catch { return s; } };
  return decodifica(percorso) === `/guida/mappe/${decodifica(chiave)}`;
}

/** Il nome del posto in cui porta un gesto di navigazione (decisione dell'utente, 2026-10-20: «chiamandolo con il suo nome… e non con
 *  mappa»): l'area, se la meta è una sua planimetria, altrimenti il nome della mappa (Tokyo, Shibuya, una planimetria di un Palazzo).
 *  Mai «Mappa», mai il tipo. */
export function nomeDellaMeta(meta: { nome: string; area?: { nome: string } | null }): string {
  return meta.area?.nome ?? meta.nome;
}

/** L'arrivo di uno spillo di spostamento: la sua destinazione, o il riferimento a una mappa. Solo gli spostamenti portano altrove. */
export function arrivoSpillo(s: SpilloDto): DestinazioneSpillo | null {
  if (categoriaSpillo(s.tipo) !== 'spostamento') return null;
  if (s.destinazioneNonDisponibile) return null;
  if (s.destinazione) return s.destinazione;
  return s.dettaglio?.tipo === 'mappa' && s.dettaglio.mappa ? { mappa: s.dettaglio.mappa.chiave, spillo: null } : null;
}

/** La mappa a cui porta lo spillo, se porta da qualche parte. */
export function destinazioneMappaSpillo(s: SpilloDto): string | null {
  return arrivoSpillo(s)?.mappa ?? null;
}

/** Il nome della meta di uno spillo di spostamento, letto dal posto in cui porta (`dettaglio.mappa`: l'Area, se è una sua
 *  planimetria), o null se lo spillo non porta altrove o la meta non è nota. Il nome proprio del pin, se diverso, resta la sua nota
 *  («Banchina Metro», «Piano 2», «Mappa» del 1628 sui Vicoli, che mostra «Yongen-Jaya»). */
export function nomeMetaSpillo(s: SpilloDto): string | null {
  if (!arrivoSpillo(s)) return null;
  const meta = s.dettaglio?.tipo === 'mappa' ? s.dettaglio.mappa : null;
  return meta ? nomeDellaMeta(meta) : null;
}
