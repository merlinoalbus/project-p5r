// ============================================================
// percorso — etichette dei tipi di azione e collegamenti alle schede dell'app (Fase 7.5b)
// ============================================================

import type { AzionePercorsoDto, EffettiAzioneDto, EventoUtenteDto } from '../types';
import { TIPI_AZIONE } from '../../shared/effettiAzione';

/** Etichette dei tipi di evento che l'utente aggiunge alla giornata. */
export const NOME_TIPO_EVENTO: Record<EventoUtenteDto['tipo'], string> = { evento: 'Evento', scadenza: 'Scadenza', promemoria: 'Promemoria' };

/** Etichette dei tipi di azione: un elenco solo, quello condiviso con il server (`TIPI_AZIONE`). */
export const NOME_TIPO_AZIONE: Record<string, string> = Object.fromEntries(TIPI_AZIONE.map((t) => [t.chiave, t.nome]));

export interface CollegamentoAzione {
  href: string;
  /** Testo del collegamento: il riferimento della soluzione se presente, altrimenti il nome della scheda. */
  etichetta: string;
}

/** Scheda collegata a un'azione (Confidente con le risposte, dungeon, Richieste, libri…), se ricavabile. */
export function collegamentoAzione(a: Pick<AzionePercorsoDto, 'tipo' | 'riferimento' | 'riferimentoTesto'>): CollegamentoAzione | null {
  const r = a.riferimento;
  const testo = a.riferimentoTesto;
  if (r) {
    switch (r.tipo) {
      case 'confidente': return { href: `/confidenti/${r.chiave}`, etichetta: testo ?? 'Scheda Confidente' };
      case 'dungeon': return { href: `/guida/dungeon/${r.chiave}`, etichetta: testo ?? 'Palazzo' };
      case 'richiesta': return { href: '/guida/richieste', etichetta: testo ?? 'Richieste dei Mementos' };
      case 'libro': return { href: '/guida/libri', etichetta: testo ?? 'Libri' };
      case 'film': return { href: '/guida/film', etichetta: testo ?? 'Film e DVD' };
      case 'attivita': return { href: '/guida/attivita', etichetta: testo ?? 'Attività' };
      case 'negozio': return { href: `/guida/negozi/${r.chiave}`, etichetta: testo ?? 'Negozio' };
      case 'dote': return { href: '/guida/attivita', etichetta: testo ?? 'Doti sociali' };
      default: return null;
    }
  }
  switch (a.tipo) {
    case 'esame': return { href: '/guida/domande', etichetta: testo ?? 'Domande in classe ed esami' };
    case 'acquisto': return { href: '/guida/negozi', etichetta: testo ?? 'Negozi e inventario' };
    case 'libro': return { href: '/guida/libri', etichetta: testo ?? 'Libri' };
    case 'dvd': return { href: '/guida/film', etichetta: testo ?? 'Film e DVD' };
    case 'lavoro': return { href: '/guida/attivita?scheda=lavori', etichetta: testo ?? 'Lavori' };
    case 'attivita': case 'dote': return { href: '/guida/attivita', etichetta: testo ?? 'Attività e Doti sociali' };
    case 'velluto': return { href: '/fusione', etichetta: testo ?? 'Fusione' };
    case 'richiesta': return { href: '/guida/richieste', etichetta: testo ?? 'Richieste dei Mementos' };
    default: return null;
  }
}

/** Testo breve degli effetti applicati alla spunta (es. «Perizia +2 · Zorro, il fuorilegge 1 → 2 · Fioraio Rafflesia: turno 1 (Gentilezza +3) · Ryuji Sakamoto +15 punti»). */
export function descriviEffetti(e: EffettiAzioneDto): string {
  const parti = e.doti.map((d) => `${d.nome} +${d.delta}${d.note ? ` (${'♪'.repeat(d.note)}${d.cinema ? ' + Anima da cineasta' : ''})` : ''}`);
  for (const l of e.letture ?? []) parti.push(`${l.dopo > l.prima ? `${l.nome} ${l.prima} → ${l.dopo}` : `${l.nome} già a ${l.prima}`}${l.doti?.length ? ` (${l.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')})` : ''}`);
  for (const t of e.turni ?? []) parti.push(`${t.nome}: turno ${t.ordine}${t.doti.length ? ` (${t.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')})` : ''}`);
  if (e.incontro) parti.push(e.incontro.giaContato ? `Incontro con ${e.incontro.nome} già contato` : `Incontro con ${e.incontro.nome}${e.incontro.doti.length ? `: ${e.incontro.doti.map((d) => `${d.nome} +${d.delta}`).join(', ')}` : ''}`);
  if (e.confidente) parti.push(`${e.confidente.nome} +${e.confidente.punti} punti`);
  return parti.join(' · ');
}
