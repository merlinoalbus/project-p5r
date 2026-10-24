// ============================================================
// Rotte `/api/correzioni` — correggere e rimettere com'era ciò che la guida dice (L11 · B11)
// ============================================================
// Quattro rotte sottili: la logica e il registro degli oggetti correggibili stanno in `ripristinoService`.
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyCorrezione, bodyRipristinoCorrezione, paramsCorrezione, queryCorrezioni, type DatiCorrezione, type DatiRipristinoCorrezione } from '../schemas/correzioni.js';
import { correggi, elencaCorrezioni, ripristina, schedaCorrezione } from '../services/ripristinoService.js';

const router = Router();

router.get('/', validate({ query: queryCorrezioni }), (req, res) => {
  res.json(elencaCorrezioni((req.query as { tipo?: string }).tipo));
});
router.get('/:tipo/:chiave', validate({ params: paramsCorrezione }), (req, res) => {
  res.json(schedaCorrezione(String(req.params.tipo), String(req.params.chiave)));
});
router.put('/:tipo/:chiave', validate({ params: paramsCorrezione, body: bodyCorrezione }), (req, res) => {
  res.json(correggi(String(req.params.tipo), String(req.params.chiave), (req.body as DatiCorrezione).campi));
});
router.post('/:tipo/:chiave/ripristina', validate({ params: paramsCorrezione, body: bodyRipristinoCorrezione }), (req, res) => {
  res.json(ripristina(String(req.params.tipo), String(req.params.chiave), (req.body as DatiRipristinoCorrezione).campi));
});

export default router;
