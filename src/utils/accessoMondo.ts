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

/** Il nome del comando che apre la scheda dell'entità, detto con la parola giusta (L0, 2026-10-20): prima ogni scheda era «Scheda del
 *  luogo», anche quella di un quartiere o di un Palazzo, e «luogo» oggi vuol dire solo l'attività (Untouchable, Diner). */
export function titoloSchedaAccessoMondo(tipo: string): string {
  switch (tipo) {
    case 'negozio': return 'Scheda del negozio';
    case 'quartiere': return 'Scheda del quartiere';
    case 'dungeon': return 'Scheda del Palazzo';
    case 'confidente': return 'Scheda del Confidente';
    case 'luogo': return 'Scheda del luogo';
    case 'articolo': return 'Scheda dell’articolo';
    case 'area': return 'Scheda dell’infiltrazione';
    case 'punto': return 'Scheda della voce';
    default: return 'Scheda';
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
