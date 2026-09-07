// ============================================================
// AnteprimaMappa — la faccia di un luogo dell'atlante
// ============================================================
//
// L'indice delle mappe era un elenco di titoli: undici radici e centinaia di planimetrie, tutte
// scritte uguali. Ma una mappa **si riconosce guardandola**, non leggendone il nome: la planimetria
// del Cancello del castello e quella della Sala centrale hanno due forme che si distinguono in un
// istante, e due nomi che si distinguono in tre secondi.
//
// Da dove viene l'immagine, nell'ordine in cui la si cerca: quella caricata nell'istanza
// (`immagineUrl`), poi l'asset del repository (`asset`, per esempio `palazzi/kamoshida`), poi
// quella originale estratta dal gioco (`assetOriginale`). Se non c'è nulla resta un riquadro col
// simbolo della mappa: **un contenitore vuoto è un'informazione** — vuol dire che quel nodo
// raccoglie altre mappe e non è una planimetria.
// ============================================================

import { useAsset } from '../../stores/assetStore';
import { IconMappa } from '../shared/iconeGuida';
import type { MappaRiassuntoDto } from '../../types';

interface Props {
  mappa: Pick<MappaRiassuntoDto, 'immagineUrl' | 'asset' | 'assetOriginale' | 'nome'>;
  /** Testo alternativo; vuoto la rende decorativa (quando il nome è già scritto accanto). */
  etichetta?: string;
  className?: string;
}

export function AnteprimaMappa({ mappa, etichetta, className = '' }: Props) {
  const asset = useAsset(mappa.asset);
  const originale = useAsset(mappa.assetOriginale);
  const src = mappa.immagineUrl ?? asset ?? originale;
  return (
    <span className={`anteprima-mappa ${className}`}>
      {src
        ? <img src={src} alt={etichetta ?? ''} aria-hidden={etichetta ? undefined : true} loading="lazy" draggable={false} />
        : <span className="anteprima-mappa__vuota" aria-hidden="true"><IconMappa size={26} /></span>}
    </span>
  );
}
