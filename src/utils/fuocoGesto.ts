// ============================================================
// fuocoGesto — dopo «Sposta su/giù» di una riga di un elenco modificabile il fuoco resta sul gesto (o passa all'opposto al bordo)
// ============================================================
//
// Con le chiavi stabili (`useIdStabili`) React sposta il nodo della riga, e il pulsante premuto perde il fuoco (o si spegne al bordo
// dell'elenco). Il gesto si ritrova dalla riga (`data-riga`, l'id stabile) e dalla sua chiave (`data-gesto`), mai dal testo o dal nome.
// ============================================================

/** Dopo il disegno, rimette il fuoco sul gesto `verso` della riga `riga`; se è spento (la riga è arrivata al bordo) sull'opposto. */
export function fuocoDopoSposta(riga: number, verso: -1 | 1): void {
  setTimeout(() => {
    const gesto = (g: 'su' | 'giu') => document.querySelector<HTMLButtonElement>(`button[data-riga="${riga}"][data-gesto="${g}"]`);
    const stesso = gesto(verso === -1 ? 'su' : 'giu');
    (stesso && !stesso.disabled ? stesso : gesto(verso === -1 ? 'giu' : 'su'))?.focus();
  });
}
