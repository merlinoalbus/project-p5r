// ============================================================
// IntestazioneScheda — l'intestazione comune delle schede di dettaglio (lotto B, revisione UX/UI del 2026-10-25)
// ============================================================
//
// Le schede di dettaglio (Persona, Skill, Confidente, Negozio, Luogo, Quartiere, Oggetto, Ombra, Mappa, «Dove si trova», Area,
// Palazzo) scrivevano a mano titolo e «Indietro»: icona da 16 o da 18, `btn-sm` sì e no, `navigate(-1)` qui e una rotta fissa là, e il
// titolo con dimensioni scritte sopra (`testo-24`). Qui c'è una ricetta sola, in quattro pezzi che si usano anche da soli dove la
// testata ha una disposizione sua (Area e Palazzo, misurate al pixel per il 30% e per R3-41):
//
// - `IndietroScheda`: il ritorno. **Un solo comportamento**: torna alla pagina di prima dell'app (`navigate(-1)`), così si ritrovano
//   filtri, scorrimento e diario da cui si è partiti; se la scheda è la prima pagina della scheda del browser (un collegamento diretto,
//   un segnalibro, una scheda nuova) `-1` uscirebbe dall'app, e allora va alla rotta di ripiego (l'elenco a cui la scheda appartiene),
//   sostituendo la voce di cronologia (`useIndietro`, in `hooks/`).
//   Nel pannello sopra il diario (R10-27) non compare: la testa del pannello ha il suo «Indietro».
// - `TitoloScheda`: l'h1 in carattere display (la sua scala sta in `.titolo-display`: nessuna dimensione scritta sopra).
// - `IntestazioneScheda`: riquadro con la barra (ritorno, briciole se ci sono, e a destra le azioni: prima quella di gioco, primaria,
//   poi il menu «Modifica ⋯») e il corpo (figura facoltativa, titolo con chip e metadati). Resta entro il 30% dell'altezza della
//   schermata (LAY3-5): la barra è una riga sola (sul telefono ritorno e menu solo icona), la figura è piccola, e le descrizioni lunghe
//   stanno nel corpo della scheda.
// ============================================================

import type { HTMLAttributes, ReactNode } from 'react';
import { IconChevronLeft } from './icons';
import { useInPannello } from '../scheda/contestoScheda';
import { useIndietro } from '../../hooks/useIndietro';

interface PropsIndietro {
  /** Dove andare se la scheda è la prima pagina dell'app aperta in questa scheda del browser (l'elenco a cui appartiene). */
  ripiego: string;
  /** Il nome resta «Indietro» per chi non vede e nel suggerimento, ma non si legge: sempre (testate misurate al pixel, R3-41) o solo
   *  sotto i 640 px (`telefono`: la freccia basta, e la riga del ritorno ha posto per le azioni). */
  etichettaNascosta?: boolean | 'telefono';
  className?: string;
}

/** Il pulsante «Indietro» delle schede di dettaglio: lo stesso aspetto e lo stesso comportamento ovunque; assente nel pannello. */
export function IndietroScheda({ ripiego, etichettaNascosta, className = '' }: PropsIndietro) {
  const nelPannello = useInPannello();
  const indietro = useIndietro(ripiego);
  if (nelPannello) return null;
  const classeEtichetta = etichettaNascosta === 'telefono' ? 'max-sm:sr-only' : etichettaNascosta ? 'sr-only' : undefined;
  return (
    <button type="button" className={`btn btn-ghost btn-sm touch -ml-2 shrink-0 ${className}`} title="Indietro" onClick={indietro}>
      <IconChevronLeft size={18} />
      <span className={classeEtichetta}>Indietro</span>
    </button>
  );
}

/** L'h1 di una scheda di dettaglio, in carattere display: la dimensione la decide `.titolo-display`. */
export function TitoloScheda({ children, className = '', ...resto }: { children: ReactNode; className?: string } & HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={`titolo-display m-0 min-w-0 break-words ${className}`} {...resto}>{children}</h1>;
}

interface Props {
  titolo: ReactNode;
  /** La rotta di ripiego del ritorno (vedi `IndietroScheda`). */
  ripiego: string;
  /** Briciole del percorso, sulla stessa riga del ritorno. */
  percorso?: ReactNode;
  /** Ritratto, carta, illustrazione: piccola, accanto al titolo. */
  figura?: ReactNode;
  /** Chip accanto al titolo (arcana, tipo, stato). */
  chip?: ReactNode;
  /** Righe sotto il titolo (metadati brevi: orari, sede, conteggi). */
  children?: ReactNode;
  /** Le azioni: prima quella di gioco (primaria), poi il menu «Modifica». */
  azioni?: ReactNode;
  /** Senza il riquadro (`card`): quando l'intestazione sta già dentro una carta (la scheda della Persona). */
  senzaRiquadro?: boolean;
  /** Senza il ritorno: quando la pagina lo mette altrove. */
  senzaIndietro?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** Intestazione di una scheda di dettaglio: ritorno, figura, titolo con chip e metadati, azioni. */
export function IntestazioneScheda({ titolo, ripiego, percorso, figura, chip, children, azioni, senzaRiquadro, senzaIndietro, className = '', ...resto }: Props) {
  const nelPannello = useInPannello();
  const conRitorno = !senzaIndietro && !nelPannello;
  return (
    <header className={`intestazione-scheda ${senzaRiquadro ? '' : 'card'} ${className}`} aria-label={resto['aria-label']}>
      {/* la barra: ritorno e briciole a sinistra, azioni a destra (una riga sola anche sul telefono: è ciò che tiene la testata
          entro il 30%). Nel DOM le azioni vengono prima del titolo, come si vedono: l'ordine del fuoco segue quello visivo */}
      {(conRitorno || percorso || azioni) && (
        <div className="intestazione-scheda__barra">
          {conRitorno && <IndietroScheda ripiego={ripiego} etichettaNascosta="telefono" />}
          {percorso}
          {azioni && <div className="intestazione-scheda__azioni">{azioni}</div>}
        </div>
      )}
      <div className="intestazione-scheda__corpo">
        {figura && <div className="intestazione-scheda__figura">{figura}</div>}
        <div className="intestazione-scheda__testo">
          <div className="intestazione-scheda__titolo">
            <TitoloScheda>{titolo}</TitoloScheda>
            {chip}
          </div>
          {children}
        </div>
      </div>
    </header>
  );
}
