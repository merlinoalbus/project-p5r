// ============================================================
// suggerimenti — classi dell'alone dorato per gli elementi coinvolti nei suggerimenti del giorno (12.4)
// ============================================================

/** Classi da unire all'elemento evidenziato: carta (alone), riga di tabella o elenco (barra e fondo), chip (bordo e testo oro). */
export function classiSuggerito(attivo: boolean, variante: 'carta' | 'riga' | 'chip' = 'carta'): string {
  if (!attivo) return '';
  return variante === 'riga' ? 'suggerito suggerito--riga' : variante === 'chip' ? 'suggerito suggerito--chip' : 'suggerito';
}
