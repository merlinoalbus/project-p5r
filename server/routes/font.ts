// ============================================================
// Route /api/font — font dell'utente per i ruoli tipografici (display, menu, decor)
// ============================================================
//
// Caricamento: PUT /api/font/:ruolo con il file come corpo grezzo (qualunque Content-Type: il formato
// viene riconosciuto dal contenuto), fino a 4 MB. GET /api/font elenca i tre ruoli; GET /api/font/:ruolo/file
// restituisce il file; DELETE /api/font/:ruolo torna al font predefinito.
// ============================================================

import express, { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { paramsFont } from '../schemas/font.js';
import { MAX_BYTE_FONT, elencaFont, eliminaFont, fileFont, salvaFont } from '../services/fontService.js';
import { httpErrors } from '../utils/httpError.js';
import type { RuoloFont } from '../../shared/types.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(elencaFont());
});

router.get('/:ruolo/file', validate({ params: paramsFont }), (req, res) => {
  const { percorso, mime } = fileFont(String(req.params.ruolo) as RuoloFont);
  res.type(mime);
  // Rivalidazione a ogni richiesta: una sostituzione è visibile subito (il frontend aggiunge anche la data al querystring).
  res.setHeader('Cache-Control', 'private, no-cache');
  res.sendFile(percorso);
});

router.put(
  '/:ruolo',
  validate({ params: paramsFont }),
  express.raw({ type: () => true, limit: MAX_BYTE_FONT }),
  (req, res) => {
    if (!Buffer.isBuffer(req.body)) throw httpErrors.badRequest('corpo-non-font', 'Il corpo della richiesta deve essere il file del font.');
    res.status(201).json(salvaFont(String(req.params.ruolo) as RuoloFont, req.body));
  },
);

router.delete('/:ruolo', validate({ params: paramsFont }), (req, res) => {
  eliminaFont(String(req.params.ruolo) as RuoloFont);
  res.status(204).end();
});

export default router;
