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

/** Le radici che hanno un **emblema** invece di una pianta.
 *
 * Nell'indice delle mappe i Palazzi mostrano il proprio stemma — la loro `assetOriginale` e'
 * `palazzi/<chiave>`, cioe' un'illustrazione — mentre Tokyo e il Covo mostravano la planimetria,
 * che a 100 px e' una macchia di linee. In una griglia in cui tutti gli altri hanno una figura,
 * due riquadri di planimetria si leggono come un errore di caricamento.
 *
 * Qui l'emblema vince sulla pianta: sono immagini che gia' esistono nell'app e che quelle due cose
 * le rappresentano — la citta' col treno sotto il sole rosso, il Covo con la sua stella. */
const EMBLEMA: Record<string, string> = {
  tokyo: 'guida/citta',
  'covo-dei-ladri': 'guida/covo',
};

interface Props {
  mappa: Pick<MappaRiassuntoDto, 'immagineUrl' | 'asset' | 'assetOriginale' | 'nome'> & { chiave?: string };
  /** Testo alternativo; vuoto la rende decorativa (quando il nome è già scritto accanto). */
  etichetta?: string;
  className?: string;
}

export function AnteprimaMappa({ mappa, etichetta, className = '' }: Props) {
  // Il capofila di un gruppo non ha sempre la chiave del gruppo: quello del Covo è
  // `covo-dei-ladri-settore-dingresso`, non `covo-dei-ladri`. Si guarda quindi anche il prefisso,
  // altrimenti l'emblema c'è ma non lo prende nessuno — ed è quel che succedeva.
  const chiaveEmblema = mappa.chiave
    ? (EMBLEMA[mappa.chiave] ?? Object.entries(EMBLEMA).find(([k]) => mappa.chiave === k || mappa.chiave!.startsWith(`${k}-`))?.[1] ?? null)
    : null;
  const emblema = useAsset(chiaveEmblema);
  const asset = useAsset(mappa.asset);
  const originale = useAsset(mappa.assetOriginale);
  // L'emblema viene prima di tutto: e' la faccia del posto, non una sua pianta.
  const src = emblema ?? mappa.immagineUrl ?? asset ?? originale;
  return (
    <span className={`anteprima-mappa ${className}`}>
      {src
        ? <img src={src} alt={etichetta ?? ''} aria-hidden={etichetta ? undefined : true} loading="lazy" draggable={false} />
        : <span className="anteprima-mappa__vuota" aria-hidden="true"><IconMappa size={26} /></span>}
    </span>
  );
}
