// ============================================================
// Schemi zod dei luoghi (L5 «Luoghi, negozi, orari»): pagina del luogo, posizionamento e collocazione
// ============================================================

import { z } from 'zod';
import { idParam } from './comuni.js';

/** La pagina di un luogo: quartiere e parte del luogo della sua chiave (`<quartiere>/<luogo>`). */
export const paramsLuogo = z.object({ quartiere: z.string().min(1).max(120), luogo: z.string().min(1).max(160) });

/** La partita, per presenza e acquisti. */
export const queryLuogo = z.object({ partita: idParam.optional() });
