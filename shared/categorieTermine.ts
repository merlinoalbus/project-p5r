// ============================================================
// categorieTermine — i nomi delle categorie dei termini del glossario (`/compendio/glossario`): un solo punto, letto dalla pagina e dalla ricerca globale
// ============================================================

/** Il nome mostrato di ogni categoria dei termini; una categoria non elencata si mostra con la sua chiave. */
export const NOMI_CATEGORIA_TERMINE: Readonly<Record<string, string>> = {
  battaglia: 'Battaglia',
  negoziazione: 'Negoziazione',
  fusione: 'Fusione',
  velluto: 'Stanza di Velluto',
  doti: 'Doti sociali',
  confidenti: 'Confidenti',
  luoghi: 'Luoghi',
  oggetti: 'Oggetti',
  calendario: 'Calendario e tempo',
  altro: 'Altro',
};

/** Il nome mostrato di una categoria dei termini. */
export const nomeCategoriaTermine = (categoria: string): string => NOMI_CATEGORIA_TERMINE[categoria] ?? categoria;
