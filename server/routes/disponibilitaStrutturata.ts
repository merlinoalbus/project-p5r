// ============================================================
// Route /api/compendio/confidenti/:chiave/disponibilita-strutturata — la disponibilità strutturata dei Confidenti (L9 R9-01)
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { paramsChiaveGuida } from '../schemas/guidaDungeon.js';
import { disponibilitaConfidente } from '../services/disponibilitaStrutturataService.js';
import { ripristinaDisponibilita, salvaDisponibilita, type ModificaDisponibilita } from '../services/disponibilitaStrutturataScritture.js';
import { FASCE_DISPONIBILITA, GIORNI_DISPONIBILITA, MODI_DISPONIBILITA } from '../../shared/disponibilitaStrutturata.js';

const router = Router();

const queryPartita = z.object({ partita: z.coerce.number().int().positive().optional() }).strict();
const eccezione = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('pioggia'), effetto: z.literal('non-disponibile'), ranghi: z.array(z.number().int().min(1).max(10)).max(10).optional() }).strict(),
  z.object({ tipo: z.literal('dopo-rango'), giorni: z.number().int().min(1).max(30), effetto: z.literal('non-disponibile') }).strict(),
  z.object({ tipo: z.literal('fascia-rango'), rango: z.number().int().min(1).max(10), fasce: z.array(z.enum(FASCE_DISPONIBILITA as unknown as [string, ...string[]])).min(1).max(2) }).strict(),
]);
const bodyDisponibilita = z.object({
  modo: z.enum(MODI_DISPONIBILITA as unknown as [string, ...string[]]).optional(),
  giorni: z.array(z.enum(GIORNI_DISPONIBILITA as unknown as [string, ...string[]])).max(8).optional(),
  fasce: z.array(z.enum(FASCE_DISPONIBILITA as unknown as [string, ...string[]])).max(2).optional(),
  eccezioni: z.array(eccezione).max(20).optional(),
  dal: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
  motivoSenzaLuogo: z.string().max(500).optional(),
  luoghi: z.array(z.string().min(1).max(200)).max(60).optional(),
}).strict();

/** La disponibilità del Confidente, con i luoghi per chiave; con `?partita=` anche se è disponibile adesso. */
router.get('/confidenti/:chiave/disponibilita-strutturata', validate({ params: paramsChiaveGuida, query: queryPartita }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(disponibilitaConfidente(String(req.params.chiave), (req.query as { partita?: number }).partita));
});
router.put('/confidenti/:chiave/disponibilita-strutturata', validate({ params: paramsChiaveGuida, body: bodyDisponibilita }), (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(salvaDisponibilita(String(req.params.chiave), req.body as ModificaDisponibilita));
});
/** «Ripristina»: la struttura torna come la dà la fonte G-036. */
router.post('/confidenti/:chiave/disponibilita-strutturata/ripristina', validate({ params: paramsChiaveGuida }), (req, res) => {
  res.json(ripristinaDisponibilita(String(req.params.chiave)));
});

export default router;
