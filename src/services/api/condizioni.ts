import { apiGet, apiPut } from './_helpers';

/** Gli elenchi chiusi da cui l'editor delle condizioni prende i valori. */
export interface ElenchiRegole {
  articoli: Array<{ chiave: string; nome: string; gruppo: string }>;
  letture: Array<{ chiave: string; nome: string; categoria: 'libro' | 'film' }>;
  arcani: Array<{ chiave: string; nome: string }>;
  persone: Array<{ chiave: string; nome: string }>;
  abilita: Array<{ chiave: string; nome: string }>;
  squadra: Array<{ chiave: string; nome: string }>;
  attivita: Array<{ chiave: string; nome: string }>;
  negozi: Array<{ chiave: string; nome: string }>;
  eventi: Array<{ chiave: string; nome: string }>;
  contatori: Array<{ chiave: string; nome: string }>;
}
export const getElenchiRegole = (): Promise<ElenchiRegole> => apiGet('/condizioni/elenchi');

/** Gli stati di una partita che si segnano a mano (Partita → Progressi). */
export interface ProgressiPartita {
  eventi: Array<{ chiave: string; nome: string; avvenuto: boolean }>;
  attivita: Array<{ chiave: string; nome: string; tipo: string; volte: number }>;
  puntiNegozio: Array<{ negozio: string; nome: string; punti: number }>;
}
export const getProgressiPartita = (id: number): Promise<ProgressiPartita> => apiGet(`/condizioni/partite/${id}/progressi`);
export const impostaEventoStoria = (id: number, evento: string, avvenuto: boolean): Promise<ProgressiPartita> => apiPut(`/condizioni/partite/${id}/eventi/${encodeURIComponent(evento)}`, { avvenuto });
export const impostaAttivitaSvolta = (id: number, attivita: string, volte: number): Promise<ProgressiPartita> => apiPut(`/condizioni/partite/${id}/attivita/${encodeURIComponent(attivita)}`, { volte });
export const impostaPuntiNegozio = (id: number, negozio: string, punti: number): Promise<ProgressiPartita> => apiPut(`/condizioni/partite/${id}/punti-negozio/${encodeURIComponent(negozio)}`, { punti });
