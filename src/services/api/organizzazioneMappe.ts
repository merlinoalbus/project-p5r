import type { RisoluzioneMappaDto, ContenutiMappaDto } from '../../../shared/organizzazioneMappe';
import { apiGet, queryString } from './_helpers';
export const risolviMappa = (chiave: string): Promise<RisoluzioneMappaDto> => apiGet(`/mappe/risolvi/${encodeURIComponent(chiave)}`);
export const getContenutiMappa = (chiave: string, partita?: number): Promise<ContenutiMappaDto> => apiGet(`/mappe/contenuti/${encodeURIComponent(chiave)}${queryString({ partita })}`);
