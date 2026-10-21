import { z } from 'zod';

const informazioni = z.object({
  giorni: z.array(z.string()), fasce: z.array(z.string()), luogo: z.string(),
  sbloccoData: z.string(), sbloccoRequisiti: z.string(), note: z.string(), noteGenerali: z.string(), fonti: z.array(z.string()),
}).strict();
const revisioneAttesa = z.string().regex(/^[a-f0-9]{64}$/);
const motivo = z.string().refine(v => v.trim().length > 0, 'Indica il motivo della modifica.');
const azioni = [
  z.object({ azione: z.literal('applica-proposta'), proposta: z.literal('makoto-calendario-v1'), revisioneAttesa }).strict(),
  z.object({ azione: z.literal('modifica-manuale'), valori: informazioni.partial().refine(v => Object.keys(v).length > 0, 'Seleziona almeno un campo.'), motivo, revisioneAttesa }).strict(),
  z.object({ azione: z.literal('crea-informazioni'), valori: informazioni, motivo, revisioneAttesa }).strict(),
  z.object({ azione: z.literal('ripristina-versione'), versione: z.number().int().nonnegative(), revisioneAttesa }).strict(),
] as const;
export const bodyAnteprimaInformazioniConfidente = z.discriminatedUnion('azione', azioni);
const scrittura = { anteprimaAttesa: revisioneAttesa, operazioneId: z.string().uuid() };
export const bodySalvaInformazioniConfidente = z.discriminatedUnion('azione', [
  azioni[0].extend(scrittura), azioni[1].extend(scrittura), azioni[2].extend(scrittura), azioni[3].extend(scrittura),
]);
