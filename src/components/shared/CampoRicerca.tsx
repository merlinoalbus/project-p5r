// ============================================================
// CampoRicerca — input di ricerca con icona e pulsante di azzeramento
// ============================================================

import { IconClose, IconSearch } from './icons';

interface Props {
  valore: string;
  onCambia: (v: string) => void;
  segnaposto?: string;
  autoFocus?: boolean;
  /** Classi aggiuntive del contenitore (es. `basis-full` per prendere tutta la riga sul telefono). */
  className?: string;
}

/**
 * Campo di ricerca compatto, adatto al touch. La «×» è una sola, quella da 44 px qui sotto: la croce nativa di
 * `type="search"` (Chrome, Safari, Edge) è tolta da `.campo-ricerca__input` in src/tailwind.css (lotto C).
 */
export function CampoRicerca({ valore, onCambia, segnaposto = 'Cerca…', autoFocus, className }: Props) {
  return (
    <div className={`relative flex-1 min-w-[180px] ${className ?? ''}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        <IconSearch size={16} />
      </span>
      <input
        type="search"
        className="form-input campo-ricerca__input pl-9 pr-11"
        placeholder={segnaposto}
        value={valore}
        autoFocus={autoFocus}
        onChange={(e) => onCambia(e.target.value)}
        aria-label={segnaposto}
      />
      {valore && (
        <button
          type="button"
          className="absolute right-0 top-1/2 -translate-y-1/2 touch flex items-center justify-center text-text-muted hover:text-text bg-transparent border-none cursor-pointer"
          onClick={() => onCambia('')}
          aria-label="Azzera ricerca"
        >
          <IconClose size={16} />
        </button>
      )}
    </div>
  );
}
