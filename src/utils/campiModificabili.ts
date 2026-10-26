// ============================================================
// campiModificabili — dove si scrive: le scorciatoie della pagina non scattano lì (un solo selettore per tutte)
// ============================================================
//
// La ricerca «/» (`useScorciatoiaRicerca`) e gli appunti del Diario (Ctrl+C / Ctrl+X / Ctrl+V / Esc, `useAppuntiDiario`) lasciano il
// comportamento del browser quando il fuoco o il bersaglio stanno in un campo di testo, un'area di testo, una selezione, un elemento
// modificabile o una casella combinata.
// ============================================================

/** I campi in cui si scrive. */
export const CAMPI_MODIFICABILI = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], [role="combobox"]';

/** Vero se l'elemento è (o sta dentro) un campo in cui si scrive. */
export function eInCampoModificabile(el: EventTarget | Element | null | undefined): boolean {
  return el instanceof Element && !!el.closest(CAMPI_MODIFICABILI);
}
