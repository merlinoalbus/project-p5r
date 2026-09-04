// ============================================================
// AnteprimaPersona — miniatura non interattiva di una Persona (immagine caricata → asset `persona/<slug>` → iniziali)
// ============================================================
//
// Da usare dentro pulsanti ed elenchi di scelta, dove il riquadro interattivo di ImmagineEntita non può stare.
// ============================================================

import { useEffect, useState } from 'react';
import { urlImmagine } from '../../services/api';
import { useAsset } from '../../stores/assetStore';
import { chiaviPresenti } from './immaginiCache';
import { slug } from '../../../shared/slug';

interface Props {
  /** Nome canonico (chiave dell'immagine e dell'asset). */
  nome: string;
  /** Nome mostrato nel testo alternativo e nelle iniziali. */
  etichetta?: string;
  dimensione?: number;
  className?: string;
}

/** Quadrato con l'immagine della Persona o le iniziali, senza comportamenti al tocco. */
export function AnteprimaPersona({ nome, etichetta, dimensione = 40, className }: Props) {
  const [caricata, setCaricata] = useState<boolean | null>(null);
  const asset = useAsset(`persona/${slug(nome)}`);
  useEffect(() => {
    let annullato = false;
    void chiaviPresenti('persona').then((set) => { if (!annullato) setCaricata(set.has(nome)); });
    return () => { annullato = true; };
  }, [nome]);
  const testo = etichetta ?? nome;
  const src = caricata ? urlImmagine('persona', nome) : asset;
  const iniziali = testo.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  return (
    <span className={`inline-flex items-center justify-center shrink-0 overflow-hidden bg-bg-tertiary border border-border ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} aria-hidden={src ? undefined : true}>
      {src ? <img src={src} alt={testo} className="w-full h-full object-cover" draggable={false} /> : <span className="font-display text-text-muted" style={{ fontSize: Math.max(12, Math.round(dimensione / 2.6)) }}>{iniziali}</span>}
    </span>
  );
}
