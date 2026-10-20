// ============================================================
// AnteprimaMappa — la faccia di un luogo dell'atlante
// ============================================================
//
// L'indice delle mappe era un elenco di titoli: undici radici e centinaia di planimetrie, tutte
// scritte uguali. Ma una mappa **si riconosce guardandola**, non leggendone il nome: la planimetria
// del Cancello del castello e quella della Sala centrale hanno due forme che si distinguono in un
// istante, e due nomi che si distinguono in tre secondi.
//
// Da dove viene l'immagine (L1, 2026-10-20): **la stessa del visore**, con la regola unica di
// `useImmagineMappa` — la caricata nell'istanza, poi l'asset dichiarato della mappa. Solo se la mappa
// non ha né l'una né l'altro, Tokyo e il Covo mostrano il loro stemma; se non c'è nulla resta un
// riquadro col simbolo della mappa: **un contenitore vuoto è un'informazione** — vuol dire che quel
// nodo raccoglie altre mappe e non è una planimetria.
// ============================================================

import { useAsset } from '../../stores/assetStore';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import { IconMappa } from '../shared/iconeGuida';
import { srcsetMiniature, urlMiniatura } from '../../../shared/miniature';
import type { MappaRiassuntoDto } from '../../types';

/** Le radici che hanno un **emblema** come ultimo ripiego.
 *
 * In una griglia in cui tutti gli altri hanno una figura, un riquadro vuoto per Tokyo o per il Covo
 * si legge come un errore di caricamento: lì vale l'emblema — la citta' col treno sotto il sole
 * rosso, il Covo con la sua stella. Ma **solo dove la mappa non ha un'immagine sua** (caricata o asset
 * dichiarato): prima veniva prima dell'asset, e senza un'immagine caricata l'indice mostrava lo stemma
 * mentre il visore mostrava l'asset `mappe/tokyo` — due figure per la stessa mappa (L1, rilievo F2). */
const EMBLEMA: Record<string, string> = {
  tokyo: 'guida/citta',
  'covo-dei-ladri': 'guida/covo',
};

interface Props {
  mappa: Pick<MappaRiassuntoDto, 'immagineUrl' | 'asset' | 'nome'> & { chiave?: string };
  /** Testo alternativo; vuoto la rende decorativa (quando il nome è già scritto accanto). */
  etichetta?: string;
  className?: string;
  /** Quanto è larga la miniatura sullo schermo (attributo `sizes`): il browser sceglie la miniatura della misura giusta invece
   *  dell'originale (variante «miniature» di L1). Predefinito: i 72 px dell'indice delle Mappe. */
  sizes?: string;
}

/** Miniatura di una mappa: l'immagine del visore (caricata, poi asset dichiarato); senza, l'emblema se la chiave (o il suo
 * prefisso) ne ha uno; senza nessuna immagine un riquadro col simbolo della mappa. `etichetta` assente o vuota la rende decorativa. */
export function AnteprimaMappa({ mappa, etichetta, className = '', sizes = '72px' }: Props) {
  const immagine = useImmagineMappa(mappa);
  // Il capofila di un gruppo non ha sempre la chiave del gruppo: quello del Covo è
  // `covo-dei-ladri-settore-dingresso`, non `covo-dei-ladri`. Si guarda quindi anche il prefisso,
  // altrimenti l'emblema c'è ma non lo prende nessuno — ed è quel che succedeva.
  const chiaveEmblema = mappa.chiave && !immagine
    ? (EMBLEMA[mappa.chiave] ?? Object.entries(EMBLEMA).find(([k]) => mappa.chiave!.startsWith(`${k}-`))?.[1] ?? null)
    : null;
  const emblema = useAsset(chiaveEmblema);
  const src = immagine ?? emblema;
  // miniature solo per le immagini servite dal database; un asset statico resta com'è, senza `srcset`
  const srcSet = src ? srcsetMiniature(src) : '';
  return (
    <span className={`anteprima-mappa ${className}`}>
      {src
        ? <img src={urlMiniatura(src, 320)} srcSet={srcSet || undefined} sizes={srcSet ? sizes : undefined} alt={etichetta ?? ''} aria-hidden={etichetta ? undefined : true} loading="lazy" draggable={false} />
        : <span className="anteprima-mappa__vuota" aria-hidden="true"><IconMappa size={26} /></span>}
    </span>
  );
}
