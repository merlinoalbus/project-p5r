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
import { dettaglioQuartiere, elencaQuartieri } from '../services/cittaService.js';
import { attivitaTutte } from '../services/attivitaService.js';
import { cruciverba } from '../services/cruciverbaService.js';
import { dettaglioNegozio, elencaNegozi, ricercaArticoli } from '../services/negoziService.js';
import { giornoPercorso, indicePercorso } from '../services/percorsoService.js';
import { completamento } from '../services/completamentoService.js';
import { datiGuida } from '../services/richiesteService.js';
import { httpErrors } from '../utils/httpError.js';
import type { OggettiGuidaDto, PersonaggiDto, SfideDto } from '../../shared/types.js';
import { validate } from '../middleware/validate.js';
import { paramsId, queryOggetti, queryPersona, querySkill } from '../schemas/compendio.js';
import {
  dettaglioPersona, dettaglioSkill, elencaArcani, dettaglioConfidente, elencaConfidenti, elencaOggetti, elencaPersona, elencaSkill, glossario, regoleFusione, terminiGlossario,
} from '../services/compendioService.js';

const queryDomande = z.object({ partita: z.coerce.number().int().positive().optional() });
const queryArticoli = z.object({ q: z.string().min(1).max(80).optional(), categoria: z.enum(['arma', 'protezione', 'accessorio', 'abito', 'consumabile', 'regalo', 'materiale', 'cibo', 'altro']).optional(), per: z.string().min(1).max(40).optional(), partita: z.coerce.number().int().positive().optional() });
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
router.get('/oggetti-guida', (_req, res) => {
  const dati = datiGuida<OggettiGuidaDto>('oggetti-guida');
  if (!dati) throw httpErrors.notFound('oggetti-non-disponibili', 'I dati degli oggetti della guida non sono caricati.');
  res.json(dati);
});
router.get('/personaggi', (_req, res) => {
  const dati = datiGuida<PersonaggiDto>('personaggi');
  if (!dati) throw httpErrors.notFound('personaggi-non-disponibili', 'I dati dei personaggi non sono caricati.');
  res.json(dati);
});
router.get('/sfide', (_req, res) => {
  const dati = datiGuida<SfideDto>('sfide');
  if (!dati) throw httpErrors.notFound('sfide-non-disponibili', 'I dati delle sfide non sono caricati.');
  res.json(dati);
});
router.get('/completamento', validate({ query: queryDomande }), (req, res) => {
  res.json(completamento((req.query as unknown as { partita?: number }).partita));
});
router.get('/percorso', validate({ query: queryDomande }), (req, res) => {
  res.json(indicePercorso((req.query as unknown as { partita?: number }).partita));
});
router.get('/percorso/:data', validate({ params: z.object({ data: z.string().regex(/^\d{2}-\d{2}$/) }), query: queryDomande }), (req, res) => {
  res.json(giornoPercorso(String(req.params.data), (req.query as unknown as { partita?: number }).partita));
});
router.get('/negozi', (_req, res) => {
  res.json(elencaNegozi());
});
router.get('/negozi/:chiave', validate({ params: z.object({ chiave: z.string().min(1).max(80) }), query: queryDomande }), (req, res) => {
  res.json(dettaglioNegozio(String(req.params.chiave), (req.query as unknown as { partita?: number }).partita));
});
router.get('/articoli', validate({ query: queryArticoli }), (req, res) => {
  const q = req.query as unknown as { q?: string; categoria?: string; per?: string; partita?: number };
  res.json(ricercaArticoli({ q: q.q, categoria: q.categoria, per: q.per }, q.partita));
});
router.get('/cruciverba', validate({ query: queryDomande }), (req, res) => {
  res.json(cruciverba((req.query as unknown as { partita?: number }).partita));
});
router.get('/citta', (_req, res) => {
  res.json(elencaQuartieri());
});
router.get('/citta/:chiave', validate({ params: z.object({ chiave: z.string().min(1).max(80) }) }), (req, res) => {
  res.json(dettaglioQuartiere(String(req.params.chiave)));
});
router.get('/attivita', validate({ query: queryDomande }), (req, res) => {
  res.json(attivitaTutte((req.query as unknown as { partita?: number }).partita));
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
