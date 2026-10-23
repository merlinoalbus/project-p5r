import { z } from 'zod';

/** La stessa prova viene mostrata, firmata dal server e conservata nei gesti differiti. */
export const schemaValutazionePresenza = z.object({
  id: z.string().regex(/^[0-9a-f]{32}$/), generazione: z.number().int().safe().positive(),
  nome: z.string(), negozio: z.string().nullable(),
  contributoYen: z.number().int().safe().nonnegative(), prezzoCatalogoYen: z.number().int().safe().nonnegative().nullable(),
  statoPrezzo: z.enum(['noto', 'ignoto', 'offerta-assente']),
  origine: z.enum(['continuita-migrazione', 'continuita-importazione', 'nuova-presenza']),
}).strict();
export type ValutazionePresenza = z.infer<typeof schemaValutazionePresenza>;
