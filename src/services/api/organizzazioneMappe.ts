// ============================================================
// API organizzazione delle mappe — risoluzione dei percorsi
// ============================================================

import type { RisoluzioneMappaDto } from '../../../shared/organizzazioneMappe';
import { apiGet } from './_helpers';
/** Che cosa apre un percorso di mappa: la sezione di guida se è l'alias di una vecchia mappa d'area, altrimenti la mappa (404 se non esiste). */
export const risolviMappa = (chiave: string): Promise<RisoluzioneMappaDto> => apiGet(`/mappe/risolvi/${encodeURIComponent(chiave)}`);
