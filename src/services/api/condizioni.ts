import { apiGet, apiPut } from './_helpers';
import type { ProgressiPartitaDto } from '../../types';

/** Gli elenchi chiusi da cui l'editor delle condizioni prende i valori. */
export interface ElenchiRegole {
  articoli: Array<{ chiave: string; nome: string; gruppo: string }>;
  letture: Array<{ chiave: string; nome: string; categoria: 'libro' | 'film' }>;
  arcani: Array<{ chiave: string; nome: string }>;
  persone: Array<{ chiave: string; nome: string }>;
  abilita: Array<{ chiave: string; nome: string }>;
  squadra: Array<{ chiave: string; nome: string }>;
  /** Le sole attività che si contano per volte svolte. */
  attivita: Array<{ chiave: string; nome: string }>;
  /** Con il programma punti: «punti negozio» va solo ai programmi manuali, «grado cliente» solo a chi ha il rango. */
  negozi: Array<{ chiave: string; nome: string; programma: 'manuale' | 'rango-cliente' | null }>;
  /** `calcolato`: l'evento si legge dalla squadra della partita e non si segna a mano. */
  eventi: Array<{ chiave: string; nome: string; calcolato: boolean }>;
  contatori: Array<{ chiave: string; nome: string }>;
}
export const getElenchiRegole = (): Promise<ElenchiRegole> => apiGet('/condizioni/elenchi');

/** Gli stati di una partita: calcolati dalla partita e da segnare a mano (Partita → Progressi). */
export type ProgressiPartita = ProgressiPartitaDto;
export const getProgressiPartita = (id: number): Promise<ProgressiPartita> => apiGet(`/condizioni/partite/${id}/progressi`);
export const impostaEventoStoria = (id: number, evento: string, avvenuto: boolean): Promise<ProgressiPartita> => apiPut(`/condizioni/partite/${id}/eventi/${encodeURIComponent(evento)}`, { avvenuto });
export const impostaAttivitaSvolta = (id: number, attivita: string, volte: number): Promise<ProgressiPartita> => apiPut(`/condizioni/partite/${id}/attivita/${encodeURIComponent(attivita)}`, { volte });
export const impostaPuntiNegozio = (id: number, negozio: string, punti: number): Promise<ProgressiPartita> => apiPut(`/condizioni/partite/${id}/punti-negozio/${encodeURIComponent(negozio)}`, { punti });
