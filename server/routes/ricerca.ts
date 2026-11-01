// ============================================================
// Route /api/ricerca — la ricerca globale per nome (L11, B3, R11-07…R11-10b)
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { queryRicerca } from '../schemas/ricerca.js';
import { cercaGlobale } from '../services/ricercaService.js';

const router = Router();

/** Ricerca per nome (italiano, originale, sinonimi): i risultati raggruppati per tipo con percorso, casa, immagine e stato. */
router.get('/', validate({ query: queryRicerca }), (req, res) => {
  // lo stato di luoghi e negozi dipende dalla partita: la risposta non si tiene in cache
  res.set('Cache-Control', 'no-store').json(cercaGlobale(req.query));
});

export default router;
