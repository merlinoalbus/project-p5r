// ============================================================
// API traduzioni — elenco, ambiti, modifica, ripristino
// ============================================================

import type { TraduzioneDto } from '../../types';
import { apiDelete, apiGet, apiPut, queryString } from './_helpers';

export const getTraduzioni = (f: { ambito?: string; q?: string; soloUtente?: boolean } = {}): Promise<TraduzioneDto[]> =>
  apiGet(`/traduzioni${queryString(f)}`);
export const getAmbitiTraduzioni = (): Promise<Array<{ ambito: string; voci: number; modificate: number }>> => apiGet('/traduzioni/ambiti');
export const aggiornaTraduzione = (ambito: string, chiave: string, testo: string): Promise<TraduzioneDto> =>
  apiPut(`/traduzioni/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}`, { testo });
export const ripristinaTraduzione = (ambito: string, chiave: string): Promise<TraduzioneDto> =>
  apiDelete(`/traduzioni/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}`);
