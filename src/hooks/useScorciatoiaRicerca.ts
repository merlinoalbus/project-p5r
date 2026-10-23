// ============================================================
// useScorciatoiaRicerca — il tasto «/» apre la ricerca globale da ogni pagina (L11, B4, R11-07/2)
// ============================================================
//
// Non scatta mai mentre si scrive (campo di testo, area di testo, selezione, elemento modificabile), con un tasto di comando premuto, con
// una finestra già aperta o a ricerca già aperta: in quei casi «/» è un carattere o un tasto di un'altra cosa.
// ============================================================

import { useEffect } from 'react';
import { useRicercaStore } from '../stores/ricercaStore';

const CAMPI = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"], [role="combobox"]';

/** Installa la scorciatoia «/» (da montare una volta, nella cornice dell'app). */
export function useScorciatoiaRicerca(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.isComposing || e.defaultPrevented) return;
      if (e.target instanceof Element && e.target.closest(CAMPI)) return;
      if (document.querySelector('.modal-overlay')) return;
      const { aperta, apri } = useRicercaStore.getState();
      if (aperta) return;
      e.preventDefault();
      apri();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
