// ============================================================
// haPlanimetria — se una mappa ha un'immagine su cui aprire il visore
// ============================================================

import type { MappaDto } from '../types';
import { ruoloConVisore } from '../../shared/immaginiMappa';

/** La mappa ha un'immagine su cui aprire il visore. Lo dice il ruolo, che il server deduce dal posto nella gerarchia (L1,
 * `shared/immaginiMappa.ts`): lo stemma di un Palazzo identifica il luogo ma non è una mappa. Per le risposte che non portano il
 * ruolo resta la regola di prima: un'immagine caricata, o un asset con le dimensioni note. */
export function haPlanimetria(mappa: MappaDto): boolean {
  if (mappa.ruoloImmagine) return ruoloConVisore(mappa.ruoloImmagine);
  return Boolean(mappa.immagineUrl || (mappa.asset && (mappa.larghezza ?? 0) > 0 && (mappa.altezza ?? 0) > 0));
}
