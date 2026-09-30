// ============================================================
// meteoFascia — come si dice a parole il meteo di una fascia del giorno nella partita
// ============================================================
//
// Sta qui e non accanto al componente: un file di componenti React esporta solo componenti (fast refresh).
// ============================================================

import { nomeMeteo } from '../../shared/meteoPartita';
import type { FasciaGioco, MeteoFasciaDto } from '../types';

export const NOME_FASCIA_METEO: Record<FasciaGioco, string> = { giorno: 'Di giorno', sera: 'Di sera' };

/** Il nome accessibile dello stato di una fascia: «Di sera: pioggia, dalla guida; allerta: notte torrida». */
export function descriviMeteoFascia(fascia: FasciaGioco, f: MeteoFasciaDto): string {
  const allerte = f.allerte.length > 0 ? `; allerta: ${f.allerte.map((a) => a.nome.toLowerCase()).join(', ')}` : '';
  if (!f.meteo) return `${NOME_FASCIA_METEO[fascia]}: meteo non segnato${allerte}`;
  return `${NOME_FASCIA_METEO[fascia]}: ${nomeMeteo(f.meteo).toLowerCase()}, ${f.origine === 'partita' ? 'segnato' : 'dalla guida'}${allerte}`;
}
