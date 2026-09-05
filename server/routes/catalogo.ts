// ============================================================
// Route /api/catalogo — righe del catalogo aggiunte o corrette dall'utente e agenda del giorno (Fase 16.1)
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { aggiornaElemento, creaElemento, elencaCatalogo, eliminaElemento, leggiElemento, nascondiElemento, riepilogoCatalogo } from '../services/catalogoService.js';
import { aggiornaAzione, aggiornaEvento, agendaDelGiorno, creaAzione, creaEvento, eliminaAzione, eliminaEvento, giorniConAgenda, impostaAzioneFatta } from '../services/agendaService.js';
import {
  SCHEMI_CATALOGO, bodyAggiornaAzione, bodyAggiornaEvento, bodyAzione, bodyAzioneFatta, bodyEvento, bodyNascondi,
  paramsAgendaGiorno, paramsAgendaVoce, paramsElementoCatalogo, paramsTipoCatalogo, queryAgenda,
} from '../schemas/catalogo.js';
import { httpErrors } from '../utils/httpError.js';
import type { TipoCatalogo } from '../../shared/types.js';

const router = Router();

/** Valida il corpo con lo schema del tipo indicato nel percorso (parziale per la modifica). */
function corpoPerTipo(tipo: TipoCatalogo, corpo: unknown, parziale: boolean): Record<string, unknown> {
  const schema = parziale ? SCHEMI_CATALOGO[tipo].partial() : SCHEMI_CATALOGO[tipo];
  const esito = schema.safeParse(corpo);
  if (!esito.success) {
    throw httpErrors.badRequest('dati-non-validi', `Dati del ${tipo} non validi: ${esito.error.issues.map((i) => `${i.path.join('.') || 'corpo'} — ${i.message}`).join('; ')}`, { issues: esito.error.issues });
  }
  return esito.data as Record<string, unknown>;
}

// ---- Agenda del giorno (prima delle rotte per tipo: «agenda» non è un tipo del catalogo) ----

/** Giorni che hanno eventi o cose da fare (per segnarli nel calendario). */
router.get('/agenda', validate({ query: queryAgenda }), (req, res) => {
  const q = req.query as unknown as { partita?: number };
  res.json({ giorni: giorniConAgenda(q.partita) });
});

router.get('/agenda/:data', validate({ params: paramsAgendaGiorno, query: queryAgenda }), (req, res) => {
  const q = req.query as unknown as { partita?: number };
  res.json(agendaDelGiorno(String(req.params.data), q.partita));
});

router.post('/agenda/eventi', validate({ body: bodyEvento }), (req, res) => {
  res.status(201).json(creaEvento(req.body as Parameters<typeof creaEvento>[0]));
});
router.put('/agenda/eventi/:id', validate({ params: paramsAgendaVoce, body: bodyAggiornaEvento }), (req, res) => {
  res.json(aggiornaEvento(Number(req.params.id), req.body as Parameters<typeof aggiornaEvento>[1]));
});
router.delete('/agenda/eventi/:id', validate({ params: paramsAgendaVoce }), (req, res) => {
  eliminaEvento(Number(req.params.id));
  res.status(204).end();
});

router.post('/agenda/azioni', validate({ body: bodyAzione }), (req, res) => {
  res.status(201).json(creaAzione(req.body as Parameters<typeof creaAzione>[0]));
});
router.put('/agenda/azioni/:id', validate({ params: paramsAgendaVoce, body: bodyAggiornaAzione }), (req, res) => {
  res.json(aggiornaAzione(Number(req.params.id), req.body as Parameters<typeof aggiornaAzione>[1]));
});
router.delete('/agenda/azioni/:id', validate({ params: paramsAgendaVoce }), (req, res) => {
  eliminaAzione(Number(req.params.id));
  res.status(204).end();
});
/** Spunta di una cosa da fare nella partita. */
router.put('/agenda/azioni/:id/fatta', validate({ params: paramsAgendaVoce, body: bodyAzioneFatta }), (req, res) => {
  const b = req.body as { partita: number; fatta: boolean };
  res.json(impostaAzioneFatta(b.partita, Number(req.params.id), b.fatta));
});

// ---- Catalogo ----

/** Quante righe l'utente ha aggiunto, corretto o nascosto, per tipo. */
router.get('/', (_req, res) => {
  res.json(riepilogoCatalogo());
});

router.get('/:tipo', validate({ params: paramsTipoCatalogo }), (req, res) => {
  res.json(elencaCatalogo(req.params.tipo as TipoCatalogo));
});
router.post('/:tipo', validate({ params: paramsTipoCatalogo }), (req, res) => {
  const tipo = req.params.tipo as TipoCatalogo;
  res.status(201).json(creaElemento(tipo, corpoPerTipo(tipo, req.body, false)));
});
router.get('/:tipo/:chiave', validate({ params: paramsElementoCatalogo }), (req, res) => {
  res.json(leggiElemento(req.params.tipo as TipoCatalogo, String(req.params.chiave)));
});
router.put('/:tipo/:chiave', validate({ params: paramsElementoCatalogo }), (req, res) => {
  const tipo = req.params.tipo as TipoCatalogo;
  res.json(aggiornaElemento(tipo, String(req.params.chiave), corpoPerTipo(tipo, req.body, true)));
});
router.put('/:tipo/:chiave/nascosta', validate({ params: paramsElementoCatalogo, body: bodyNascondi }), (req, res) => {
  res.json(nascondiElemento(req.params.tipo as TipoCatalogo, String(req.params.chiave), (req.body as { nascosta: boolean }).nascosta));
});
/** Elimina la riga creata dall'utente oppure riporta al seed quella corretta. */
router.delete('/:tipo/:chiave', validate({ params: paramsElementoCatalogo }), (req, res) => {
  res.json(eliminaElemento(req.params.tipo as TipoCatalogo, String(req.params.chiave)));
});

export default router;
