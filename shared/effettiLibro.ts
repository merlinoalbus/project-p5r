import type { VoceEffetto } from './effettiCatalogo.js';

/** Lo sblocco visibile viene dalle condizioni dei posti. Gli effetti storici restano nei dati. */
export function effettiVisibiliDelLibro<T extends VoceEffetto>(voci: readonly T[]): T[] {
  return voci.filter((v) => v.effetto.famiglia !== 'sblocca-luogo');
}
