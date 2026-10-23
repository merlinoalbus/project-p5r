// ============================================================
// PulsanteCerca — il pulsante «Cerca» della barra superiore, a ogni larghezza (L11, B4, R11-07/2)
// ============================================================
//
// Sta nella `Topbar` e non nella barra di navigazione in basso (che ha già il tetto di cinque voci): così la ricerca si raggiunge da ogni
// pagina e a ogni larghezza con un tocco. La finestra è `RicercaGlobale`, montata una volta in `MainLayout`; `data-pulsante-cerca` è il
// punto a cui torna il fuoco quando la finestra, aperta con la scorciatoia «/», si chiude.
// ============================================================

import { useRicercaStore } from '../../stores/ricercaStore';
import { IconSearch } from '../shared/icons';

/** Apre la ricerca globale (stessa cosa del tasto «/»). */
export function PulsanteCerca() {
  const apri = useRicercaStore((s) => s.apri);
  return (
    <button
      type="button"
      data-pulsante-cerca
      className="touch flex shrink-0 cursor-pointer items-center justify-center rounded-md border-none bg-transparent text-text-secondary hover:text-text"
      aria-label="Cerca"
      aria-keyshortcuts="/"
      title="Cerca (/)"
      onClick={() => apri()}
    >
      <IconSearch size={22} />
    </button>
  );
}
