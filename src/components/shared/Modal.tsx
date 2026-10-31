// ============================================================
// Modal — finestra di dialogo, chiusura con Esc o con la X, fuoco tenuto dentro la finestra
// ============================================================
//
// Lo sfondo non chiude (segnalazione e scelta dell'utente, 2026-10-17: «a volte quando con il mouse seleziono del testo
// nelle aree di testo o caselle di testo scompare la modale (annullando tutte le modifiche in essa contenute)»). Una
// selezione premuta in un campo e rilasciata fuori dalla finestra arriva come clic all'antenato comune, cioè lo sfondo,
// che chiudeva la finestra e perdeva le modifiche. Si chiude solo con la X ed Esc.
//
// Renderizzata in un portal su <body>: così resta sopra a tutto anche quando il componente che la apre
// vive dentro un contenitore con opacity/transform/overflow (che creano un contesto di sovrapposizione
// e imprigionerebbero lo z-index, facendo finire la finestra sotto le card successive).
//
// Il fuoco (rilievo A5 della verifica completa, 2026-10-03): all'apertura va dentro la finestra (sul
// campo con `autoFocus` se c'è, altrimenti sulla finestra stessa, così su tablet e telefono non si apre
// la tastiera); Tab e Maiusc+Tab girano fra gli elementi della finestra invece di uscire sulla
// pagina sotto; alla chiusura torna all'elemento che l'aveva aperta (se non c'è più, alla finestra rimasta sotto o al contenuto
// della pagina, L13). Prima restava sulla pagina, e con
// la tastiera o un lettore di schermo la finestra si raggiungeva solo per caso.
//
// Spostabile (richiesta dell'utente, 2026-10-31: «rendi spostabile nello schermo anche la schermata "Modifica la voce della giornata"»,
// «in generale tutte le modali che si possono chiudere e hanno annulla/salva»): da 768 px in su ogni finestra (non il cassetto né le
// domande di conferma) si sposta trascinando la barra del titolo (eventi pointer: mouse, penna e dito) o con le frecce sulla maniglia ⠿,
// sempre per intero dentro lo schermo (anche quando la finestra o il suo contenuto cambiano misura). A ogni apertura riparte dal centro.
// Sul telefono resta il foglio dal basso, largo e alto quanto lo schermo: non c'è dove spostarlo.
// ============================================================

