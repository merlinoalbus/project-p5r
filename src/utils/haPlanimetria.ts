import type { MappaDto } from '../types';
/** Gli asset illustrativi senza dimensioni verificate non sono planimetrie. */
export function haPlanimetria(mappa: MappaDto): boolean {
  return Boolean(mappa.immagineUrl || mappa.assetOriginale?.startsWith('mappe/') || (mappa.assetOriginale && (mappa.larghezza ?? 0) > 0 && (mappa.altezza ?? 0) > 0));
}
