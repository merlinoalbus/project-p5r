// ============================================================
// CampoRicerca — input di ricerca con icona e pulsante di azzeramento
// ============================================================

import { IconClose, IconSearch } from './icons';

interface Props {
  valore: string;
  onCambia: (v: string) => void;
  segnaposto?: string;
  autoFocus?: boolean;
}

/** Campo di ricerca compatto, adatto al touch. */
export function CampoRicerca({ valore, onCambia, segnaposto = 'Cerca…', autoFocus }: Props) {
  return (
    <div className="relative flex-1 min-w-[180px]">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        <IconSearch size={16} />
      </span>
      <input
        type="search"
        className="form-input pl-9 pr-9"
        placeholder={segnaposto}
        value={valore}
        autoFocus={autoFocus}
        onChange={(e) => onCambia(e.target.value)}
        aria-label={segnaposto}
      />
      {valore && (
        <button
          type="button"
          className="absolute right-1 top-1/2 -translate-y-1/2 touch flex items-center justify-center text-text-muted hover:text-text bg-transparent border-none cursor-pointer"
          onClick={() => onCambia('')}
          aria-label="Azzera ricerca"
        >
          <IconClose size={16} />
        </button>
      )}
    </div>
  );
}
