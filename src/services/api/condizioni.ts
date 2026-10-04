// ============================================================
// API condizioni — elenchi per l'editor delle condizioni e stati della partita da segnare a mano (Partita → Progressi)
// ============================================================

import { apiGet, apiPut } from './_helpers';
import type { ElenchiRegoleDto, PinConStatoDto, ProgressiPartitaDto } from '../../types';

/** Gli elenchi chiusi da cui l'editor delle condizioni prende i valori. */
export const getElenchiRegole = (): Promise<ElenchiRegoleDto> => apiGet('/condizioni/elenchi');

/** I pin con uno stato, per la condizione «Pin di una mappa». */
export const getPinConStato = (): Promise<PinConStatoDto[]> => apiGet('/condizioni/spilli');

/** Gli stati di una partita: calcolati dalla partita e da segnare a mano (Partita → Progressi). */
export const getProgressiPartita = (id: number): Promise<ProgressiPartitaDto> => apiGet(`/condizioni/partite/${id}/progressi`);
/** Segna (o toglie) un evento di storia come avvenuto nella partita; gli eventi calcolati dalla squadra sono rifiutati dal server. Risponde con i progressi aggiornati. */
export const impostaEventoStoria = (id: number, evento: string, avvenuto: boolean): Promise<ProgressiPartitaDto> => apiPut(`/condizioni/partite/${id}/eventi/${encodeURIComponent(evento)}`, { avvenuto });
/** Imposta quante volte un'attività è stata svolta nella partita; risponde con i progressi aggiornati (il server vi aggiunge le Doti da segnare a mano). */
export const impostaAttivitaSvolta = (id: number, attivita: string, volte: number): Promise<ProgressiPartitaDto> => apiPut(`/condizioni/partite/${id}/attivita/${encodeURIComponent(attivita)}`, { volte });
/** Imposta i punti accumulati nel programma punti di un negozio (solo per i programmi a calcolo manuale); risponde con i progressi aggiornati. */
export const impostaPuntiNegozio =(id: number, negozio: string, punti: number): Promise<ProgressiPartitaDto> => apiPut(`/condizioni/partite/${id}/punti-negozio/${encodeURIComponent(negozio)}`, { punti });
