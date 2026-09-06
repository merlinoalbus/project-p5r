/** L'indirizzo del risolutore unico: da qualunque sezione, questo porta al posto sulla mappa.
 *
 * Va tenuto distinto da `schedaAccessoMondo`, che porta invece alla scheda dell'entità. I due
 * erano stati confusi, e il comando «Dove si trova» finiva sull'elenco dei negozi invece che sulla
 * mappa: la scheda dice che cos'è una cosa, il risolutore dove sta.
 *
 * La chiave di un articolo contiene una barra (`negozio/articolo`), quindi va codificata: senza
 * `encodeURIComponent` diventerebbe due segmenti di percorso e la rotta non troverebbe nulla. */
export function percorsoAccessoMondo(tipo: string, chiave: string): string {
  return `/guida/mondo/${encodeURIComponent(tipo)}/${encodeURIComponent(chiave)}`;
}

/** Le schede rimangono approfondimenti accessibili anche se manca una posizione. */
export function schedaAccessoMondo(tipo: string, chiave: string): string {
  const k = encodeURIComponent(chiave);
  switch (tipo) {
    case 'negozio': return `/guida/negozi/${k}`;
    case 'quartiere': return `/guida/citta/${k}`;
    case 'dungeon': return `/guida/dungeon/${k}`;
    case 'confidente': return `/confidenti/${k}`;
    case 'luogo': return '/guida/citta';
    case 'articolo': return '/guida/negozi';
    case 'area': case 'punto': return '/guida/dungeon';
    default: return '/guida/mappe';
  }
}

/** Nessuna coordinata implicita: la terna deve essere completa e nei limiti del visore. */
export function centroAccessoMondo(params: URLSearchParams): { x: number; y: number; zoom: number } | null {
  const valori = ['x', 'y', 'zoom'].map(k => params.get(k));
  if (valori.some(v => v === null || v.trim() === '')) return null;
  const [x, y, zoom] = valori.map(Number);
  if (![x, y, zoom].every(Number.isFinite) || x < 0 || x > 100 || y < 0 || y > 100 || zoom < 1 || zoom > 6) return null;
  return { x, y, zoom };
}
