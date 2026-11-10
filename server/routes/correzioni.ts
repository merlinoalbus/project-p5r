// ============================================================
// Rotte `/api/correzioni` — correggere ciò che la guida dice (L11 · B11)
// ============================================================
// Tre rotte sottili: la logica e il registro degli oggetti correggibili stanno in `ripristinoService`.
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyCorrezione, paramsCorrezione, queryCorrezioni } from '../schemas/correzioni.js';
import { correggi, elencaCorrezioni, schedaCorrezione } from '../services/ripristinoService.js';

const router = Router();

router.get('/', validate({ query: queryCorrezioni }), (req, res) => {
  res.json(elencaCorrezioni(req.query.tipo));
});
router.get('/:tipo/:chiave', validate({ params: paramsCorrezione }), (req, res) => {
  res.json(schedaCorrezione(String(req.params.tipo), String(req.params.chiave)));
});
router.put('/:tipo/:chiave', validate({ params: paramsCorrezione, body: bodyCorrezione }), (req, res) => {
  res.json(correggi(String(req.params.tipo), String(req.params.chiave), req.body.campi));
});

export default router;
