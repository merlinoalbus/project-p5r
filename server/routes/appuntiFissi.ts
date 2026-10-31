// ============================================================
// Rotte `/api/appunti-fissi` — gli appunti fissi del Diario (2026-10-31, C7)
// ============================================================
// Rotte sottili: la logica sta in `appuntiFissiService`. Solo nell'istanza di preparazione (non sono nell'elenco del giocatore,
// `server/rilascio/rotteGiocatore.ts`, quindi il rilascio non le monta).
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  bodyModificaAppuntoFisso, bodyNuovoAppuntoFisso, bodyOrdineAppuntiFissi, paramsAppuntoFisso,
  type DatiModificaAppuntoFisso, type DatiNuovoAppuntoFisso, type DatiOrdineAppuntiFissi,
} from '../schemas/appuntiFissi.js';
import { creaAppuntoFisso, elencoAppuntiFissi, eliminaAppuntoFisso, modificaAppuntoFisso, riordinaAppuntiFissi } from '../services/appuntiFissiService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(elencoAppuntiFissi());
});
router.post('/', validate({ body: bodyNuovoAppuntoFisso }), (req, res) => {
  res.status(201).json(creaAppuntoFisso(req.body as DatiNuovoAppuntoFisso));
});
router.put('/ordine', validate({ body: bodyOrdineAppuntiFissi }), (req, res) => {
  res.json(riordinaAppuntiFissi((req.body as DatiOrdineAppuntiFissi).ids));
});
router.patch('/:id', validate({ params: paramsAppuntoFisso, body: bodyModificaAppuntoFisso }), (req, res) => {
  res.json(modificaAppuntoFisso(Number(req.params.id), req.body as DatiModificaAppuntoFisso));
});
router.delete('/:id', validate({ params: paramsAppuntoFisso }), (req, res) => {
  eliminaAppuntoFisso(Number(req.params.id));
  res.status(204).end();
});

export default router;
