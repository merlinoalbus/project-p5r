// ============================================================
// Le affinità di una Persona modificabili (R8-10/1) — tipi condivisi dell'editor
// ============================================================

import type { CodiceAffinita } from './elementi.js';

/** Una affinità del corpo di «Salva»: il corpo porta tutti e 10 gli elementi, ciascuno una volta sola. */
export interface RigaAffinitaModifica {
  elemento: string;
  codice: CodiceAffinita;
}

/** Il corpo di `PUT /api/compendio/persona/:id/affinita`. */
export interface ModificaAffinitaPersona {
  affinita: RigaAffinitaModifica[];
}
