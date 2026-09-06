import type { DestinazioneSpillo, SpilloDto } from '../types';
export type PuntoArrivo = Omit<DestinazioneSpillo, 'mappa'>;
export type NavigaMappa = (mappa: string, arrivo?: PuntoArrivo) => void;
export function urlMappa(mappa: string, arrivo?: PuntoArrivo): string {
  const base = `/guida/mappe/${encodeURIComponent(mappa)}`;
  return arrivo ? `${base}?${new URLSearchParams({x:String(arrivo.x),y:String(arrivo.y),zoom:String(arrivo.zoom)})}` : base;
}

/** Stessa precedenza del visore, senza ripiegare su riferimenti invalidati. */
export function destinazioneMappaSpillo(s: SpilloDto): string | null {
  if(s.soloPosizione)return null;
  if(s.destinazioneNonDisponibile)return null;
  if(s.destinazione)return s.destinazione.mappa;
  return s.dettaglio?.tipo==='mappa'?s.dettaglio.mappa?.chiave??null:null;
}
