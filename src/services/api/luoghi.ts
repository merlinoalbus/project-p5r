// ============================================================
// API luoghi (L5 «Luoghi, negozi, orari»): la pagina del luogo, fonte unica di orari, presenza, negozi e pin
// ============================================================

import type { LuogoDettaglioDto } from '../../types';
import { apiGet, queryString } from './_helpers';

/** La pagina di un luogo (`chiave` = «quartiere/luogo», come `LuogoDto.chiave`), con la presenza nella partita. */
export const getLuogo = (chiave: string, partita?: number): Promise<LuogoDettaglioDto> => {
  const [quartiere, ...resto] = chiave.split('/');
  return apiGet(`/compendio/luoghi/${encodeURIComponent(quartiere)}/${encodeURIComponent(resto.join('/'))}${queryString({ partita })}`);
};
