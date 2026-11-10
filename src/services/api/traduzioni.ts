// ============================================================
// API traduzioni — elenco, ambiti, modifica
// ============================================================

import type { TraduzioneDto } from '../../types';
import { apiGet, apiPut, queryString } from './_helpers';

/** Le voci della tabella delle traduzioni, filtrabili per ambito, testo (chiave o resa) e sole voci modificate dall'utente. */
export const getTraduzioni = (f: { ambito?: string; q?: string; soloUtente?: boolean } = {}): Promise<TraduzioneDto[]> =>
  apiGet(`/traduzioni${queryString(f)}`);
/** Gli ambiti delle traduzioni con il numero di voci e di quelle modificate dall'utente. */
export const getAmbitiTraduzioni = (): Promise<Array<{ ambito: string; voci: number; modificate: number }>> => apiGet('/traduzioni/ambiti');
/** Imposta la resa italiana di una voce esistente (diventa dell'utente); risponde con la voce aggiornata. */
export const aggiornaTraduzione = (ambito: string, chiave: string, testo: string): Promise<TraduzioneDto> =>
  apiPut(`/traduzioni/${encodeURIComponent(ambito)}/${encodeURIComponent(chiave)}`, { testo });
