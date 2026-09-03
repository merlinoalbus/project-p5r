// ============================================================
// Route /api/partite — partite multiple e tracking della partita
// ============================================================

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  bodyAggiornaPartita, bodyAggiornaPosseduta, bodyAggiungiPosseduta, bodyCompendio, bodyConfidente, bodyCreaPartita, bodyDote,
  paramsPartita, paramsPartitaChiave, paramsPartitaPersona, paramsPartitaPosseduta,
} from '../schemas/partite.js';
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

export default router;
