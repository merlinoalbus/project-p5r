// ============================================================
// AnteprimaMappa — la faccia di un luogo dell'atlante
// ============================================================
//
// L'indice delle mappe era un elenco di titoli: undici radici e centinaia di planimetrie, tutte
// scritte uguali. Ma una mappa **si riconosce guardandola**, non leggendone il nome: la planimetria
// del Cancello del castello e quella della Sala centrale hanno due forme che si distinguono in un
// istante, e due nomi che si distinguono in tre secondi.
//
// Da dove viene l'immagine (L1, 2026-10-20): **quella caricata nell'istanza vince sempre**, come in
// ogni altra vista (`useImmagineMappa`); senza, Tokyo e il Covo mostrano il loro stemma, le altre
// l'asset dichiarato della mappa. Se non c'è nulla resta un riquadro col simbolo della mappa: **un
// contenitore vuoto è un'informazione** — vuol dire che quel nodo raccoglie altre mappe e non è una
// planimetria.
// ============================================================

import { useAsset } from '../../stores/assetStore';
import { IconMappa } from '../shared/iconeGuida';
import type { MappaRiassuntoDto } from '../../types';

/** Le radici che hanno un **emblema** come ripiego della pianta.
 *
 * Tokyo e il Covo, senza un'immagine caricata, mostrerebbero la planimetria, che a 100 px e' una
 * macchia di linee: in una griglia in cui tutti gli altri hanno una figura, due riquadri di
 * planimetria si leggono come un errore di caricamento. L'emblema — la citta' col treno sotto il sole
 * rosso, il Covo con la sua stella — vale pero' **solo dove l'utente non ha caricato un'immagine**:
 * prima copriva anche quella di Tokyo, e l'indice mostrava una figura diversa dal visore (L1). */
const EMBLEMA: Record<string, string> = {
  tokyo: 'guida/citta',
  'covo-dei-ladri': 'guida/covo',
};

interface Props {
  mappa: Pick<MappaRiassuntoDto, 'immagineUrl' | 'asset' | 'nome'> & { chiave?: string };
  /** Testo alternativo; vuoto la rende decorativa (quando il nome è già scritto accanto). */
  etichetta?: string;
  className?: string;
}

/** Miniatura di una mappa: l'immagine caricata, altrimenti l'emblema se la chiave (o il suo prefisso) ne ha uno, altrimenti
 * l'asset dichiarato; senza nessuna immagine un riquadro col simbolo della mappa. `etichetta` assente o vuota la rende decorativa. */
export function AnteprimaMappa({ mappa, etichetta, className = '' }: Props) {
  // Il capofila di un gruppo non ha sempre la chiave del gruppo: quello del Covo è
  // `covo-dei-ladri-settore-dingresso`, non `covo-dei-ladri`. Si guarda quindi anche il prefisso,
  // altrimenti l'emblema c'è ma non lo prende nessuno — ed è quel che succedeva.
  const chiaveEmblema = mappa.chiave && !mappa.immagineUrl
    ? (EMBLEMA[mappa.chiave] ?? Object.entries(EMBLEMA).find(([k]) => mappa.chiave === k || mappa.chiave!.startsWith(`${k}-`))?.[1] ?? null)
    : null;
  const emblema = useAsset(chiaveEmblema);
  const asset = useAsset(mappa.immagineUrl ? null : mappa.asset);
  const src = mappa.immagineUrl ?? emblema ?? asset;
  return (
    <span className={`anteprima-mappa ${className}`}>
      {src
        ? <img src={src} alt={etichetta ?? ''} aria-hidden={etichetta ? undefined : true} loading="lazy" draggable={false} />
        : <span className="anteprima-mappa__vuota" aria-hidden="true"><IconMappa size={26} /></span>}
    </span>
  );
}
