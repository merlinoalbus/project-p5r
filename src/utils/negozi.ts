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
  online: 'Online',
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
  altro: 'Altro',
};

export const PERSONAGGI = ['Joker', 'Ryuji', 'Morgana', 'Ann', 'Yusuke', 'Makoto', 'Haru', 'Futaba', 'Akechi', 'Kasumi'] as const;
