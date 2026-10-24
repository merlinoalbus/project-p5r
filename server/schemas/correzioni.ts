import { z } from 'zod';
import { LIMITE_TESTO_LUNGO, LIMITE_VOCE_ELENCO, LIMITE_VOCI } from '../services/ripristino/registro.js';

/** Il tipo si controlla nel servizio (404 `tipo-non-modificabile`): qui solo la forma. */
const tipo = z.string().min(1).max(60);
const chiave = z.string().min(1).max(600);
const indirizzoCampo = z.string().min(1).max(300);

export const paramsCorrezione = z.object({ tipo, chiave });
export const queryCorrezioni = z.object({ tipo: tipo.optional() }).strict();

/** Un valore di campo: testo, numero, sì/no, vuoto o elenco di testi; il tipo giusto per ogni campo lo dice il registro nel servizio. */
const valoreCampo = z.union([z.string().max(LIMITE_TESTO_LUNGO), z.number(), z.boolean(), z.null(), z.array(z.string().max(LIMITE_VOCE_ELENCO)).max(LIMITE_VOCI)]);

export const bodyCorrezione = z.object({
  campi: z.record(indirizzoCampo, valoreCampo).refine((c) => Object.keys(c).length > 0, 'Indica almeno un campo da correggere.'),
}).strict();
export type DatiCorrezione = z.infer<typeof bodyCorrezione>;

/** Senza `campi` si rimette tutto l'oggetto. */
export const bodyRipristinoCorrezione = z.object({ campi: z.array(indirizzoCampo).min(1).max(LIMITE_VOCI).optional() }).strict();
export type DatiRipristinoCorrezione = z.infer<typeof bodyRipristinoCorrezione>;
