// ============================================================
// Schemi zod dei luoghi (L5 «Luoghi, negozi, orari»): pagina del luogo, posizionamento e collocazione
// ============================================================

import { z } from 'zod';
import { idParam } from './comuni.js';

/** La pagina di un luogo: quartiere e parte del luogo della sua chiave (`<quartiere>/<luogo>`). */
export const paramsLuogo = z.object({ quartiere: z.string().min(1).max(120), luogo: z.string().min(1).max(160) });

/** La partita, per presenza e acquisti. */
export const queryLuogo = z.object({ partita: idParam.optional() });

/** Gli orari come valori (shared/orariNegozio). */
const orari = z.object({
  giorni: z.array(z.enum(['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'])).max(7).default([]),
  fasce: z.array(z.enum(['giorno', 'sera'])).max(2).default([]),
  chiusoConPioggia: z.boolean().default(false),
  nota: z.string().trim().max(300).nullable().default(null),
});

/** «Posiziona» (R5-18): un luogo esistente (`luogo`) o nuovo (`nuovo`), la planimetria e il punto (percentuali). */
export const bodyPosizionaLuogo = z.object({
  luogo: z.string().min(1).max(200).optional(),
  nuovo: z.object({ nome: z.string().trim().min(1).max(160), tipo: z.string().min(1).max(40), cosaOffre: z.string().max(600).optional(), orari: orari.nullable().optional() }).optional(),
  mappa: z.string().min(1).max(200),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
}).strict().refine((b) => (b.luogo === undefined) !== (b.nuovo === undefined), { message: 'Indica un luogo che esiste oppure i dati di un luogo nuovo: uno dei due.', path: ['luogo'] });

/** «Colloca»: l'Area del quartiere (slug), o null per rimetterlo fra i da collocare. */
export const bodyCollocaLuogo = z.object({ area: z.string().min(1).max(120).nullable() }).strict();
