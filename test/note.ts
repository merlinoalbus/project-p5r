// ============================================================
// Aiuto per i test che cercano un testo con le note delle Doti (♪, ♪♪, ♪♪♪)
// ============================================================
//
// `TestoNote` rende ogni fila di ♪ come un'immagine di testo a sé (`role="img"`, nome «2 note»): il testo «Coraggio ♪♪» non è più un
// solo nodo, e `getByText('Coraggio ♪♪')` non lo trova. Questo matcher cerca l'elemento più interno il cui contenuto è quel testo.
// ============================================================

/** Il matcher di `getByText` per un testo che porta file di ♪: l'elemento più interno con esattamente quel contenuto. */
export function conNote(testo: string): (contenuto: string, elemento: Element | null) => boolean {
  return (_contenuto, elemento) => !!elemento && elemento.textContent === testo && !Array.from(elemento.children).some((figlio) => figlio.textContent === testo);
}
