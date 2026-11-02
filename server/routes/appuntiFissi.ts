// ============================================================
// Rotte `/api/appunti-fissi` — gli appunti fissi del Diario (2026-10-31, C7) e le loro categorie (2026-11-02)
// ============================================================
// Rotte sottili: la logica sta in `appuntiFissiService`. Solo nell'istanza di preparazione (non sono nell'elenco del giocatore,
// `server/rilascio/rotteGiocatore.ts`, quindi il rilascio non le monta). Le rotte delle categorie stanno prima di `/:id`.
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  bodyModificaAppuntoFisso, bodyNomeCategoriaAppunti, bodyNuovoAppuntoFisso, bodyPostoAppuntoFisso, bodyPostoCategoriaAppunti, paramsAppuntoFisso,
  paramsCategoriaAppunti,
} from '../schemas/appuntiFissi.js';
import {
  creaAppuntoFisso, creaCategoriaAppunti, elencoAppuntiFissi, eliminaAppuntoFisso, eliminaCategoriaAppunti, modificaAppuntoFisso,
  rinominaCategoriaAppunti, spostaAppuntoFisso, spostaCategoriaAppunti,
} from '../services/appuntiFissiService.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(elencoAppuntiFissi());
});
router.post('/', validate({ body: bodyNuovoAppuntoFisso }), (req, res) => {
  res.status(201).json(creaAppuntoFisso(req.body));
});

router.post('/categorie', validate({ body: bodyNomeCategoriaAppunti }), (req, res) => {
  res.status(201).json(creaCategoriaAppunti(req.body.nome));
});
router.patch('/categorie/:id', validate({ params: paramsCategoriaAppunti, body: bodyNomeCategoriaAppunti }), (req, res) => {
  res.json(rinominaCategoriaAppunti(Number(req.params.id), req.body.nome));
});
router.put('/categorie/:id/posto', validate({ params: paramsCategoriaAppunti, body: bodyPostoCategoriaAppunti }), (req, res) => {
  res.json(spostaCategoriaAppunti(Number(req.params.id), req.body.indice));
});
router.delete('/categorie/:id', validate({ params: paramsCategoriaAppunti }), (req, res) => {
  res.json(eliminaCategoriaAppunti(Number(req.params.id)));
});

router.put('/:id/posto', validate({ params: paramsAppuntoFisso, body: bodyPostoAppuntoFisso }), (req, res) => {
  res.json(spostaAppuntoFisso(Number(req.params.id), req.body));
});
router.patch('/:id', validate({ params: paramsAppuntoFisso, body: bodyModificaAppuntoFisso }), (req, res) => {
  res.json(modificaAppuntoFisso(Number(req.params.id), req.body));
});
router.delete('/:id', validate({ params: paramsAppuntoFisso }), (req, res) => {
  eliminaAppuntoFisso(Number(req.params.id));
  res.status(204).end();
});

export default router;
