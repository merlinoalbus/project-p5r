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
  /** Chiave dell'asset mostrato a destra (es. `illustrazioni/intestazione-diario`). Se non è nel manifest o non si carica non c'è niente: nessuno spazio
   *  riservato, nessuna icona rotta (`fallback={null}`); appena il file è nel database compare da solo. Quadrata (512×512): il CSS ne dichiara
   *  l'altezza e il rapporto, così il suo arrivo non sposta il titolo. */
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
      {/* la figura sta accanto alla riga del titolo e delle azioni, non dentro: così non manda a capo le azioni su una riga a parte (l'intestazione
          non cresce oltre l'altezza della figura) e, se manca, il contorno è una riga sola come prima */}
      <div className="flex items-end gap-4 min-w-0">
      <div className={`min-w-0 flex-1 flex items-end gap-4 ${azioniInRiga && azioniAccanto ? 'flex-wrap max-md:flex-nowrap max-md:items-center max-md:gap-2 max-md:h-11 max-md:overflow-x-auto max-md:[overscroll-behavior-x:contain] max-md:[scrollbar-width:none]' : 'flex-wrap'}`}>
        {/* Titolo e sottotitolo partono da 14rem e crescono (non da 0, come con `flex-1`): con le azioni larghe accanto, sul telefono la
            colonna del testo scendeva a ~44 px, una parola per riga (il Compendio in errore, lotto B punto 9); ora le azioni vanno a capo */}
        <div className={`min-w-0 flex flex-col gap-2 ${azioniInRiga ? (azioniAccanto ? 'shrink-0' : 'md:shrink-0') : 'grow basis-[min(100%,14rem)]'}`}>
          <h1 className="titolo-tasselli m-0">{tasselliTitolo(titolo)}</h1>
          {/* da 768 px il sottotitolo si allarga (fino a 120 caratteri per riga): su due righe invece di tre, così l'intestazione resta entro il
              30% dell'altezza a 1280×689; sul telefono la colonna è già stretta e vale il limite di 78 */}
          {sottotitolo && <p className="m-0 testo-13 text-text-secondary max-w-[78ch] md:max-w-[120ch]">{sottotitolo}</p>}
          {children}
        </div>
        {azioni && <div className={azioniInRiga ? `flex items-center min-w-0 ${azioniAccanto ? 'max-md:flex-none md:basis-0 md:flex-1' : 'basis-full md:basis-0 md:flex-1'} md:justify-end` : 'flex items-center gap-2 flex-wrap'}>{azioni}</div>}
      </div>
      {/* la miniatura da 160 px (il riquadro è al più 120 px): WebP di pochi KB invece del PNG da 210–360 KB; `subito` resta, sta sopra la piega e
          con la miniatura caricarla senza attesa non costa */}
      {illustrazione && !nelPannello && <AssetImg nome={illustrazione} alt="" decorativa subito dimensione={160} className="intestazione__illustrazione" fallback={null} />}
      </div>
    </header>
  );
}
