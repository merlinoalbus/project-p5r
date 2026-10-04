// ============================================================
// contornoSagoma — il contorno che segue la sagoma di un'immagine con trasparenza
// ============================================================
//
// Quattro ombre portate sull'alfa, una per lato: un contorno, non una cornice rettangolare. La mappa di Tokyo e la sagoma di un
// quartiere nella sua scheda lo scrivevano ciascuna per conto suo (rilievo R5‴); la mappa ci aggiunge un'ombra sotto, per
// staccare i cartellini dal fondo.
// ============================================================

/** Il filtro CSS del contorno di colore `colore` e spessore `spessore` px; con `ombra`, anche un'ombra morbida sotto. */
export function contornoSagoma(colore: string, spessore = 1, ombra = false): string {
  const contorno = [`${spessore}px 0`, `-${spessore}px 0`, `0 ${spessore}px`, `0 -${spessore}px`].map((d) => `drop-shadow(${d} 0 ${colore})`).join(' ');
  return ombra ? `${contorno} drop-shadow(0 2px 3px rgba(0,0,0,0.5))` : contorno;
}
