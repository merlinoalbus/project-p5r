// ============================================================
// Route /api/traduzioni — lettura e modifica delle rese italiane
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyTraduzione, paramsTraduzione, queryTraduzioni } from '../schemas/traduzioni.js';
import { aggiornaTraduzione, elencaAmbiti, elencaTraduzioni, ripristinaTraduzione } from '../services/traduzioniService.js';

const router = Router();

router.get('/', validate({ query: queryTraduzioni }), (req, res) => {
  const q = req.query as { ambito?: string; q?: string; soloUtente?: boolean };
  res.json(elencaTraduzioni(q));
});

router.get('/ambiti', (_req, res) => {
  res.json(elencaAmbiti());
});

router.put('/:ambito/:chiave', validate({ params: paramsTraduzione, body: bodyTraduzione }), (req, res) => {
  res.json(aggiornaTraduzione(String(req.params.ambito), String(req.params.chiave), (req.body as { testo: string }).testo));
});

router.delete('/:ambito/:chiave', validate({ params: paramsTraduzione }), (req, res) => {
  res.json(ripristinaTraduzione(String(req.params.ambito), String(req.params.chiave)));
});

export default router;
