// ============================================================
// API luoghi (L5 «Luoghi, negozi, orari»): la pagina del luogo, fonte unica di orari, presenza, negozi e pin
// ============================================================

import type { LuogoDettaglioDto } from '../../types';
import type { OrariNegozio } from '../../../shared/orariNegozio';
import { apiGet, apiPost, apiPut, queryString } from './_helpers';

/** Un luogo nuovo da creare mentre lo si posiziona («Nuovo luogo» di «Aggiungi luogo»). */
export interface LuogoNuovoApi { nome: string; tipo: string; cosaOffre: string; orari?: OrariNegozio | null }

/** L5 (R5-18): posiziona un luogo su una planimetria — uno che esiste (`luogo`) o uno nuovo (`nuovo`) —, col suo pin e l'area della
 *  planimetria; risponde col luogo. 409 se il luogo ha già un pin su quella planimetria. */
export const posizionaLuogo = (dati: { luogo?: string; nuovo?: LuogoNuovoApi; mappa: string; x: number; y: number }): Promise<LuogoDettaglioDto> =>
  apiPost('/luoghi/posiziona', dati);

/** L5: colloca un luogo «da collocare» in un'area del suo quartiere (`area` = slug, null = da collocare). */
export const collocaLuogo = (chiave: string, area: string | null): Promise<LuogoDettaglioDto> => {
  const [quartiere, ...resto] = chiave.split('/');
  return apiPut(`/luoghi/${encodeURIComponent(quartiere)}/${encodeURIComponent(resto.join('/'))}/area`, { area });
};

/** La pagina di un luogo (`chiave` = «quartiere/luogo», come `LuogoDto.chiave`), con la presenza nella partita. */
export const getLuogo = (chiave: string, partita?: number): Promise<LuogoDettaglioDto> => {
  const [quartiere, ...resto] = chiave.split('/');
  return apiGet(`/compendio/luoghi/${encodeURIComponent(quartiere)}/${encodeURIComponent(resto.join('/'))}${queryString({ partita })}`);
};
