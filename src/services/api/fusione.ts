// ============================================================
// API fusione — fusione diretta, ricette per una Persona, fusioni con una Persona
// ============================================================

import type { EsitoFusioneDto, PianiFusioneDto, RicetteFusioneDto } from '../../types';
import { apiGet, queryString } from './_helpers';

/** Contesto della richiesta: partita (DLC posseduti) e filtri. */
export interface OpzioniFusione {
  partita?: number;
  livelloMax?: number;
  limite?: number;
}

export const getFondi = (a: number, b: number, opz: Pick<OpzioniFusione, 'partita'> = {}): Promise<EsitoFusioneDto> =>
  apiGet(`/fusione/fondi${queryString({ a, b, partita: opz.partita })}`);

export const getRicettePer = (personaId: number, opz: OpzioniFusione = {}): Promise<RicetteFusioneDto> =>
  apiGet(`/fusione/ricette/${personaId}${queryString({ partita: opz.partita, livelloMax: opz.livelloMax, limite: opz.limite })}`);

export interface OpzioniPiani {
  partita?: number;
  profondita?: number;
  alternative?: number;
  catture?: boolean;
  limitaLivello?: boolean;
}

/** Piani di fusione ricorsivi (calcolo potenzialmente lungo: timeout esteso, nessun retry). */
export const getPianiFusione = (personaId: number, opz: OpzioniPiani = {}): Promise<PianiFusioneDto> =>
  apiGet(`/fusione/piani/${personaId}${queryString({ partita: opz.partita, profondita: opz.profondita, alternative: opz.alternative, catture: opz.catture, limitaLivello: opz.limitaLivello })}`, { timeoutMs: 120_000, maxRetries: 0 });

export const getFusioniCon = (personaId: number, opz: OpzioniFusione = {}): Promise<RicetteFusioneDto> =>
  apiGet(`/fusione/con/${personaId}${queryString({ partita: opz.partita, livelloMax: opz.livelloMax, limite: opz.limite })}`);
