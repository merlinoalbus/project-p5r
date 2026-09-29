// ============================================================
// negoziazione — i quattro caratteri delle Ombre e la ricerca fra le domande
// ============================================================
//
// Il carattere è un **colore fisso**: lo stesso in tutta l'app, così durante la trattativa si
// riconosce con la coda dell'occhio invece di rileggere ogni volta il nome.
// ============================================================

import { normalizzaTesto } from './testo';
import type { EsitoRisposta, NegoziazioneDomandaDto, TrattoOmbra } from '../types';

export const TRATTI_OMBRA: Array<{ chiave: TrattoOmbra; nome: string; colore: string }> = [
  { chiave: 'giocosa', nome: 'Giocosa', colore: '#f5c542' },
  { chiave: 'timida', nome: 'Timida', colore: '#6fb3ff' },
  { chiave: 'irritabile', nome: 'Irritabile', colore: '#ff6b57' },
  { chiave: 'cupa', nome: 'Cupa', colore: '#b48cff' },
];

export const NOME_TRATTO = Object.fromEntries(TRATTI_OMBRA.map((t) => [t.chiave, t.nome])) as Record<TrattoOmbra, string>;
export const COLORE_TRATTO = Object.fromEntries(TRATTI_OMBRA.map((t) => [t.chiave, t.colore])) as Record<TrattoOmbra, string>;
/** Il segno che accompagna l'esito: la nota del gioco, il sudore, il fastidio. */
export const SEGNO_ESITO: Record<EsitoRisposta, string> = { buona: '♪', passabile: '~', cattiva: '×' };
export const ORDINE_ESITO: Record<EsitoRisposta, number> = { buona: 0, passabile: 1, cattiva: 2 };

/** Le domande che contengono **tutte** le parole cercate, nella domanda o in una delle risposte. */
export function cercaDomande(domande: NegoziazioneDomandaDto[], ricerca: string): NegoziazioneDomandaDto[] {
  const parole = normalizzaTesto(ricerca).split(' ').filter(Boolean);
  if (parole.length === 0) return domande;
  return domande.filter((d) => {
    const testo = normalizzaTesto([d.domanda, ...d.risposte.map((r) => r.testo)].join(' '));
    return parole.every((p) => testo.includes(p));
  });
}
