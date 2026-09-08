// ============================================================
// negozi — etichette dei tipi di negozio, delle categorie di articolo e personaggi (Fase 8.2)
// ============================================================

export const NOME_TIPO_NEGOZIO: Record<string, string> = {
  armi: 'Armi',
  protezioni: 'Protezioni',
  accessori: 'Accessori',
  oggetti: 'Oggetti',
  regali: 'Regali',
  abiti: 'Abiti',
  cibo: 'Cibo',
  ambulante: 'Ambulante', online: 'Online',
  distributore: 'Distributori',
  materiali: 'Materiali',
  misto: 'Misto',
  altro: 'Altro',
};

export const NOME_CATEGORIA_ARTICOLO: Record<string, string> = {
  arma: 'Arma',
  protezione: 'Protezione',
  accessorio: 'Accessorio',
  abito: 'Abito',
  consumabile: 'Consumabile',
  regalo: 'Regalo',
  materiale: 'Materiale',
  cibo: 'Cibo',
  // I nove tipi di prima erano tutto quel che si poteva mettere in vendita, e non bastavano: un
  // negozio che vende libri, DVD o videogiochi doveva chiamarli «Altro», e i quattro modi in cui
  // l'app distingue i consumabili dappertutto — cura, SP, battaglia, stato — sparivano dentro
  // «Consumabile». Ognuno di questi ha già la sua figura fra le 33 di `ui/categoria-*`: il nome
  // singolare che si scrive qui lo traduce `chiaveCategoria` nel plurale del file.
  cura: 'Consumabile · cura',
  sp: 'Consumabile · SP',
  battaglia: 'Consumabile · battaglia',
  stato: 'Consumabile · stato',
  esplorazione: 'Consumabile · esplorazione',
  'oggetto-chiave': 'Oggetto chiave',
  libro: 'Libro',
  film: 'Film',
  dvd: 'DVD',
  videogioco: 'Videogioco',
  altro: 'Altro',
};

export const PERSONAGGI = ['Joker', 'Ryuji', 'Morgana', 'Ann', 'Yusuke', 'Makoto', 'Haru', 'Futaba', 'Akechi', 'Kasumi'] as const;
