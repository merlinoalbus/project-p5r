// ============================================================
// Route /api/luoghi — posizionare e collocare i luoghi (L5 «Luoghi, negozi, orari», M §3.2)
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyAnteprimaLuogoDaPin, bodyCollocaLuogo, bodyCreaLuogoDaPin, bodyPosizionaLuogo, paramsLuogo, paramsLuogoDaPin } from '../schemas/luoghi.js';
import { collocaLuogo, posizionaLuogo, type LuogoNuovo } from '../services/luoghiScritture.js';
import { anteprimaLuogoDaPin, creaLuogoDaPin } from '../services/luogoDaPinService.js';

const router = Router();

/** «Posiziona» (R5-18): crea se serve il luogo, il pin collegato sulla planimetria e l'Area, in una transazione. */
router.post('/posiziona', validate({ body: bodyPosizionaLuogo }), (req, res) => {
  res.status(201).json(posizionaLuogo(req.body as { luogo?: string; nuovo?: LuogoNuovo; mappa: string; x: number; y: number }));
});

/** Il pin è già presente: l'anteprima non crea né riserva alcuna identità. */
router.post('/da-pin/:id/anteprima', validate({ params: paramsLuogoDaPin, body: bodyAnteprimaLuogoDaPin }), (req, res) => {
  res.set('Cache-Control', 'no-store').json(anteprimaLuogoDaPin(Number(req.params.id), req.body));
});

/** Crea soltanto il luogo e collega il pin letto nell'anteprima, in una TX con CAS. */
router.post('/da-pin/:id', validate({ params: paramsLuogoDaPin, body: bodyCreaLuogoDaPin }), (req, res) => {
  res.set('Cache-Control', 'no-store').status(201).json(creaLuogoDaPin(Number(req.params.id), req.body));
});

/** «Colloca»: il luogo in un'Area del suo quartiere (o fra i da collocare con null). */
router.put('/:quartiere/:luogo/area', validate({ params: paramsLuogo, body: bodyCollocaLuogo }), (req, res) => {
  res.json(collocaLuogo(String(req.params.quartiere), String(req.params.luogo), (req.body as { area: string | null }).area));
});

export default router;
