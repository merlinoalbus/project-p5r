// ============================================================
// Schemi zod — immagini
// ============================================================

import { z } from 'zod';
import { AMBITI_CARICAMENTO, AMBITI_IMMAGINE } from '../../shared/immagini.js';

/** Una singola immagine: tutti gli ambiti, anche quelli della grafica predefinita (che si può sostituire o leggere). */
export const paramsImmagine = z.object({
  ambito: z.enum(AMBITI_IMMAGINE),
  chiave: z.string().min(1).max(200),
});

/** Elenco e rimozione multipla: solo gli ambiti di caricamento (la grafica predefinita non si svuota in blocco). */
export const queryImmagini = z.object({
  ambito: z.enum(AMBITI_CARICAMENTO).optional(),
});

/** Il file di un'immagine: la versione (`v`, dall'URL versionato) e la larghezza della miniatura (`l`, L1). `l` si controlla
 *  nella rotta, contro le misure ammesse (`shared/miniature.ts`), per rispondere col codice `larghezza-non-ammessa`. */
export const queryFileImmagine = z.object({
  v: z.string().max(100).optional(),
  l: z.string().max(10).optional(),
});

/** La conferma di eliminare i pezzi (102) delle mappe che cambiano immagine (L1): `eliminaPezzi=1`, come nell'editor. */
export const queryConfermaPezzi = z.object({ eliminaPezzi: z.enum(['0', '1']).optional() });

/** Rimozione multipla: l'ambito e la conferma dei pezzi. */
export const queryRimozioneImmagini = queryImmagini.extend(queryConfermaPezzi.shape);

export const bodyDaUrl = z.object({
  url: z.string().url().max(2000),
});
