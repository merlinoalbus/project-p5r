import type { DestinazioneSpillo, SpilloDto } from '../types';
import { categoriaSpillo } from '../../shared/spilli';

/** Un punto d'arrivo in percentuale con zoom (ingressi dei quartieri sulla mappa di Tokyo) oppure uno spillo da selezionare. */
export type PuntoArrivo = { x: number; y: number; zoom: number } | { spillo: number };
export type NavigaMappa = (mappa: string, arrivo?: PuntoArrivo) => void;

export function urlMappa(mappa: string, arrivo?: PuntoArrivo): string {
  const base = `/guida/mappe/${encodeURIComponent(mappa)}`;
  if (!arrivo) return base;
  if ('spillo' in arrivo) return `${base}?spillo=${arrivo.spillo}`;
  return `${base}?${new URLSearchParams({ x: String(arrivo.x), y: String(arrivo.y), zoom: String(arrivo.zoom) })}`;
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
