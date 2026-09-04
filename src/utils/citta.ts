// ============================================================
// citta — etichette dei tipi di luogo, attività e Doti (Fase 8.1)
// ============================================================

export const NOME_TIPO_LUOGO: Record<string, string> = {
  negozio: 'Negozio',
  ristorante: 'Ristorante',
  attivita: 'Attività',
  confidente: 'Confidente',
  servizio: 'Servizio',
  distributore: 'Distributore',
  'punto-interesse': 'Punto di interesse',
  scuola: 'Scuola',
  trasporto: 'Trasporto',
  altro: 'Altro',
};

export const NOME_TIPO_ATTIVITA: Record<string, string> = {
  'mini-gioco': 'Mini-gioco',
  lavoro: 'Lavoro',
  studio: 'Studio',
  lettura: 'Lettura',
  film: 'Film',
  dvd: 'DVD',
  videogioco: 'Videogioco',
  allenamento: 'Allenamento',
  cibo: 'Cibo',
  sfida: 'Sfida',
  altro: 'Altro',
};

export const NOME_DOTE: Record<string, string> = {
  conoscenza: 'Conoscenza',
  fascino: 'Fascino',
  coraggio: 'Coraggio',
  gentilezza: 'Gentilezza',
  perizia: 'Perizia',
};

export const NOME_FASCIA: Record<string, string> = { giorno: 'giorno', sera: 'sera', entrambe: 'giorno e sera' };
