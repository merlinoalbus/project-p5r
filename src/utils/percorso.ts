// ============================================================
// percorso — etichette dei tipi di azione e collegamenti alle schede dell'app (Fase 7.5b)
// ============================================================

import type { AzionePercorsoDto } from '../types';

export const NOME_TIPO_AZIONE: Record<string, string> = {
  confidente: 'Confidente',
  dote: 'Dote sociale',
  palazzo: 'Palazzo / Mementos',
  richiesta: 'Richiesta',
  acquisto: 'Acquisto',
  lavoro: 'Lavoro',
  libro: 'Libro',
  dvd: 'DVD / film',
  attivita: 'Attività',
  esame: 'Domanda / esame',
  trama: 'Trama',
  velluto: 'Stanza di Velluto',
  altro: 'Altro',
};

/** Percorso della scheda collegata a un'azione (Confidente con le risposte, dungeon, Richieste, libri…), se ricavabile. */
export function collegamentoAzione(a: AzionePercorsoDto): string | null {
  const r = a.riferimento;
  if (r) {
    switch (r.tipo) {
      case 'confidente': return `/confidenti/${r.chiave}`;
      case 'dungeon': return `/guida/dungeon/${r.chiave}`;
      case 'richiesta': return '/guida/richieste';
      case 'libro': return '/guida/attivita?scheda=libri';
      case 'film': return '/guida/attivita?scheda=film';
      case 'attivita': return '/guida/attivita';
      case 'negozio': return `/guida/negozi/${r.chiave}`;
      case 'dote': return '/guida/attivita';
      default: return null;
    }
  }
  switch (a.tipo) {
    case 'esame': return '/guida/domande';
    case 'acquisto': return '/guida/negozi';
    case 'libro': return '/guida/attivita?scheda=libri';
    case 'dvd': return '/guida/attivita?scheda=film';
    case 'lavoro': return '/guida/attivita?scheda=lavori';
    case 'attivita': case 'dote': return '/guida/attivita';
    case 'velluto': return '/fusione';
    case 'richiesta': return '/guida/richieste';
    default: return null;
  }
}
