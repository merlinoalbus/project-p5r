// ============================================================
// Route /api/partite — partite multiple e tracking della partita
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  bodyAggiornaPartita, bodyAggiornaPosseduta, bodyAggiungiPosseduta, bodyCompendio, bodyConfidente, bodyCreaPartita, bodyDote,
  bodyAggiornaObiettivo, bodyAggiornaPianoSalvato, bodyCreaObiettivo, bodySalvaPiano, paramsPartita, paramsPartitaPiano, queryPianiSalvati, paramsPartitaChiave, paramsPartitaEvento, paramsPartitaObiettivo, paramsPartitaPersona, paramsPartitaPosseduta, queryObiettivi, queryStorico,
} from '../schemas/partite.js';
import { aggiornaObiettivo, creaObiettivo, eliminaObiettivo, obiettivi } from '../services/obiettiviService.js';
import { aggiornaPianoSalvato, eliminaPianoSalvato, pianiSalvati, salvaPiano } from '../services/pianiSalvatiService.js';
import { eliminaEvento, storico } from '../services/storicoService.js';
import type { TipoEvento } from '../../shared/eventi.js';
import {
  aggiornaCompendio, aggiornaConfidente, aggiornaDote, aggiornaPartita, aggiornaPosseduta, aggiungiPosseduta, attivaPartita, compendioPartita,
  confidenti, creaPartita, dotiSociali, elencaPartite, eliminaPartita, leggiPartita, partitaAttiva, personePossedute, rimuoviPosseduta,
} from '../services/partiteService.js';

const router = Router();

// ---- Partite ----
router.get('/', (_req, res) => {
  res.json(elencaPartite());
});
router.get('/attiva', (_req, res) => {
  res.json(partitaAttiva());
});
router.post('/', validate({ body: bodyCreaPartita }), (req, res) => {
  res.status(201).json(creaPartita(req.body));
});
router.get('/:id', validate({ params: paramsPartita }), (req, res) => {
  res.json(leggiPartita(Number(req.params.id)));
});
router.put('/:id', validate({ params: paramsPartita, body: bodyAggiornaPartita }), (req, res) => {
  res.json(aggiornaPartita(Number(req.params.id), req.body));
});
router.post('/:id/attiva', validate({ params: paramsPartita }), (req, res) => {
  res.json(attivaPartita(Number(req.params.id)));
});
router.delete('/:id', validate({ params: paramsPartita }), (req, res) => {
  eliminaPartita(Number(req.params.id));
  res.status(204).end();
});

// ---- Doti sociali ----
router.get('/:id/doti', validate({ params: paramsPartita }), (req, res) => {
  res.json(dotiSociali(Number(req.params.id)));
});
router.patch('/:id/doti/:chiave', validate({ params: paramsPartitaChiave, body: bodyDote }), (req, res) => {
  res.json(aggiornaDote(Number(req.params.id), String(req.params.chiave), req.body));
});

// ---- Confidenti ----
router.get('/:id/confidenti', validate({ params: paramsPartita }), (req, res) => {
  res.json(confidenti(Number(req.params.id)));
});
router.put('/:id/confidenti/:chiave', validate({ params: paramsPartitaChiave, body: bodyConfidente }), (req, res) => {
  res.json(aggiornaConfidente(Number(req.params.id), String(req.params.chiave), req.body));
});

// ---- Compendio personale ----
router.get('/:id/compendio', validate({ params: paramsPartita }), (req, res) => {
  res.json(compendioPartita(Number(req.params.id)));
});
router.put('/:id/compendio/:personaId', validate({ params: paramsPartitaPersona, body: bodyCompendio }), (req, res) => {
  res.json(aggiornaCompendio(Number(req.params.id), Number(req.params.personaId), req.body));
});

// ---- Persona possedute ----
router.get('/:id/persona', validate({ params: paramsPartita }), (req, res) => {
  res.json(personePossedute(Number(req.params.id)));
});
router.post('/:id/persona', validate({ params: paramsPartita, body: bodyAggiungiPosseduta }), (req, res) => {
  const { personaId, ...dati } = req.body as { personaId: number } & Parameters<typeof aggiungiPosseduta>[2];
  res.status(201).json(aggiungiPosseduta(Number(req.params.id), personaId, dati));
});
router.put('/:id/persona/:possedutaId', validate({ params: paramsPartitaPosseduta, body: bodyAggiornaPosseduta }), (req, res) => {
  res.json(aggiornaPosseduta(Number(req.params.id), Number(req.params.possedutaId), req.body));
});
router.delete('/:id/persona/:possedutaId', validate({ params: paramsPartitaPosseduta }), (req, res) => {
  rimuoviPosseduta(Number(req.params.id), Number(req.params.possedutaId));
  res.status(204).end();
});

// ---- Obiettivi (Fase 5.2) ----
router.get('/:id/obiettivi', validate({ params: paramsPartita, query: queryObiettivi }), (req, res) => {
  res.json(obiettivi(Number(req.params.id), (req.query as { stato?: 'aperto' | 'raggiunto' | 'annullato' }).stato));
});
router.post('/:id/obiettivi', validate({ params: paramsPartita, body: bodyCreaObiettivo }), (req, res) => {
  const { personaId, ...dati } = req.body as { personaId: number } & Parameters<typeof creaObiettivo>[2];
  res.status(201).json(creaObiettivo(Number(req.params.id), personaId, dati));
});
router.put('/:id/obiettivi/:obiettivoId', validate({ params: paramsPartitaObiettivo, body: bodyAggiornaObiettivo }), (req, res) => {
  res.json(aggiornaObiettivo(Number(req.params.id), Number(req.params.obiettivoId), req.body));
});
router.delete('/:id/obiettivi/:obiettivoId', validate({ params: paramsPartitaObiettivo }), (req, res) => {
  eliminaObiettivo(Number(req.params.id), Number(req.params.obiettivoId));
  res.status(204).end();
});

// ---- Piani salvati (Fase 5.3) ----
router.get('/:id/piani', validate({ params: paramsPartita, query: queryPianiSalvati }), (req, res) => {
  res.json(pianiSalvati(Number(req.params.id), (req.query as unknown as { obiettivo?: number }).obiettivo));
});
router.post('/:id/piani', validate({ params: paramsPartita, body: bodySalvaPiano }), (req, res) => {
  res.status(201).json(salvaPiano(Number(req.params.id), req.body as Parameters<typeof salvaPiano>[1]));
});
router.put('/:id/piani/:pianoId', validate({ params: paramsPartitaPiano, body: bodyAggiornaPianoSalvato }), (req, res) => {
  res.json(aggiornaPianoSalvato(Number(req.params.id), Number(req.params.pianoId), req.body));
});
router.delete('/:id/piani/:pianoId', validate({ params: paramsPartitaPiano }), (req, res) => {
  eliminaPianoSalvato(Number(req.params.id), Number(req.params.pianoId));
  res.status(204).end();
});

// ---- Storico (Fase 5.1) ----
router.get('/:id/storico', validate({ params: paramsPartita, query: queryStorico }), (req, res) => {
  const q = req.query as unknown as { limite?: number; prima?: number; tipi?: string; persona?: number };
  res.json(storico(Number(req.params.id), { limite: q.limite, prima: q.prima, tipi: q.tipi ? (q.tipi.split(',').filter(Boolean) as TipoEvento[]) : undefined, personaId: q.persona }));
});
router.delete('/:id/storico/:eventoId', validate({ params: paramsPartitaEvento }), (req, res) => {
  eliminaEvento(Number(req.params.id), Number(req.params.eventoId));
  res.status(204).end();
});

export default router;
