import type { DestinazioneSpillo } from '../types';
export type PuntoArrivo = Omit<DestinazioneSpillo, 'mappa'>;
export type NavigaMappa = (mappa: string, arrivo?: PuntoArrivo) => void;
export function urlMappa(mappa: string, arrivo?: PuntoArrivo): string {
  const base = `/guida/mappe/${encodeURIComponent(mappa)}`;
  return arrivo ? `${base}?${new URLSearchParams({x:String(arrivo.x),y:String(arrivo.y),zoom:String(arrivo.zoom)})}` : base;
}
