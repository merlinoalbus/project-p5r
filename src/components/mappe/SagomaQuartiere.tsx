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
import { contornoSagoma } from '../../utils/contornoSagoma';

interface Props {
  chiave: string;
  /** Il nome serve al testo alternativo: la sagoma è informativa, non decorativa. */
  nome: string;
  /** Accesa quando è il quartiere scelto sulla mappa: stesso oro dei cartellini. */
  acceso?: boolean;
  larghezza?: number;
  altezza?: number;
  className?: string;
}

/** Le quattro ombre che seguono l'alfa: un contorno, non una cornice rettangolare.
 *
 * Il fondo del riquadro è **trasparente**: era rosso, per richiamare la tela della mappa, ma su
 * una scheda scura diventava una macchia che rubava l'occhio al nome. Il contorno bianco basta a
 * staccare la figura, ed è lo stesso della mappa. */
const CONTORNO = contornoSagoma('#fff');
const CONTORNO_ORO = `${contornoSagoma('#ffd23f', 2)} brightness(1.05)`;

/** La sagoma del quartiere in un riquadro fisso (112×84 predefinito), col contorno bianco o, se
 * `acceso`, oro e leggermente ingrandita; se il file manca l'immagine si nasconde. */
export function SagomaQuartiere({ chiave, nome, acceso = false, larghezza = 112, altezza = 84, className = '' }: Props) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center ${className}`}
      style={{ width: larghezza, height: altezza }}
    >
      <img
        src={assetTokyoQuartiere(chiave)}
        alt={`Sagoma di ${nome} sulla mappa di Tokyo`}
        onError={nascondiSagomaAssente}
        draggable={false}
        className={`max-h-full max-w-full object-contain transition-transform duration-150 ${acceso ? 'scale-[1.08]' : ''}`}
        style={{ filter: acceso ? CONTORNO_ORO : CONTORNO }}
      />
    </span>
  );
}
