// ============================================================
// MiniaturaMappa — copertina di un quartiere: la mappa scaricata nell'istanza (ambito «mappa», chiave `citta-<quartiere>`), altrimenti l'icona
// ============================================================

import { useEffect, useState } from 'react';
import { urlImmagine } from '../../services/api';
import { chiaviPresenti } from '../shared/immaginiCache';
import { IconMappa } from '../shared/iconeGuida';

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
  useEffect(() => {
    let annullato = false;
    void chiaviPresenti('mappa').then((set) => { if (!annullato) setPresente(set.has(chiave)); });
    return () => { annullato = true; };
  }, [chiave]);
  return (
    <span className={`miniatura-mappa ${className ?? ''}`} style={{ width: larghezza, height: altezza }}>
      {presente ? (
        <img src={urlImmagine('mappa', chiave)} alt={`Mappa: ${etichetta}`} className="w-full h-full object-cover" draggable={false} />
      ) : (
        <span className="text-text-muted" aria-hidden="true"><IconMappa size={Math.round(altezza * 0.45)} /></span>
      )}
    </span>
  );
}
