// ============================================================
// negoziazione — i quattro caratteri delle Ombre
// ============================================================
//
// Il carattere è un **colore fisso**: lo stesso in tutta l'app, così durante la trattativa si
// riconosce con la coda dell'occhio invece di rileggere ogni volta il nome.
// ============================================================

import type { EsitoRisposta, TrattoOmbra } from '../types';
import { NOME_PERSONALITA } from '../../shared/elementi';

/** I nomi delle personalità vengono dal vocabolario unico (`shared/elementi.ts`, R8-20c); qui restano solo i colori. */
export const TRATTI_OMBRA: Array<{ chiave: TrattoOmbra; nome: string; colore: string }> = [
  { chiave: 'giocosa', nome: NOME_PERSONALITA.giocosa, colore: '#f5c542' },
  { chiave: 'timida', nome: NOME_PERSONALITA.timida, colore: '#6fb3ff' },
  { chiave: 'irritabile', nome: NOME_PERSONALITA.irritabile, colore: '#ff6b57' },
  { chiave: 'cupa', nome: NOME_PERSONALITA.cupa, colore: '#b48cff' },
];

export const NOME_TRATTO = Object.fromEntries(TRATTI_OMBRA.map((t) => [t.chiave, t.nome])) as Record<TrattoOmbra, string>;
export const COLORE_TRATTO = Object.fromEntries(TRATTI_OMBRA.map((t) => [t.chiave, t.colore])) as Record<TrattoOmbra, string>;
/** Il segno che accompagna l'esito: la nota del gioco, il sudore, il fastidio. */
export const SEGNO_ESITO: Record<EsitoRisposta, string> = { buona: '♪', passabile: '~', cattiva: '×' };
