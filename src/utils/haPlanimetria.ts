import type { MappaDto } from '../types';
/** La mappa ha un'immagine su cui aprire il visore. Lo dichiara il dato (migrazione 043) invece
 * di dedurlo dal percorso dell'asset, che frontend e backend leggevano in modo diverso: lo stemma
 * di un Palazzo identifica il luogo ma non è una mappa. Per le risposte che non portano ancora il
 * ruolo resta la regola di prima, senza la scorciatoia sul prefisso dell'asset. */
export function haPlanimetria(mappa: MappaDto): boolean {
  if (mappa.ruoloImmagine) return mappa.ruoloImmagine === 'planimetria-nativa' || mappa.ruoloImmagine === 'illustrazione-editoriale';
  return Boolean(mappa.immagineUrl || (mappa.assetOriginale && (mappa.larghezza ?? 0) > 0 && (mappa.altezza ?? 0) > 0));
}

/** Vero solo per le piante estratte dal gioco: un'illustrazione dell'applicazione non lo è, e
 * l'interfaccia deve dirlo invece di lasciarla passare per una pianta. */
export function planimetriaDelGioco(mappa: MappaDto): boolean {
  return mappa.ruoloImmagine === 'planimetria-nativa';
}
