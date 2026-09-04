// ============================================================
// MiniaturaMappa — copertina di un quartiere: la mappa dell'istanza (ambito «mappa», chiave `citta-<quartiere>`), altrimenti l'asset `mappe/<chiave>`, altrimenti l'icona
// ============================================================

import { useEffect, useState } from 'react';
import { urlImmagine } from '../../services/api';
import { chiaviPresenti } from '../shared/immaginiCache';
import { IconMappa } from '../shared/iconeGuida';
import { useAsset } from '../../stores/assetStore';

interface Props {
  chiave: string;
  etichetta: string;
  larghezza?: number;
  altezza?: number;
  className?: string;
}

/** Miniatura con la mappa dell'istanza se già scaricata (la scheda del quartiere la scarica al primo accesso). */
export function MiniaturaMappa({ chiave, etichetta, larghezza = 120, altezza = 80, className }: Props) {
  const [presente, setPresente] = useState<boolean | null>(null);
  const asset = useAsset(`mappe/${chiave}`);
  useEffect(() => {
    let annullato = false;
    void chiaviPresenti('mappa').then((set) => { if (!annullato) setPresente(set.has(chiave)); });
    return () => { annullato = true; };
  }, [chiave]);
  return (
    <span className={`miniatura-mappa ${className ?? ''}`} style={{ width: larghezza, height: altezza }}>
      {presente || asset ? (
        <img src={presente ? urlImmagine('mappa', chiave) : asset!} alt={`Mappa: ${etichetta}`} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <span className="text-text-muted" aria-hidden="true"><IconMappa size={Math.round(altezza * 0.45)} /></span>
      )}
    </span>
  );
}
