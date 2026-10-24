// ============================================================
// parole dei luoghi — le parole dei livelli (mai «mappe») per le carte dei luoghi della guida, dai conteggi del server
// ============================================================

import { testoPin } from '../../utils/presentazioneMappa';
import type { NodoGerarchiaDto } from '../../types';

export const parola = (n: number, uno: string, piu: string): string => `${n} ${n === 1 ? uno : piu}`;

/** Le parti dei conteggi del nodo (una per chip), con le parole del livello (mai «mappe») e i numeri del server. */
export function partiConteggi(n: NodoGerarchiaDto): string[] {
  const c = n.conteggi;
  const pin = testoPin(c.pin.contenuto);
  const aree = c.aree ?? 0;
  const planimetrie = parola(c.planimetrie ?? 0, 'planimetria', 'planimetrie');
  const persone = parola(c.persone ?? 0, 'Persona', 'Persona');
  const trame = parola(c.trame ?? 0, 'Trama', 'Trame');
  const richieste = parola(c.richieste ?? 0, 'Richiesta', 'Richieste');
  switch (n.tipo) {
    case 'citta': return [parola(c.quartieri ?? 0, 'quartiere', 'quartieri'), parola(c.palazzi ?? 0, 'Palazzo', 'Palazzi')];
    case 'quartiere': return aree === 0 ? ['nessuna area', pin] : [parola(aree, 'area', 'aree'), planimetrie, pin];
    case 'palazzo': return [parola(aree, 'area', 'aree'), planimetrie, parola(c.infiltrazioni ?? 0, 'infiltrazione', 'infiltrazioni'), pin];
    case 'memento': return [parola(c.dedali ?? 0, 'dedalo', 'dedali'), parola(aree, 'area', 'aree'), persone, trame, richieste, ...((c.planimetrie ?? 0) > 0 ? [planimetrie] : [])];
    case 'dedalo': return [parola(aree, 'area', 'aree'), persone, trame, richieste];
    case 'area-dedalo': return [persone, trame, richieste];
    case 'area': return [planimetrie, pin];
    case 'planimetria': return [pin];
    case 'da-collocare': return [(c.planimetrie ?? 0) === 0 ? 'nessuna planimetria da collocare' : planimetrie];
    default: return [];
  }
}

/** L'etichetta del gesto che scende di livello (le parole di quel che sta sotto), o null se il nodo non ha figli da mostrare. */
export function etichettaScendi(n: NodoGerarchiaDto): string | null {
  if (n.figli.length === 0) return null;
  switch (n.tipo) {
    case 'citta': return `Quartieri (${n.figli.length})`;
    case 'quartiere':
    case 'palazzo':
    case 'dedalo': return `Aree (${n.figli.length})`;
    case 'area': return `Planimetrie (${n.figli.length})`;
    case 'memento': return `Dedali (${n.figli.length})`;
    default: return null;
  }
}
