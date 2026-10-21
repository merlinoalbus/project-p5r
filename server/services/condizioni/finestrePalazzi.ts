import { ordineGioco } from '../../../shared/condizioniSpillo.js';
import { finestreDungeon } from '../datiGuida.js';

/** null indica finestra mancante: non equivale a una finestra sempre aperta. */
export function nellaFinestraPalazzo(dungeon: string, giorno: string): boolean | null {
  const f = finestreDungeon().get(dungeon);
  if (!f) return null;
  const oggi = ordineGioco(giorno);
  return oggi >= ordineGioco(f.dal) && (!f.al || oggi <= ordineGioco(f.al));
}
