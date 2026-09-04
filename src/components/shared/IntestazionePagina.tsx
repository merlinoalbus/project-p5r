// ============================================================
// IntestazionePagina — intestazione «hero» comune: titolo a tasselli, sottotitolo, azioni, illustrazione
// ============================================================
//
// Il titolo (h1, uno per pagina) è composto in tasselli stile Persona 5: ogni parola su un cartiglio
// inclinato, con il carattere «display». Gli spazi fra le parole restano nel DOM, così il nome accessibile
// dell'intestazione è il testo completo. L'illustrazione è un asset predefinito facoltativo (assente → nulla).
// ============================================================

import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AssetImg } from './AssetImg';
import { IconChevronLeft } from './icons';

interface Indietro {
  etichetta: string;
  to?: string;
  onClick?: () => void;
}

interface Props {
  titolo: ReactNode;
  sottotitolo?: ReactNode;
  /** Pulsanti o controlli allineati a destra del titolo. */
  azioni?: ReactNode;
  /** Chiave dell'asset predefinito mostrato a destra (es. `illustrazioni/vuoto-partita-senza-testo`). */
  illustrazione?: string | null;
  /** Collegamento «indietro» sopra il titolo. */
  indietro?: Indietro;
  /** Riga aggiuntiva sotto il sottotitolo (chip, filtri). */
  children?: ReactNode;
  /** Versione compatta (titolo più piccolo, nessun margine extra). */
  compatta?: boolean;
  className?: string;
}

/** Suddivide un titolo testuale in tasselli; un titolo già composto (nodo React) resta un solo tassello. */
function tasselliTitolo(titolo: ReactNode): ReactNode {
  if (typeof titolo !== 'string') return <span className="tassello">{titolo}</span>;
  const parole = titolo.trim().split(/\s+/).filter(Boolean);
  return parole.map((parola, i) => (
    <Fragment key={`${i}-${parola}`}>
      {i > 0 && ' '}
      <span className="tassello">{parola}</span>
    </Fragment>
  ));
}

/** Intestazione di pagina con titolo a tasselli e spazio per sottotitolo, azioni e illustrazione. */
export function IntestazionePagina({ titolo, sottotitolo, azioni, illustrazione, indietro, children, compatta, className }: Props) {
  return (
    <header className={`intestazione ${compatta ? 'intestazione--compatta' : ''} ${className ?? ''}`}>
      {indietro && (indietro.to ? (
        <Link to={indietro.to} className="btn btn-ghost btn-sm self-start -ml-2 no-underline"><IconChevronLeft size={16} /> {indietro.etichetta}</Link>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm self-start -ml-2" onClick={indietro.onClick}><IconChevronLeft size={16} /> {indietro.etichetta}</button>
      ))}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="min-w-0 flex-1 flex flex-col gap-2">
          <h1 className="titolo-tasselli m-0">{tasselliTitolo(titolo)}</h1>
          {sottotitolo && <p className="m-0 text-[13px] text-text-secondary max-w-[78ch]">{sottotitolo}</p>}
          {children}
        </div>
        {azioni && <div className="flex items-center gap-2 flex-wrap">{azioni}</div>}
        {illustrazione && <AssetImg nome={illustrazione} alt="" decorativa className="intestazione__illustrazione" fallback={null} />}
      </div>
    </header>
  );
}
