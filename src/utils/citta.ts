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

/** Colori degli spilli dei luoghi sulla mappa del quartiere. */
export const COLORE_TIPO_LUOGO: Record<string, string> = {
  negozio: '#e11d48',
  ristorante: '#f97316',
  attivita: '#a855f7',
  confidente: '#facc15',
  servizio: '#22c55e',
  distributore: '#06b6d4',
  'punto-interesse': '#3b82f6',
  scuola: '#14b8a6',
  trasporto: '#94a3b8',
  altro: '#888888',
};

export const NOME_FASCIA: Record<string, string> = { giorno: 'giorno', sera: 'sera', entrambe: 'giorno e sera' };
