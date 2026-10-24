// ============================================================
// elencoQuale — l'elenco da cui si sceglie «Quale», secondo il tipo di collegamento della voce
// ============================================================

import type { TipoRiferimentoAzione } from '../../shared/effettiAzione';
import type { ElenchiAzioneDto, VoceElencoAzione } from '../types';

export const NOME_QUALE: Record<TipoRiferimentoAzione, string> = {
  confidente: 'Confidente', dungeon: 'Palazzo o Memento', richiesta: 'Richiesta', libro: 'Libro', film: 'Film o DVD', attivita: 'Attività', negozio: 'Negozio', dote: 'Dote sociale',
};

/** L'elenco da cui scegliere; per un lavoro (`soloTurni`), solo le attività contate a turni. */
export function elencoQuale(tipo: TipoRiferimentoAzione, e: ElenchiAzioneDto, soloTurni: boolean): VoceElencoAzione[] {
  switch (tipo) {
    case 'confidente': return e.confidenti;
    case 'dungeon': return e.dungeon;
    case 'richiesta': return e.richieste;
    case 'libro': return e.libri;
    case 'film': return e.film;
    case 'attivita': return soloTurni ? e.attivita.filter((a) => a.turni) : e.attivita;
    case 'negozio': return e.negozi;
    case 'dote': return e.doti;
  }
}
