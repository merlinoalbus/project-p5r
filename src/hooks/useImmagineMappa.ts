// ============================================================
// useImmagineMappa — l'immagine di una mappa, la stessa in ogni vista (L1, 2026-10-20)
// ============================================================
//
// Una regola sola, quella del server (`immagineMappa.ts`): l'immagine caricata nell'istanza vince ovunque (URL già versionato),
// altrimenti l'asset dichiarato dalla mappa (se la grafica predefinita è accesa e il file c'è), altrimenti niente — e chi la mostra
// mette la sua icona. Prima visore, indice, miniature, ingresso del quartiere ed editor sceglievano fra tre campi a modo loro, e
// l'indice copriva l'immagine caricata di Tokyo con uno stemma fisso.
// ============================================================

import { useAsset } from '../stores/assetStore';
import type { MappaRiassuntoDto } from '../types';

/** L'URL dell'immagine della mappa (caricata, poi asset dichiarato), o null se non ne ha una da mostrare. */
export function useImmagineMappa(mappa: Pick<MappaRiassuntoDto, 'immagineUrl' | 'asset'> | null | undefined): string | null {
  const asset = useAsset(mappa && !mappa.immagineUrl ? mappa.asset : null);
  return mappa?.immagineUrl ?? asset;
}
