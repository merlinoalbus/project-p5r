// ============================================================
// Route /api/luoghi — posizionare e collocare i luoghi (L5 «Luoghi, negozi, orari», M §3.2)
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyCollocaLuogo, bodyPosizionaLuogo, paramsLuogo } from '../schemas/luoghi.js';
import { collocaLuogo, posizionaLuogo, type LuogoNuovo } from '../services/luoghiScritture.js';

const router = Router();

/** «Posiziona» (R5-18): crea se serve il luogo, il pin collegato sulla planimetria e l'Area, in una transazione. */
router.post('/posiziona', validate({ body: bodyPosizionaLuogo }), (req, res) => {
  res.status(201).json(posizionaLuogo(req.body as { luogo?: string; nuovo?: LuogoNuovo; mappa: string; x: number; y: number }));
});

/** «Colloca»: il luogo in un'Area del suo quartiere (o fra i da collocare con null). */
router.put('/:quartiere/:luogo/area', validate({ params: paramsLuogo, body: bodyCollocaLuogo }), (req, res) => {
  res.json(collocaLuogo(String(req.params.quartiere), String(req.params.luogo), (req.body as { area: string | null }).area));
});

export default router;
