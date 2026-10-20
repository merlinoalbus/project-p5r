// ============================================================
// IllustrazioneConSegno — l'illustrazione di un posto, piena, con il suo segno appoggiato sopra (L1, 2026-10-20)
// ============================================================
//
// Scelta dell'utente («Illustrazione anche nelle schede»): le schede dei quartieri e le intestazioni del quartiere e del
// Palazzo mostrano l'illustrazione della mappa del posto (la caricata, poi l'asset dichiarato: `useImmagineMappa`), e la
// sagoma o lo stemma ci stanno sopra come segno, in un angolo. La metro resta con sagome e stemmi.
//
// **L'illustrazione occupa il suo riquadro, al 100%**, non fa da sfondo velato dietro al testo: è la regola che l'utente ha
// dato per le figure della guida («i decori li voglio non come sfondo dietro ma come immagini che spostano il contenuto di
// testo con opacità al 100%»). Senza illustrazione resta il solo segno, com'era prima: `senza` decide come.
//
// **Il riquadro ha la proporzione dell'immagine** (decisione del PM su LAY-1, 2026-10-21): le illustrazioni caricate sono 16:9,
// le quattro che vengono dall'asset (Kichijoji, Ikebukuro, Nakano, Santuario Meiji) 4:3, e in un riquadro fisso 16:9 con
// `cover` perdevano un quarto dell'altezza. Lo spazio che il riquadro occupa nella scheda resta lo stesso (largo quanto dice
// `className`, alto quanto un 16:9 di quella larghezza): dentro, il riquadro è alto quanto lo spazio e largo quanto la
// proporzione dell'immagine, letta al caricamento e tenuta fra 4:3 e 16:9. Così l'altezza della scheda e l'inizio del testo non
// cambiano da un quartiere all'altro. Un'immagine fuori da quella forbice si mostra intera (`contain`) se riempirla taglierebbe
// più del 5%.
//
// Si scarica la **miniatura** della misura che serve (`srcset` + `sizes`, `shared/miniature.ts`): le illustrazioni sono PNG da
// ~2 MB, e La città ne mostra diciannove in riquadri da 112–128 px.
// ============================================================

import { useState, type CSSProperties, type ReactNode, type SyntheticEvent } from 'react';
import { useImmagineMappa } from '../../hooks/useImmagineMappa';
import type { IllustrazioneDto } from '../../types';
import { srcsetMiniature, urlMiniatura } from '../../../shared/miniature';

/** La forbice delle proporzioni del riquadro (larghezza / altezza): da 4:3 a 16:9. */
const PROPORZIONE_MINIMA = 4 / 3;
const PROPORZIONE_MASSIMA = 16 / 9;
/** Quanto si può tagliare per riempire il riquadro quando l'immagine esce dalla forbice: oltre, si mostra intera. */
const TAGLIO_AMMESSO = 0.05;

interface Props {
  illustrazione: IllustrazioneDto | null | undefined;
  /** Il segno del posto (sagoma o stemma), appoggiato nell'angolo in basso a sinistra dell'illustrazione; nascosto ai lettori di
   *  schermo, perché l'`alt` dice già quale posto è. */
  segno: ReactNode;
  /** Che cosa mostrare se il posto non ha un'illustrazione: di norma il segno a grandezza piena. */
  senza: ReactNode;
  /** Testo alternativo dell'illustrazione (è informativa: dice quale posto è). */
  alt: string;
  /** Larghezza e posizione dello spazio che l'illustrazione occupa (classi Tailwind); l'altezza è quella di un 16:9 di quella
   *  larghezza. */
  className?: string;
  /** Spenta: l'illustrazione si attenua come il segno di un posto non ancora aperto. */
  spenta?: boolean;
  /** Quanto è largo lo spazio sullo schermo (attributo `sizes`, misurato sul CSS di chi lo usa): il browser sceglie la miniatura
   *  della misura giusta per larghezza e densità (variante «miniature» di L1) invece di scaricare l'originale da ~2 MB. */
  sizes: string;
}

/** L'illustrazione piena in un riquadro con la sua proporzione e il segno sopra; senza illustrazione, `senza`. */
export function IllustrazioneConSegno({ illustrazione, segno, senza, alt, className = '', spenta = false, sizes }: Props) {
  const src = useImmagineMappa(illustrazione);
  // la proporzione vera dell'immagine, letta al caricamento; vale solo per l'immagine da cui è stata letta
  const [letta, setLetta] = useState<{ src: string; proporzione: number } | null>(null);
  if (!src) return <>{senza}</>;
  const vera = letta?.src === src ? letta.proporzione : PROPORZIONE_MASSIMA;
  const proporzione = Math.min(PROPORZIONE_MASSIMA, Math.max(PROPORZIONE_MINIMA, vera));
  // riempire il riquadro taglia la parte dell'immagine che eccede la sua proporzione: fino al 5% si riempie, oltre si mostra intera
  const taglio = 1 - Math.min(vera, proporzione) / Math.max(vera, proporzione);
  const leggi = (e: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: l, naturalHeight: a } = e.currentTarget;
    if (l > 0 && a > 0) setLetta({ src, proporzione: l / a });
  };
  // la miniatura da 320 px è il ripiego per chi non legge `srcset`; per un URL che non è del database (asset statico) restano
  // l'URL com'è e nessun `srcset`
  const srcSet = srcsetMiniature(src);
  return (
    <span className={`illustrazione-segno ${className}`}>
      <span className={`illustrazione-segno__riquadro ${spenta ? 'illustrazione-segno--spenta' : ''}`} style={{ '--proporzione': proporzione } as CSSProperties}>
        <img src={urlMiniatura(src, 320)} srcSet={srcSet || undefined} sizes={srcSet ? sizes : undefined} alt={alt} loading="lazy" decoding="async"
          draggable={false} onLoad={leggi} className="illustrazione-segno__immagine" style={{ objectFit: taglio > TAGLIO_AMMESSO ? 'contain' : 'cover' }} />
        {/* il segno ripete il posto che l'`alt` dell'illustrazione e il nome accanto dicono già: per i lettori di schermo è doppio */}
        <span className="illustrazione-segno__segno" aria-hidden="true">{segno}</span>
      </span>
    </span>
  );
}
