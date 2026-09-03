// ============================================================
// Route /api/compendio — letture del compendio Royal
// ============================================================

import { Router } from 'express';
import { z } from 'zod';
import { domande } from '../services/domandeService.js';
import { calendario } from '../services/calendarioService.js';
import { dettaglioDungeon, elencaDungeon } from '../services/dungeonService.js';
import { richieste } from '../services/richiesteService.js';
import { battaglia } from '../services/battagliaService.js';
import { validate } from '../middleware/validate.js';
import { paramsId, queryOggetti, queryPersona, querySkill } from '../schemas/compendio.js';
import {
  dettaglioPersona, dettaglioSkill, elencaArcani, dettaglioConfidente, elencaConfidenti, elencaOggetti, elencaPersona, elencaSkill, glossario, regoleFusione, terminiGlossario,
} from '../services/compendioService.js';

const queryDomande = z.object({ partita: z.coerce.number().int().positive().optional() });
const queryCalendario = z.object({ partita: z.coerce.number().int().positive().optional(), mese: z.string().regex(/^(0[1-9]|1[0-2])$/).optional() });
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
router.get('/battaglia', (_req, res) => {
  res.json(battaglia());
});
router.get('/richieste', validate({ query: queryDomande }), (req, res) => {
  res.json(richieste((req.query as unknown as { partita?: number }).partita));
});
router.get('/dungeon', validate({ query: queryDomande }), (req, res) => {
  res.json(elencaDungeon((req.query as unknown as { partita?: number }).partita));
});
router.get('/dungeon/:chiave', validate({ query: queryDomande }), (req, res) => {
  res.json(dettaglioDungeon(String(req.params.chiave), (req.query as unknown as { partita?: number }).partita));
});
router.get('/calendario', validate({ query: queryCalendario }), (req, res) => {
  const q = req.query as unknown as { partita?: number; mese?: string };
  res.json(calendario(q.partita, q.mese));
});
router.get('/domande', validate({ query: queryDomande }), (req, res) => {
  res.json(domande((req.query as unknown as { partita?: number }).partita));
});
router.get('/confidenti/:chiave', (req, res) => {
  res.json(dettaglioConfidente(String(req.params.chiave)));
});

export default router;
