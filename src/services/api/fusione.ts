// ============================================================
// API fusione — fusione diretta, ricette per una Persona, fusioni con una Persona
// ============================================================

import type { EreditaFusioneDto, EsitoFusioneDto, PianiFusioneDto, RicercaSkillDto, RicetteFusioneDto } from '../../types';
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
  /** Skill che il bersaglio deve avere (propagate lungo la catena). */
  skill?: number[];
  slotFortunato?: boolean;
}

/** Piani di fusione ricorsivi (calcolo potenzialmente lungo: timeout esteso, nessun retry). */
export const getPianiFusione = (personaId: number, opz: OpzioniPiani = {}): Promise<PianiFusioneDto> =>
  apiGet(`/fusione/piani/${personaId}${queryString({ partita: opz.partita, profondita: opz.profondita, alternative: opz.alternative, catture: opz.catture, limitaLivello: opz.limitaLivello, skill: opz.skill && opz.skill.length > 0 ? opz.skill.join(',') : undefined, slotFortunato: opz.slotFortunato })}`, { timeoutMs: 120_000, maxRetries: 0 });

/** Analisi dell'eredità delle skill per la fusione A + B. */
export const getEredita = (a: number, b: number, opz: { partita?: number; livelloA?: number; livelloB?: number } = {}): Promise<EreditaFusioneDto> =>
  apiGet(`/fusione/eredita${queryString({ a, b, partita: opz.partita, livelloA: opz.livelloA, livelloB: opz.livelloB })}`);

/** Ricette che consentono di ereditare tutte le skill indicate (fino a 4). */
export const cercaPerSkill = (skill: number[], opz: { partita?: number; risultato?: number; livelloMax?: number; limite?: number } = {}): Promise<RicercaSkillDto> =>
  apiGet(`/fusione/cerca-skill${queryString({ skill: skill.join(','), risultato: opz.risultato, partita: opz.partita, livelloMax: opz.livelloMax, limite: opz.limite })}`, { timeoutMs: 120_000, maxRetries: 0 });

export const getFusioniCon = (personaId: number, opz: OpzioniFusione = {}): Promise<RicetteFusioneDto> =>
  apiGet(`/fusione/con/${personaId}${queryString({ partita: opz.partita, livelloMax: opz.livelloMax, limite: opz.limite })}`);
