// ============================================================
// Modal — finestra di dialogo, chiusura con Esc e clic esterno, fuoco tenuto dentro la finestra
// ============================================================
//
// Renderizzata in un portal su <body>: così resta sopra a tutto anche quando il componente che la apre
// vive dentro un contenitore con opacity/transform/overflow (che creano un contesto di sovrapposizione
// e imprigionerebbero lo z-index, facendo finire la finestra sotto le card successive).
//
// Il fuoco (rilievo A5 della verifica completa, 2026-10-03): all'apertura va dentro la finestra (sul
// campo con `autoFocus` se c'è, altrimenti sulla finestra stessa, così su tablet e telefono non si apre
// la tastiera); Tab e Maiusc+Tab girano fra gli elementi della finestra invece di uscire sulla
// pagina sotto; alla chiusura torna all'elemento che l'aveva aperta. Prima restava sulla pagina, e con
// la tastiera o un lettore di schermo la finestra si raggiungeva solo per caso.
// ============================================================

import { useEffect, useRef, type KeyboardEvent as KeyboardEventReact, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { IconClose } from './icons';

interface ModalProps {
  titolo: string;
  aperta: boolean;
  onChiudi: () => void;
  children: ReactNode;
  azioni?: ReactNode;
  larga?: boolean;
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

/** Finestra modale con intestazione, corpo scorrevole e piè di pagina opzionale. */
export function Modal({ titolo, aperta, onChiudi, children, azioni, larga }: ModalProps) {
  const finestra = useRef<HTMLDivElement | null>(null);
  // `onChiudi` è spesso una funzione scritta al volo: la si legge da un ref, così gli effetti dipendono solo da `aperta`
  // e il fuoco non viene rimesso a posto a ogni render della pagina che apre la finestra
  const chiudi = useRef(onChiudi);
  useEffect(() => { chiudi.current = onChiudi; });

  useEffect(() => {
    if (!aperta) return;
    /** Esc chiude la finestra. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') chiudi.current();
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
      if (daRidare && daRidare.isConnected) daRidare.focus();
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
    <div className="modal-overlay" onClick={onChiudi} role="presentation">
      <div
        ref={finestra}
        className="modal-content"
        style={larga ? { width: 860 } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
        tabIndex={-1}
        onKeyDown={tieniIlFuoco}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="m-0 text-[17px] font-semibold">{titolo}</h2>
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
