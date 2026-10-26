// ============================================================
// campiModificabili — dove si scrive: le scorciatoie della pagina non scattano lì (un solo selettore per tutte)
// ============================================================
//
// La ricerca «/» (`useScorciatoiaRicerca`) e gli appunti del Diario (Ctrl+C / Ctrl+X / Ctrl+V / Esc, `useAppuntiDiario`) lasciano il
// comportamento del browser quando il fuoco o il bersaglio stanno in un campo di testo, un'area di testo, una selezione, un elemento
// modificabile o una casella combinata (gli appunti del Diario, con `eInCampoDiTesto`, non contano le caselle e le opzioni).
// ============================================================

/** I campi in cui si scrive. */
export const CAMPI_MODIFICABILI = 'input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"], [role="combobox"]';

/** Vero se l'elemento è (o sta dentro) un campo in cui si scrive. */
export function eInCampoModificabile(el: EventTarget | Element | null | undefined): boolean {
  return el instanceof Element && !!el.closest(CAMPI_MODIFICABILI);
}

/** I tipi di `input` in cui non si scrive testo: il fuoco lì (una spunta appena usata) non toglie le scorciatoie degli appunti. */
const INPUT_SENZA_TESTO = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'image', 'range', 'color', 'file']);

/** Come `eInCampoModificabile`, ma una casella, un'opzione o un pulsante `input` non contano: Ctrl+C / Ctrl+X / Ctrl+V lì non hanno testo
 *  da copiare o incollare (rilievo del revisore, 2026-10-26: dopo aver spuntato una voce le scorciatoie del Diario restavano spente). */
export function eInCampoDiTesto(el: EventTarget | Element | null | undefined): boolean {
  if (!(el instanceof Element)) return false;
  const campo = el.closest(CAMPI_MODIFICABILI);
  return !!campo && !(campo instanceof HTMLInputElement && INPUT_SENZA_TESTO.has(campo.type));
}
