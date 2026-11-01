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
    // L5: un luogo ha la sua pagina (`chiave` = «quartiere/luogo»)
    case 'luogo': return chiave.includes('/') ? `/guida/luogo/${chiave.split('/').map(encodeURIComponent).join('/')}` : '/guida/citta';
    case 'articolo': return '/guida/negozi';
    case 'area': case 'punto': return '/guida/dungeon';
    default: return '/guida/mappe';
  }
}

/** Vero se la chiave è dei Memento: il dungeon `mementos`, o una delle sue `dungeon_area` (i dedali), la cui chiave comincia sempre
 *  con quella del dungeon (`creaArea`: `<dungeon>-<nome>`). Lì le parole sono «Memento» e «dedalo», mai «Palazzo» e «infiltrazione». */
function deiMemento(tipo: string, chiave: string | undefined): boolean {
  return !!chiave && (tipo === 'dungeon' ? chiave === 'mementos' : tipo === 'area' && chiave.startsWith('mementos-'));
}

/** Come si chiama, al singolare, il tipo di cosa cercata nel risolutore (L0, 2026-10-20). */
export function nomeTipoAccessoMondo(tipo: string, chiave?: string): string {
  switch (tipo) {
    case 'negozio': return 'Negozio';
    case 'quartiere': return 'Quartiere';
    case 'dungeon': return deiMemento(tipo, chiave) ? 'Memento' : 'Palazzo';
    case 'confidente': return 'Confidente';
    case 'luogo': return 'Luogo';
    case 'articolo': return 'Articolo';
    case 'attivita': return 'Attività';
    case 'area': return deiMemento(tipo, chiave) ? 'Dedalo' : 'Infiltrazione';
    case 'punto': return 'Punto di interesse';
    case 'mappa': return 'Mappa';
    default: return 'Voce';
  }
}

/** L7-06: che cosa dire quando la cosa cercata non ha una posizione sulla mappa, con la parola del suo tipo; il perché solo dove è noto
 *  (gli articoli venduti dentro un Palazzo o online), mai la stessa spiegazione per tutti. */
export function senzaPosizioneAccessoMondo(tipo: string, chiave?: string): { frase: string; perche: string | null } {
  const frase = (soggetto: string) => `${soggetto} non ha una posizione sulla mappa.`;
  switch (tipo) {
    case 'negozio': return { frase: frase('Questo negozio'), perche: null };
    case 'confidente': return { frase: frase('Questo Confidente'), perche: null };
    case 'luogo': return { frase: frase('Questo luogo'), perche: null };
    case 'articolo': return { frase: frase('Questo articolo'), perche: 'Succede per la merce dei negozi che stanno dentro un Palazzo e per quella che si compra online, che nel mondo non hanno un punto.' };
    case 'attivita': return { frase: frase('Questa attività'), perche: null };
    case 'area': return { frase: frase(deiMemento(tipo, chiave) ? 'Questo dedalo' : 'Questa infiltrazione'), perche: null };
    case 'punto': return { frase: frase('Questo punto di interesse'), perche: null };
    case 'mappa': return { frase: 'Questa planimetria non ha un punto d’arrivo su un’altra mappa.', perche: null };
    default: return { frase: frase('Questa voce'), perche: null };
  }
}

/** Il nome del comando che apre la scheda dell'entità, detto con la parola giusta (L0, 2026-10-20): prima ogni scheda era «Scheda del
 *  luogo», anche quella di un quartiere o di un Palazzo, e «luogo» oggi vuol dire solo l'attività (Untouchable, Diner). */
export function titoloSchedaAccessoMondo(tipo: string, chiave?: string, nome?: string): string {
  switch (tipo) {
    // L5 (M25): il nome del posto, quando c'è
    case 'negozio': return nome ?? 'Scheda del negozio';
    // L2 (T4): il pulsante che porta alla pagina di un quartiere porta il suo nome («Shibuya»), non il tipo
    case 'quartiere': return nome ?? 'Scheda del quartiere';
    case 'dungeon': return deiMemento(tipo, chiave) ? 'Scheda dei Memento' : 'Scheda del Palazzo';
    case 'confidente': return 'Scheda del Confidente';
    case 'luogo': return nome ?? 'Scheda del luogo';
    case 'articolo': return 'Scheda dell’articolo';
    case 'area': return deiMemento(tipo, chiave) ? 'Scheda del dedalo' : 'Scheda dell’infiltrazione';
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
