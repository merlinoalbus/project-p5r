// ============================================================
// Route /api/fusione — fusione diretta, ricette per una Persona, fusioni con una Persona
// ============================================================
//
// Il contesto (DLC posseduti) si prende dalla partita indicata (`partita=<id>`), oppure dall'elenco
// esplicito `dlc=1,2,3`; senza nulla si considerano i soli contenuti base. `livelloMax` filtra i
// risultati al livello del protagonista (nel gioco non si può fondere una Persona di livello superiore).
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { paramsPersonaId, queryCercaSkill, queryEredita, queryFondi, queryPiani, queryRicette } from '../schemas/fusione.js';
import { cercaPerSkillDto, ereditaDto, fondiDto, fusioniConDto, pianiDto, ricettePerDto, vellutoDto } from '../services/fusione/fusioneService.js';
import { z } from 'zod';

const router = Router();

router.get('/fondi', validate({ query: queryFondi }), (req, res) => {
  const q = req.query as unknown as { a: number; b: number; partita?: number; dlc?: number[] };
  res.json(fondiDto(q.a, q.b, { partitaId: q.partita, dlc: q.dlc }));
});

router.get('/ricette/:personaId', validate({ params: paramsPersonaId, query: queryRicette }), (req, res) => {
  const q = req.query as unknown as { partita?: number; dlc?: number[]; livelloMax?: number; limite?: number };
  res.json(ricettePerDto(Number(req.params.personaId), { partitaId: q.partita, dlc: q.dlc, livelloMax: q.livelloMax, limite: q.limite }));
});

router.get('/con/:personaId', validate({ params: paramsPersonaId, query: queryRicette }), (req, res) => {
  const q = req.query as unknown as { partita?: number; dlc?: number[]; livelloMax?: number; limite?: number };
  res.json(fusioniConDto(Number(req.params.personaId), { partitaId: q.partita, dlc: q.dlc, livelloMax: q.livelloMax, limite: q.limite }));
});

router.get('/piani/:personaId', validate({ params: paramsPersonaId, query: queryPiani }), (req, res) => {
  const q = req.query as unknown as { partita?: number; dlc?: number[]; livelloMax?: number; profondita?: number; alternative?: number; catture?: boolean; limitaLivello?: boolean; slotFortunato?: boolean; skill?: number[] };
  res.json(pianiDto(Number(req.params.personaId), { partitaId: q.partita, dlc: q.dlc, livelloMax: q.livelloMax, profondita: q.profondita, alternative: q.alternative, catture: q.catture, limitaLivello: q.limitaLivello, slotFortunato: q.slotFortunato, skill: q.skill }));
});

router.get('/eredita', validate({ query: queryEredita }), (req, res) => {
  const q = req.query as unknown as { a: number; b: number; partita?: number; dlc?: number[]; livelloA?: number; livelloB?: number };
  res.json(ereditaDto(q.a, q.b, { partitaId: q.partita, dlc: q.dlc, livelloA: q.livelloA, livelloB: q.livelloB }));
});

router.get('/cerca-skill', validate({ query: queryCercaSkill }), (req, res) => {
  const q = req.query as unknown as { skill: number[]; risultato?: number; partita?: number; dlc?: number[]; livelloMax?: number; limite?: number };
  res.json(cercaPerSkillDto(q.skill, { risultatoId: q.risultato, partitaId: q.partita, dlc: q.dlc, livelloMax: q.livelloMax, limite: q.limite }));
});

router.get('/velluto', validate({ query: z.object({ partita: z.coerce.number().int().positive() }) }), (req, res) => {
  res.json(vellutoDto((req.query as unknown as { partita: number }).partita));
});

export default router;
