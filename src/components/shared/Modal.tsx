// ============================================================
// Modal — finestra di dialogo, chiusura con Esc e clic esterno
// ============================================================

import { useEffect, type ReactNode } from 'react';
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
    return () => window.removeEventListener('keydown', onKey);
  }, [aperta, onChiudi]);

  if (!aperta) return null;
  return (
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
    </div>
  );
}
