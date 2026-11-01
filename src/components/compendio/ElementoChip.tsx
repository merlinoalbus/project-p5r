// ============================================================
// ElementoChip — etichetta colorata dell'elemento di una skill
// ============================================================

import { coloreElemento, coloreTestoElemento } from '../../utils/elementi';
import { AssetImg } from '../shared/AssetImg';

interface Props {
  elemento: string;
  nome: string;
  piccolo?: boolean;
  /** true: chip di secondo piano (le resistenze, accanto alle debolezze): niente velo e bordo neutro, al posto dell'opacità, che abbassava
   *  il testo sotto 4,5:1. Il testo e l'icona restano del colore dell'elemento, a contrasto pieno. */
  attenuato?: boolean;
}

/** Chip con il colore dell'elemento e il nome italiano. */
export function ElementoChip({ elemento, nome, piccolo, attenuato }: Props) {
  const colore = coloreElemento(elemento);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap ${piccolo ? 'pl-1.5 pr-2 py-0.5 testo-12' : 'pl-2 pr-3 py-1 testo-13'}`}
      style={attenuato
        ? { borderColor: 'var(--color-border)', color: coloreTestoElemento(elemento), background: 'transparent' }
        : { borderColor: colore, color: coloreTestoElemento(elemento), background: `color-mix(in srgb, ${colore} 14%, transparent)` }}
    >
      <AssetImg
        nome={`elementi/${elemento}`}
        alt=""
        decorativa
        className={piccolo ? 'w-5 h-5 object-contain' : 'w-7 h-7 object-contain'}
        fallback={<span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colore }} aria-hidden="true" />}
      />
      {nome}
    </span>
  );
}
