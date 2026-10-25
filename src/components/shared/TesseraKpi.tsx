// ============================================================
// TesseraKpi — la tessera di un conteggio (numero grande ed etichetta), scritta una volta sola
// ============================================================
//
// Prima del lotto C le tessere `.kpi-tile` erano scritte a mano in sei file, ciascuno con il suo ordine di numero ed
// etichetta e con il segno (§27) messo o no. Qui la struttura è una: il numero (`.kpi-value`), l'etichetta (`.kpi-label`,
// con il segno se c'è) e una nota facoltativa sotto. Con `to` la tessera è un collegamento; `compatta` è la variante della
// Home. Lo stile resta quello di `.kpi-tile` in src/tailwind.css.
// ============================================================

import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { IconaSegno, type ChiaveSegno } from './IconaAzione';

interface Props {
  /** Il numero (o il «3/10») mostrato in grande. */
  valore: ReactNode;
  /** L'etichetta del conteggio. */
  etichetta: ReactNode;
  /** Il segno del dato davanti all'etichetta (§27). */
  segno?: ChiaveSegno;
  /** Una riga di nota sotto il numero (es. «12 di 30»). */
  nota?: ReactNode;
  /** L'etichetta sopra il numero invece che sotto. */
  etichettaSopra?: boolean;
  /** Variante compatta (Home). */
  compatta?: boolean;
  /** Se c'è, la tessera è un collegamento a questo indirizzo. */
  to?: string;
  /** Il nome intero, come suggerimento, quando l'etichetta visibile può finire in «…» (testo molto ingrandito). */
  titolo?: string;
  className?: string;
  style?: CSSProperties;
}

/** Tessera di un conteggio: numero, etichetta (con il segno, se c'è) e nota; un collegamento se ha `to`. */
export function TesseraKpi({ valore, etichetta, segno, nota, etichettaSopra, compatta, to, titolo, className, style }: Props) {
  const classi = `kpi-tile ${compatta ? 'kpi-tile--compatto' : ''} ${to ? 'no-underline text-text' : ''} ${className ?? ''}`;
  const testoEtichetta = <span className={`kpi-label ${segno ? 'kpi-label--segno' : ''}`} title={titolo}>{segno && <IconaSegno chiave={segno} />}{etichetta}</span>;
  const contenuto = <>
    {etichettaSopra && testoEtichetta}
    <span className="kpi-value">{valore}</span>
    {!etichettaSopra && testoEtichetta}
    {nota && <span className="testo-12 text-text-muted">{nota}</span>}
  </>;
  return to
    ? <Link to={to} className={classi} style={style}>{contenuto}</Link>
    : <div className={classi} style={style}>{contenuto}</div>;
}