import { useEffect, useRef, type KeyboardEvent as KeyboardEventReact, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './icons';
import { useMedia } from '../../hooks/useMedia';
import { useSpostamentoFinestra } from '../../hooks/useSpostamentoFinestra';

interface ModalProps {
  titolo: string;
  aperta: boolean;
  onChiudi: () => void;
  children: ReactNode;
  azioni?: ReactNode;
  larga?: boolean;
  /** Cassetto laterale: entra da destra, alto quanto lo schermo (sul telefono resta il foglio dal basso); scorre solo il suo corpo. */
  cassetto?: boolean;
  /** `alertdialog` per le domande che interrompono (DialogoConferma); default `dialog`. */
  ruolo?: 'dialog' | 'alertdialog';
  /** Id dell'elemento che descrive la finestra (`aria-describedby`): il testo della domanda, letto subito dopo il titolo. */
  idDescrizione?: string;
}

/** Gli elementi che ricevono il fuoco con Tab. */
const ATTIVABILI = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Gli elementi raggiungibili con Tab dentro il contenitore, in ordine di documento, esclusi quelli in zone `hidden` o `inert`. */
function attivabili(contenitore: HTMLElement): HTMLElement[] {
  return [...contenitore.querySelectorAll<HTMLElement>(ATTIVABILI)].filter((el) => !el.closest('[hidden], [inert]'));
}

// ---- Chi ha aperto la finestra ----
//
// Leggere `document.activeElement` all'apertura non basta: un campo con `autoFocus` prende il fuoco durante il montaggio, prima
// degli effetti, e molte finestre nascono già aperte (il genitore le monta e le smonta). Un registro unico, installato una volta,
// tiene gli ultimi due elementi che hanno avuto il fuoco o sono stati cliccati: all'apertura, se l'ultimo sta già dentro la
// finestra appena aperta (il suo `autoFocus`), chi l'ha aperta è il penultimo. Il clic (in cattura) serve anche a un documento
// senza il fuoco del sistema — una finestra in secondo piano — che sposta il fuoco senza generare `focusin`.
let ultimo: HTMLElement | null = null;
let penultimo: HTMLElement | null = null;
/** Fa scorrere il registro: l'elemento diventa l'ultimo, il precedente ultimo il penultimo (ignora body, non-HTML e ripetizioni). */
function registra(el: Element | null | undefined): void {
  if (!(el instanceof HTMLElement) || el === document.body || el === ultimo) return;
  penultimo = ultimo;
  ultimo = el;
}
if (typeof document !== 'undefined') {
  document.addEventListener('focusin', (e) => registra(e.target as Element | null), true);
  // dal clic si risale all'elemento attivabile (il pulsante, non l'icona dentro): è quello che apre la finestra
  document.addEventListener('click', (e) => registra((e.target as Element | null)?.closest?.(ATTIVABILI)), true);
}
/**
 * L'elemento a cui ridare il fuoco alla chiusura: l'ultimo registrato, oppure il penultimo se l'ultimo sta già dentro
 * la finestra (il suo campo con `autoFocus`); nessuno se anche il candidato sta dentro la finestra.
 */
function chiHaApertoLaFinestra(finestra: HTMLElement | null): HTMLElement | null {
  const candidato = ultimo && finestra?.contains(ultimo) ? penultimo : ultimo;
  return candidato && !finestra?.contains(candidato) ? candidato : null;
}

// ---- Lo spostamento ----

/** Da dove la finestra si sposta: sotto (il foglio dal basso del telefono) resta ferma. */
const SPOSTABILE_DA = '(min-width: 768px)';

/** Finestra modale con intestazione, corpo scorrevole e piè di pagina opzionale. */
export function Modal({ titolo, aperta, onChiudi, children, azioni, larga, cassetto, ruolo = 'dialog', idDescrizione }: ModalProps) {
  const finestra = useRef<HTMLDivElement | null>(null);
  const sfondo = useRef<HTMLDivElement | null>(null);

  // lo spostamento: solo le finestre (non il cassetto né le domande di conferma), da 768 px in su; dal centro, a ogni apertura (il gesto è
  // quello di tutte le finestre spostabili, `useSpostamentoFinestra`)
  const largaAbbastanza = useMedia(SPOSTABILE_DA);
  const spostabile = largaAbbastanza && !cassetto && ruolo === 'dialog';
  const { stile: stileSpostamento, trascina, inizia, muovi, finisci, frecce } = useSpostamentoFinestra(finestra, { attivo: spostabile, aperta });
  // `onChiudi` è spesso una funzione scritta al volo: la si legge da un ref, così gli effetti dipendono solo da `aperta`
  // e il fuoco non viene rimesso a posto a ogni render della pagina che apre la finestra
  const chiudi = useRef(onChiudi);
  useEffect(() => { chiudi.current = onChiudi; });

  useEffect(() => {
    if (!aperta) return;
    /** Esc chiude la finestra, ma solo quella più in alto: con una finestra aperta sopra un'altra (le note sopra il cassetto del
     *  Confidente) un solo Esc chiudeva tutte e due. Le finestre si aggiungono in fondo a <body>: la più in alto è l'ultima. */
    const onKey = (e: KeyboardEvent) => {
      // un Esc già usato da un controllo della finestra (la tendina aperta di un Selettore, che lo segna con `preventDefault`) chiude
      // quel controllo e non la finestra: il primo Esc chiude la tendina, il secondo la finestra
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const aperte = document.querySelectorAll('.modal-overlay');
      if (aperte.length > 0 && aperte[aperte.length - 1] !== sfondo.current) return;
      chiudi.current();
    };
    window.addEventListener('keydown', onKey);
    // Blocca lo scorrimento della pagina sotto la finestra (ripristinato alla chiusura).
    const overflowPrecedente = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrecedente;
    };
  }, [aperta]);

  // Il fuoco entra nella finestra all'apertura e torna a chi l'ha aperta alla chiusura.
  useEffect(() => {
    if (!aperta) return;
    const el = finestra.current;
    const daRidare = chiHaApertoLaFinestra(el);
    // un campo con `autoFocus` l'ha già preso (React lo dà prima degli effetti): si lascia dov'è. Altrimenti il fuoco va sulla
    // finestra stessa, non sul primo campo: su tablet e telefono un campo con il fuoco apre la tastiera a ogni apertura
    if (el && !el.contains(document.activeElement)) el.focus();
    return () => {
      // solo a finestra davvero chiusa: nello smontaggio simulato di React StrictMode (sviluppo) la finestra è ancora nel
      // documento, e ridare il fuoco al pulsante lì faceva perdere il campo con `autoFocus` al rimontaggio
      if (el?.isConnected) return;
      if (daRidare && daRidare.isConnected) { daRidare.focus(); return; }
      // chi l'ha aperta non c'è più (L13, revisione R2: il pulsante «Da approvare · N» sparisce con l'elenco vuoto): il fuoco non resta perso su
      // <body>, va alla finestra rimasta sotto (la più in alto) o al contenuto della pagina; mai se qualcosa l'ha già preso
      const attivo = document.activeElement;
      if (attivo && attivo !== document.body && attivo.isConnected) return;
      const sotto = [...document.querySelectorAll<HTMLElement>('.modal-content')].pop() ?? document.getElementById('contenuto');
      sotto?.focus({ preventScroll: true });
    };
  }, [aperta]);

  /** Tab e Maiusc+Tab restano dentro la finestra: dall'ultimo elemento si torna al primo, e viceversa. */
  const tieniIlFuoco = (e: KeyboardEventReact<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !finestra.current) return;
    const elenco = attivabili(finestra.current);
    if (elenco.length === 0) { e.preventDefault(); return; }
    const primo = elenco[0];
    const ultimo = elenco[elenco.length - 1];
    const attivo = document.activeElement;
    if (e.shiftKey && (attivo === primo || attivo === finestra.current)) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && attivo === ultimo) { e.preventDefault(); primo.focus(); }
  };

  if (!aperta) return null;
  return createPortal(
    <div ref={sfondo} className={`modal-overlay ${cassetto ? 'modal-overlay--cassetto' : ''}`} role="presentation">
      <div
        ref={finestra}
        className={`modal-content ${larga ? 'modal-content--larga' : ''} ${cassetto ? 'modal-content--cassetto' : ''}`}
        role={ruolo}
        aria-modal="true"
        aria-label={titolo}
        aria-describedby={idDescrizione}
        tabIndex={-1}
        onKeyDown={tieniIlFuoco}
        style={stileSpostamento}
      >
        <div className={`modal-header ${spostabile ? 'modal-header--spostabile' : ''} ${trascina ? 'modal-header--trascina' : ''}`}
          onPointerDown={spostabile ? inizia : undefined} onPointerMove={spostabile ? muovi : undefined}
          onPointerUp={spostabile ? finisci : undefined} onPointerCancel={spostabile ? finisci : undefined}>
          <div className="flex min-w-0 items-center gap-1">
            {spostabile && (
              <button type="button" data-maniglia className="touch shrink-0 flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text rounded-md -ml-2"
                aria-label="Sposta la finestra (frecce)" title="Trascina la barra per spostare la finestra, o usa le frecce" onKeyDown={frecce}>
                <span aria-hidden="true" className="testo-18 leading-none">⠿</span>
              </button>
            )}
            <h2 className="m-0 testo-17 font-semibold">{titolo}</h2>
          </div>
          <button type="button" className="touch flex items-center justify-center bg-transparent border-none text-text-muted hover:text-text cursor-pointer rounded-md" onClick={onChiudi} aria-label="Chiudi">
            <IconClose size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {azioni && <div className="modal-footer">{azioni}</div>}
      </div>
    </div>,
    document.body,
  );
}
