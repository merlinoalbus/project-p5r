// ============================================================
// SagomaQuartiere — la stessa figura che il lettore ha appena toccato sulla mappa
// ============================================================
//
// Serve alle schede dei quartieri, e non è una miniatura qualsiasi: è **lo stesso disegno** della
// mappa composta, preso da `assetTokyoQuartiere`. Prima le schede chiedevano l'anteprima del nodo
// d'atlante `citta-<quartiere>`, che per quasi tutti non esiste: le miniature erano riquadri
// vuoti, e quando c'erano mostravano la planimetria — un'altra immagine, non quella di un attimo
// prima.
//
// La figura non si ricampiona e non si ritaglia: `object-contain` dentro un riquadro fisso, con lo
// stesso contorno bianco della mappa, così la scheda e il cartellino si riconoscono come la stessa
// cosa. Se il file manca davvero, l'immagine sparisce e resta il nome; non compare una figura
// estranea al suo posto.
// ============================================================

import { assetTokyoQuartiere, nascondiSagomaAssente } from './assetTokyo';

interface Props {
  chiave: string;
  /** Il nome serve al testo alternativo: la sagoma è informativa, non decorativa. */
  nome: string;
  larghezza?: number;
  altezza?: number;
  className?: string;
}

/** Le quattro ombre che seguono l'alfa: un contorno, non una cornice rettangolare. */
const CONTORNO = ['1px 0', '-1px 0', '0 1px', '0 -1px']
  .map((d) => `drop-shadow(${d} 0 #fff)`).join(' ');

export function SagomaQuartiere({ chiave, nome, larghezza = 112, altezza = 84, className = '' }: Props) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-[#7d0010] ${className}`}
      style={{ width: larghezza, height: altezza }}
    >
      <img
        src={assetTokyoQuartiere(chiave)}
        alt={`Sagoma di ${nome} sulla mappa di Tokyo`}
        onError={nascondiSagomaAssente}
        draggable={false}
        className="max-h-[82%] max-w-[82%] object-contain"
        style={{ filter: CONTORNO }}
      />
    </span>
  );
}
