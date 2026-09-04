// ============================================================
// Schemi zod — font dell'utente
// ============================================================

import { z } from 'zod';
import { RUOLI_FONT } from '../services/fontService.js';

export const paramsFont = z.object({
  ruolo: z.enum(RUOLI_FONT),
});
