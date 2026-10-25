// ============================================================
// AnteprimaPersona — miniatura non interattiva di una Persona (immagine caricata → asset `persona/<slug>` → `persona-gruppo/<slug>` → iniziali)
// ============================================================
//
// Da usare dentro pulsanti ed elenchi di scelta, dove il riquadro interattivo di ImmagineEntita non può stare.
// ============================================================

import { useEffect, useState } from 'react';
import { useAsset } from '../../stores/assetStore';
import { chiaviPresenti, urlImmagineVersionata } from './immaginiCache';
import { chiaviAssetPredefinito } from '../../utils/assetPredefiniti';
import { attributiMiniatura } from '../../../shared/miniature';

interface Props {
  /** Nome canonico (chiave dell'immagine e dell'asset). */
  nome: string;
  /** Nome mostrato nel testo alternativo e nelle iniziali. */
  etichetta?: string;
  dimensione?: number;
  className?: string;
  /** Mostra la figura intera (object-contain) su fondo scuro invece di ritagliarla. */
  contieni?: boolean;
}

/** Quadrato con l'immagine della Persona o le iniziali, senza comportamenti al tocco. */
export function AnteprimaPersona({ nome, etichetta, dimensione = 40, className, contieni }: Props) {
  const [caricata, setCaricata] = useState<boolean | null>(null);
  // l'URL per cui la miniatura non si è caricata: per quello si ripiega sul file pieno
  const [senzaMiniatura, setSenzaMiniatura] = useState<string | null>(null);
  // le Persona dei Ladri Fantasma (Arsène, Zorro, Mercurius, Diego…) stanno in `persona-gruppo/`: riserva dopo `persona/`, come nei Personaggi
  // `etichetta` è il nome italiano (dalla traduzione): serve per la chiave italiana di `persona-gruppo/` (Mercurius → mercurio)
  const [primaria, riserva, riservaIt] = chiaviAssetPredefinito('persona', nome, 'quadrata', dimensione, etichetta);
  const assetPrimario = useAsset(primaria);
  const assetRiserva = useAsset(riserva);
  const assetRiservaIt = useAsset(riservaIt);
  const asset = assetPrimario ?? assetRiserva ?? assetRiservaIt;
  useEffect(() => {
    let annullato = false;
    void chiaviPresenti('persona').then((set) => { if (!annullato) setCaricata(set.has(nome)); });
    return () => { annullato = true; };
  }, [nome]);
  const testo = etichetta ?? nome;
  const src = caricata ? urlImmagineVersionata('persona', nome) : asset;
  const iniziali = testo.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('');
  // R12-03: miniatura alla misura del riquadro (varianti degli asset del compendio o miniature del server); se non arriva, il file pieno
  const miniatura = src && senzaMiniatura !== src ? attributiMiniatura(src, dimensione) : null;
  return (
    <span className={`inline-flex items-center justify-center shrink-0 overflow-hidden bg-bg-tertiary border border-border ${className ?? ''}`} style={{ width: dimensione, height: dimensione }} aria-hidden={src ? undefined : true}>
      {src ? <img src={miniatura ? miniatura.src : src} srcSet={miniatura?.srcSet} sizes={miniatura?.sizes} alt={testo} className={`w-full h-full ${contieni ? 'object-contain p-[2px]' : 'object-cover'}`} loading="lazy" decoding="async" draggable={false} onError={() => { if (miniatura?.srcSet !== undefined) setSenzaMiniatura(src); }} /> : <span className="font-display text-text-muted" style={{ fontSize: Math.max(12, Math.round(dimensione / 2.6)) }}>{iniziali}</span>}
    </span>
  );
}
