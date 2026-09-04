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

export interface CollegamentoAzione {
  href: string;
  /** Testo del collegamento: il riferimento della soluzione se presente, altrimenti il nome della scheda. */
  etichetta: string;
}

/** Scheda collegata a un'azione (Confidente con le risposte, dungeon, Richieste, libri…), se ricavabile. */
export function collegamentoAzione(a: AzionePercorsoDto): CollegamentoAzione | null {
  const r = a.riferimento;
  const testo = a.riferimentoTesto;
  if (r) {
    switch (r.tipo) {
      case 'confidente': return { href: `/confidenti/${r.chiave}`, etichetta: testo ?? 'Scheda Confidente' };
      case 'dungeon': return { href: `/guida/dungeon/${r.chiave}`, etichetta: testo ?? 'Palazzo' };
      case 'richiesta': return { href: '/guida/richieste', etichetta: testo ?? 'Richieste dei Mementos' };
      case 'libro': return { href: '/guida/attivita?scheda=libri', etichetta: testo ?? 'Libri' };
      case 'film': return { href: '/guida/attivita?scheda=film', etichetta: testo ?? 'Film e DVD' };
      case 'attivita': return { href: '/guida/attivita', etichetta: testo ?? 'Attività' };
      case 'negozio': return { href: `/guida/negozi/${r.chiave}`, etichetta: testo ?? 'Negozio' };
      case 'dote': return { href: '/guida/attivita', etichetta: testo ?? 'Doti sociali' };
      default: return null;
    }
  }
  switch (a.tipo) {
    case 'esame': return { href: '/guida/domande', etichetta: testo ?? 'Domande in classe ed esami' };
    case 'acquisto': return { href: '/guida/negozi', etichetta: testo ?? 'Negozi e inventario' };
    case 'libro': return { href: '/guida/attivita?scheda=libri', etichetta: testo ?? 'Libri' };
    case 'dvd': return { href: '/guida/attivita?scheda=film', etichetta: testo ?? 'Film e DVD' };
    case 'lavoro': return { href: '/guida/attivita?scheda=lavori', etichetta: testo ?? 'Lavori' };
    case 'attivita': case 'dote': return { href: '/guida/attivita', etichetta: testo ?? 'Attività e Doti sociali' };
    case 'velluto': return { href: '/fusione', etichetta: testo ?? 'Fusione' };
    case 'richiesta': return { href: '/guida/richieste', etichetta: testo ?? 'Richieste dei Mementos' };
    default: return null;
  }
}
