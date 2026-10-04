// ============================================================
// API organizzazione delle mappe — risoluzione dei percorsi e contenuti della guida di una mappa
// ============================================================

import type { RisoluzioneMappaDto, ContenutiMappaDto } from '../../../shared/organizzazioneMappe';
import { apiGet, queryString } from './_helpers';
/** Che cosa apre un percorso di mappa: la sezione di guida se è l'alias di una vecchia mappa d'area, altrimenti la mappa (404 se non esiste). */
export const risolviMappa = (chiave: string): Promise<RisoluzioneMappaDto> => apiGet(`/mappe/risolvi/${encodeURIComponent(chiave)}`);
/** I contenuti della guida legati alla mappa (aree, punti, planimetrie), con lo stato della partita se indicata. */
export const getContenutiMappa =(chiave: string, partita?: number): Promise<ContenutiMappaDto> => apiGet(`/mappe/contenuti/${encodeURIComponent(chiave)}${queryString({ partita })}`);
