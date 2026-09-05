// ============================================================
// PulsanteVisivo — pulsante (o collegamento) a tassello a immagine prevalente: icona grande (40 px, 32 px compatta, 48 px a colonna),
// titolo in carattere «display» piccolo e dettaglio: sostituisce i pulsanti grigi di solo testo
// ============================================================
//
// Toni: primario (rosso), secondario (bianco su nero), fantasma (senza sfondo), pericolo (rosso sul bordo). Con `attivo` un
// interruttore acceso passa al tono primario. L'icona è decorativa: il nome accessibile resta il testo (titolo + dettaglio) o l'aria-label.
// La dimensione dell'icona la impone il CSS del pulsante (`--btn-visivo-icona`, tailwind.css): la `dimensione` passata a IconaAzione
// / IconaSpillo / AssetImg vale solo come riserva fuori dal pulsante.
// ============================================================

import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router-dom';

export type TonoPulsante = 'primario' | 'secondario' | 'fantasma' | 'pericolo';

/** `riga` (default): icona a sinistra del testo, 44 px di altezza. `colonna`: tassello esteso con l'icona (48 px) sopra al testo centrato, per i gruppi di interruttori. */
export type DisposizionePulsante = 'riga' | 'colonna';

interface Base {
  /** Icona decorativa; la dimensione (40 px, 32 px compatto, 48 px a colonna) la impone il pulsante via CSS, qualunque `dimensione` le venga passata. */
  icona: ReactNode;
  titolo: ReactNode;
  dettaglio?: ReactNode;
  tono?: TonoPulsante;
  /** Interruttore acceso: tono primario e aria-pressed. */
  attivo?: boolean;
  /** Meno spazio attorno (elenchi fitti): icona 32 px e titolo 13 px, sempre 44 px di altezza. */
  compatto?: boolean;
  /** Disposizione del tassello; `colonna` ignora `compatto` per l'icona (48 px). */
  disposizione?: DisposizionePulsante;
  className?: string;
}

const CLASSE_TONO: Record<TonoPulsante, string> = { primario: 'btn-primary', secondario: 'btn-secondary', fantasma: 'btn-ghost', pericolo: 'btn-danger' };

function classi({ tono = 'secondario', attivo, compatto, disposizione = 'riga', className }: Base): string {
  return `btn btn-sm btn-visivo ${attivo ? 'btn-primary' : CLASSE_TONO[tono]} ${compatto ? 'btn-visivo--compatto' : ''} ${disposizione === 'colonna' ? 'btn-visivo--colonna' : ''} ${className ?? ''}`;
}

function Contenuto({ icona, titolo, dettaglio }: Pick<Base, 'icona' | 'titolo' | 'dettaglio'>) {
  return (
    <>
      <span className="btn-visivo__icona" aria-hidden="true">{icona}</span>
      <span className="btn-visivo__testo">
        <span className="btn-visivo__titolo">{titolo}</span>
        {dettaglio !== undefined && dettaglio !== null && dettaglio !== '' && <>{' '}<span className="btn-visivo__dettaglio">{dettaglio}</span></>}
      </span>
    </>
  );
}

type PropsPulsante = Base & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'className'>;

/** Pulsante a tassello con icona e titolo; `attivo` lo rende un interruttore acceso. */
export function PulsanteVisivo({ icona, titolo, dettaglio, tono, attivo, compatto, disposizione, className, type = 'button', ...resto }: PropsPulsante) {
  return (
    <button type={type} className={classi({ icona, titolo, tono, attivo, compatto, disposizione, className })} aria-pressed={attivo === undefined ? undefined : attivo} {...resto}>
      <Contenuto icona={icona} titolo={titolo} dettaglio={dettaglio} />
    </button>
  );
}

type PropsCollegamento = Base & { to: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'children' | 'className' | 'href'>;

/** Collegamento interno con lo stesso aspetto del pulsante. */
export function CollegamentoVisivo({ icona, titolo, dettaglio, tono, attivo, compatto, disposizione, className, to, ...resto }: PropsCollegamento) {
  return (
    <Link to={to} className={`${classi({ icona, titolo, tono, attivo, compatto, disposizione, className })} no-underline`} {...resto}>
      <Contenuto icona={icona} titolo={titolo} dettaglio={dettaglio} />
    </Link>
  );
}
