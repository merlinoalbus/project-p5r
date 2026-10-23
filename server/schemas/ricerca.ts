// ============================================================
// Schemi zod della ricerca globale (L11, B3) — `GET /api/ricerca`
// ============================================================

import { z } from 'zod';
import { idParam } from './comuni.js';
import { LIMITE_MASSIMO_RICERCA, LIMITE_PREDEFINITO_RICERCA, MIN_CARATTERI_RICERCA, TIPI_RICERCA } from '../../shared/ricerca.js';

/** I tipi da cercare, separati da virgola («luogo,negozio»); un tipo che non esiste è un 400. */
const elencoTipi = z.string()
  .transform((s) => s.split(',').map((x) => x.trim()).filter((x) => x.length > 0))
  .pipe(z.array(z.enum(TIPI_RICERCA)).min(1).max(TIPI_RICERCA.length));

/** Il testo (≥ 2 caratteri), i tipi (tutti se manca), i risultati per gruppo e la partita per lo stato di luoghi e negozi. */
export const queryRicerca = z.object({
  q: z.string().trim().min(MIN_CARATTERI_RICERCA).max(100),
  tipi: elencoTipi.optional(),
  limite: z.coerce.number().int().min(1).max(LIMITE_MASSIMO_RICERCA).default(LIMITE_PREDEFINITO_RICERCA),
  partita: idParam.optional(),
});
