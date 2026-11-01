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
import { paramsPersonaId, queryCercaSkill, queryEredita, queryFondi, queryPiani, queryCicli, queryRicette, queryVelluto } from '../schemas/fusione.js';
import { cercaPerSkillDto, cicliDto, ereditaDto, fondiDto, fusioniConDto, pianiDto, ricettePerDto, vellutoDto } from '../services/fusione/fusioneService.js';

const router = Router();

router.get('/fondi', validate({ query: queryFondi }), (req, res) => {
  const q = req.query;
  res.json(fondiDto(q.a, q.b, { partitaId: q.partita, dlc: q.dlc }));
});

router.get('/ricette/:personaId', validate({ params: paramsPersonaId, query: queryRicette }), (req, res) => {
  const q = req.query;
  res.json(ricettePerDto(Number(req.params.personaId), { partitaId: q.partita, dlc: q.dlc, livelloMax: q.livelloMax, limite: q.limite, soloPronte: q.soloPronte }));
});

router.get('/con/:personaId', validate({ params: paramsPersonaId, query: queryRicette }), (req, res) => {
  const q = req.query;
  res.json(fusioniConDto(Number(req.params.personaId), { partitaId: q.partita, dlc: q.dlc, livelloMax: q.livelloMax, limite: q.limite, soloPronte: q.soloPronte }));
});

router.get('/piani/:personaId', validate({ params: paramsPersonaId, query: queryPiani }), (req, res) => {
  const q = req.query;
  res.json(pianiDto(Number(req.params.personaId), { partitaId: q.partita, dlc: q.dlc, livelloMax: q.livelloMax, profondita: q.profondita, alternative: q.alternative, catture: q.catture, limitaLivello: q.limitaLivello, slotFortunato: q.slotFortunato, skill: q.skill }));
});

router.get('/eredita', validate({ query: queryEredita }), (req, res) => {
  const q = req.query;
  res.json(ereditaDto(q.a, q.b, { partitaId: q.partita, dlc: q.dlc, livelloA: q.livelloA, livelloB: q.livelloB }));
});

router.get('/cerca-skill', validate({ query: queryCercaSkill }), (req, res) => {
  const q = req.query;
  res.json(cercaPerSkillDto(q.skill, { risultatoId: q.risultato, partitaId: q.partita, dlc: q.dlc, livelloMax: q.livelloMax, limite: q.limite }));
});

router.get('/cicli/:personaId', validate({ params: paramsPersonaId, query: queryCicli }), (req, res) => {
  const q = req.query;
  // i valori assenti restano undefined: i predefiniti (catture e limite di livello spenti, partner distinti) li decide il servizio
  res.json(cicliDto(Number(req.params.personaId), {
    partitaId: q.partita, dlc: q.dlc, lunghezza: q.lunghezza, lunghezzaMin: q.lunghezzaMin, partnerDistinti: q.partnerDistinti,
    alternative: q.alternative, catture: q.catture, limitaLivello: q.limitaLivello, livelloMax: q.livelloMax,
  }));
});

router.get('/velluto', validate({ query: queryVelluto }), (req, res) => {
  res.json(vellutoDto(req.query.partita));
});

export default router;
