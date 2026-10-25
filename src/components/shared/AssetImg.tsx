// ============================================================
// AssetImg — immagine da asset predefinito con fallback garantito
// ============================================================
//
// Mostra l'asset `nome` (chiave del manifest) se disponibile e se la grafica predefinita è attiva;
// altrimenti rende `fallback` (icona, testo, iniziali). Un errore di caricamento segna l'asset come
// mancante e passa al fallback: nessun riquadro rotto, mai.
//
// R12-03: con `dimensione` (la larghezza del riquadro in pixel CSS) l'immagine si chiede in miniatura (`srcset` e `sizes`, vedi
// `shared/miniature.ts`): le Persona e gli arcani, PNG da centinaia di KB, arrivano alla misura che serve; se la miniatura non si carica
// si ripiega UNA volta sull'originale prima di dichiarare l'asset mancante. Senza `dimensione` l'URL è quello del manifest, come prima.
// Le immagini sono pigre (`loading="lazy"`) e si decodificano fuori dal thread principale (`decoding="async"`).
// ============================================================

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useAsset, useAssetStore } from '../../stores/assetStore';
import { attributiMiniatura } from '../../../shared/miniature';

interface Props {
  nome: string | null | undefined;
  alt: string;
  fallback: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** true: l'immagine è decorativa (alt vuoto, aria-hidden). */
  decorativa?: boolean;
  /** Larghezza del riquadro in pixel CSS: chiede la miniatura adatta (`srcset`/`sizes`) invece del file pieno. */
  dimensione?: number;
  /** Il riquadro è quadrato: `width` e `height` dichiarati (`dimensione`) fanno riservare lo spazio prima che l'immagine arrivi. */
  quadrata?: boolean;
  /** true: l'immagine sta sopra la piega (navigazione, intestazioni) e si carica subito, senza attendere di entrare in vista. */
  subito?: boolean;
}

/** Immagine da asset predefinito con fallback. */
export function AssetImg({ nome, alt, fallback, className, style, decorativa, dimensione, quadrata, subito }: Props) {
  const url = useAsset(nome);
  const segnaMancante = useAssetStore((s) => s.segnaMancante);
  const [errore, setErrore] = useState<string | null>(null);
  // l'URL per cui la miniatura non si è caricata: per quello si usa l'originale (cambiato l'URL, si riprova con la miniatura)
  const [senzaMiniatura, setSenzaMiniatura] = useState<string | null>(null);
  if (!url || errore === url) return <>{fallback}</>;
  const miniatura = dimensione !== undefined && senzaMiniatura !== url ? attributiMiniatura(url, dimensione) : null;
  const conMiniatura = miniatura?.srcSet !== undefined;
  return (
    <img
      src={miniatura ? miniatura.src : url}
      srcSet={miniatura?.srcSet}
      sizes={miniatura?.sizes}
      alt={decorativa ? '' : alt}
      aria-hidden={decorativa ? true : undefined}
      className={className}
      style={style}
      width={quadrata ? dimensione : undefined}
      height={quadrata ? dimensione : undefined}
      loading={subito ? undefined : 'lazy'}
      decoding="async"
      draggable={false}
      onError={() => {
        if (conMiniatura) { setSenzaMiniatura(url); return; }
        setErrore(url);
        if (nome) segnaMancante(nome);
      }}
    />
  );
}
