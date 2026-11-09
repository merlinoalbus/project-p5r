// ============================================================
// fasciaLuogo — «giorno», «sera» o «giorno e sera», ricavata dagli orari del luogo
// ============================================================
//
// Il luogo non porta più un campo `quando`: la fonte è una sola, gli orari (`orari.fasce`). Una fascia sola è quella; nessuna fascia
// (= sempre) o due fasce vuol dire «entrambe». Senza orari nel dato (il server li emette sempre) non c'è niente da dire.
// ============================================================

import type { OrariDelLuogo } from '../../shared/orariNegozio';

export type FasciaDelLuogo = 'giorno' | 'sera' | 'entrambe';

export function fasciaDelLuogo(orari: Pick<OrariDelLuogo, 'fasce'> | null | undefined): FasciaDelLuogo | null {
  if (!orari) return null;
  return orari.fasce.length === 1 ? orari.fasce[0] : 'entrambe';
}

/** Il testo del chip del luogo: «giorno», «sera» o «giorno e sera»; null se gli orari non ci sono. */
export function testoFasciaDelLuogo(orari: Pick<OrariDelLuogo, 'fasce'> | null | undefined): string | null {
  const f = fasciaDelLuogo(orari);
  return f === null ? null : f === 'entrambe' ? 'giorno e sera' : f;
}
