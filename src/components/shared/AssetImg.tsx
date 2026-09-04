// ============================================================
// AssetImg — immagine da asset predefinito con fallback garantito
// ============================================================
//
// Mostra l'asset `nome` (chiave del manifest) se disponibile e se la grafica predefinita è attiva;
// altrimenti rende `fallback` (icona, testo, iniziali). Un errore di caricamento segna l'asset come
// mancante e passa al fallback: nessun riquadro rotto, mai.
// ============================================================

import { useState, type CSSProperties, type ReactNode } from 'react';
import { useAsset, useAssetStore } from '../../stores/assetStore';

interface Props {
  nome: string | null | undefined;
  alt: string;
  fallback: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** true: l'immagine è decorativa (alt vuoto, aria-hidden). */
  decorativa?: boolean;
}

/** Immagine da asset predefinito con fallback. */
export function AssetImg({ nome, alt, fallback, className, style, decorativa }: Props) {
  const url = useAsset(nome);
  const segnaMancante = useAssetStore((s) => s.segnaMancante);
  const [errore, setErrore] = useState<string | null>(null);
  if (!url || errore === url) return <>{fallback}</>;
  return (
    <img
      src={url}
      alt={decorativa ? '' : alt}
      aria-hidden={decorativa ? true : undefined}
      className={className}
      style={style}
      draggable={false}
      onError={() => {
        setErrore(url);
        if (nome) segnaMancante(nome);
      }}
    />
  );
}
