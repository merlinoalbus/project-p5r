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
import { useInPannello } from '../scheda/contestoScheda';

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
  /** Le azioni sono una fila che scorre (`FilaScorrevole`): da 768 px stanno accanto al titolo e prendono lo spazio che resta (scorrendo
   *  se non basta) invece di mandare a capo il titolo; sul telefono vanno su una riga sola sotto il titolo. */
  azioniInRiga?: boolean;
  /** Con `azioniInRiga`: anche sul telefono le azioni stanno sulla riga del titolo (e scorrono), invece di andare sotto. */
  azioniAccanto?: boolean;
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
export function IntestazionePagina({ titolo, sottotitolo, azioni, illustrazione, indietro: indietroPagina, children, compatta: compattaPagina, azioniInRiga, azioniAccanto, className }: Props) {
  // R10-27: nel pannello sopra il diario l'intestazione è compatta, senza illustrazione e senza «indietro» (la testa del pannello ha il suo)
  const nelPannello = useInPannello();
  const indietro = nelPannello ? undefined : indietroPagina;
  const compatta = nelPannello || compattaPagina;
  return (
    <header className={`intestazione ${compatta ? 'intestazione--compatta' : ''} ${className ?? ''}`}>
      {indietro && (indietro.to ? (
        <Link to={indietro.to} className="btn btn-ghost btn-sm self-start -ml-2 no-underline"><IconChevronLeft size={16} /> {indietro.etichetta}</Link>
      ) : (
        <button type="button" className="btn btn-ghost btn-sm self-start -ml-2" onClick={indietro.onClick}><IconChevronLeft size={16} /> {indietro.etichetta}</button>
      ))}
      <div className={`flex items-end gap-4 ${azioniInRiga && azioniAccanto ? 'flex-nowrap max-md:items-center max-md:gap-2 max-md:h-11 max-md:overflow-x-automax-md:[scrollbar-width:none]' : 'flex-wrap'}`}>
        <div className={`min-w-0 flex flex-col gap-2 ${azioniInRiga ? (azioniAccanto ? 'shrink-0' : 'md:shrink-0') : 'flex-1'}`}>
          <h1 className="titolo-tasselli m-0">{tasselliTitolo(titolo)}</h1>
          {sottotitolo && <p className="m-0 text-[13px] text-text-secondary max-w-[78ch]">{sottotitolo}</p>}
          {children}
        </div>
        {azioni && <div className={azioniInRiga ? `flex items-center min-w-0 ${azioniAccanto ? 'max-md:flex-none md:basis-0 md:flex-1' : 'basis-full md:basis-0 md:flex-1'} md:justify-end` : 'flex items-center gap-2 flex-wrap'}>{azioni}</div>}
        {illustrazione && !nelPannello && <AssetImg nome={illustrazione} alt="" decorativa className="intestazione__illustrazione" fallback={null} />}
      </div>
    </header>
  );
}
