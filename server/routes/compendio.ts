// ============================================================
// Route /api/compendio — letture del compendio Royal
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { paramsId, queryOggetti, queryPersona, querySkill } from '../schemas/compendio.js';
import {
  dettaglioPersona, dettaglioSkill, elencaArcani, dettaglioConfidente, elencaConfidenti, elencaOggetti, elencaPersona, elencaSkill, glossario, regoleFusione, terminiGlossario,
} from '../services/compendioService.js';

const router = Router();

router.get('/arcani', (_req, res) => {
  res.json(elencaArcani());
});

router.get('/glossario', (_req, res) => {
  res.json(glossario());
});

router.get('/termini', (_req, res) => {
  res.json(terminiGlossario());
});

router.get('/fusione/regole', (_req, res) => {
  res.json(regoleFusione());
});

router.get('/persona', validate({ query: queryPersona }), (req, res) => {
  const q = req.query as unknown as import('../schemas/compendio.js').QueryPersona;
  res.json(elencaPersona(q));
});

router.get('/persona/:id', validate({ params: paramsId }), (req, res) => {
  res.json(dettaglioPersona(Number(req.params.id)));
});

router.get('/skill', validate({ query: querySkill }), (req, res) => {
  const q = req.query as { q?: string; elemento?: string };
  res.json(elencaSkill(q));
});

router.get('/skill/:id', validate({ params: paramsId }), (req, res) => {
  res.json(dettaglioSkill(Number(req.params.id)));
});

router.get('/oggetti', validate({ query: queryOggetti }), (req, res) => {
  const q = req.query as { q?: string; categoria?: string };
  res.json(elencaOggetti(q));
});

router.get('/confidenti', (_req, res) => {
  res.json(elencaConfidenti());
});
router.get('/confidenti/:chiave', (req, res) => {
  res.json(dettaglioConfidente(String(req.params.chiave)));
});

export default router;
