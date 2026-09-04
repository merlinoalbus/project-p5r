// ============================================================
// Modal — finestra di dialogo, chiusura con Esc e clic esterno
// ============================================================
//
// Renderizzata in un portal su <body>: così resta sopra a tutto anche quando il componente che la apre
// vive dentro un contenitore con opacity/transform/overflow (che creano un contesto di sovrapposizione
// e imprigionerebbero lo z-index, facendo finire la finestra sotto le card successive).
// ============================================================

import { useEffect, type ReactNode } from 'react';
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

/** Finestra modale con intestazione, corpo scorrevole e piè di pagina opzionale. */
export function Modal({ titolo, aperta, onChiudi, children, azioni, larga }: ModalProps) {
  useEffect(() => {
    if (!aperta) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChiudi();
    };
    window.addEventListener('keydown', onKey);
    // Blocca lo scorrimento della pagina sotto la finestra (ripristinato alla chiusura).
    const overflowPrecedente = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflowPrecedente;
    };
  }, [aperta, onChiudi]);

  if (!aperta) return null;
  return createPortal(
    <div className="modal-overlay" onClick={onChiudi} role="presentation">
      <div
        className="modal-content"
        style={larga ? { width: 860 } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={titolo}
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
