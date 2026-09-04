// ============================================================
// Route /api/immagini — caricamento, importazione da URL, lettura, rimozione
// ============================================================
//
// Caricamento: PUT /api/immagini/:ambito/:chiave con il file come corpo
// grezzo (Content-Type image/*), fino a 8 MB. Il frontend usa
// `fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })`.
// ============================================================

import express, { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyDaUrl, bodyImportaCatalogo, paramsImmagine, queryCatalogo, queryImmagini } from '../schemas/immagini.js';
import { elencaCatalogo, importaDaCatalogo } from '../services/catalogoRiferimentiService.js';
import {
  MAX_BYTE_IMMAGINE, eliminaImmagine, elencaImmagini, fileImmagine, importaImmagineDaUrl, leggiImmagine, salvaImmagine, type AmbitoImmagine,
} from '../services/immaginiService.js';
import { httpErrors } from '../utils/httpError.js';

const router = Router();

router.get('/', validate({ query: queryImmagini }), (req, res) => {
  res.json(elencaImmagini((req.query as { ambito?: string }).ambito));
});

// Catalogo dei riferimenti (solo link) — prima delle route parametriche /:ambito/:chiave.
router.get('/catalogo', validate({ query: queryCatalogo }), (req, res) => {
  res.json(elencaCatalogo((req.query as { ambito?: AmbitoImmagine }).ambito));
});

router.post('/catalogo/importa', validate({ body: bodyImportaCatalogo }), async (req, res) => {
  const { ambito, chiavi, sovrascrivi } = req.body as { ambito: AmbitoImmagine; chiavi: string[]; sovrascrivi?: boolean };
  res.json(await importaDaCatalogo(ambito, chiavi, sovrascrivi === true));
});

router.get('/:ambito/:chiave', validate({ params: paramsImmagine }), (req, res) => {
  const img = leggiImmagine(String(req.params.ambito), String(req.params.chiave));
  if (!img) throw httpErrors.notFound('immagine-non-trovata', `Nessuna immagine per ${String(req.params.ambito)}/${String(req.params.chiave)}.`);
  res.json(img);
});

router.get('/:ambito/:chiave/file', validate({ params: paramsImmagine }), (req, res) => {
  const { percorso, mime } = fileImmagine(String(req.params.ambito), String(req.params.chiave));
  res.type(mime);
  // Rivalidazione a ogni richiesta (ETag/Last-Modified di sendFile): una sostituzione è visibile subito.
  res.setHeader('Cache-Control', 'private, no-cache');
  res.sendFile(percorso);
});

router.put(
  '/:ambito/:chiave',
  validate({ params: paramsImmagine }),
  express.raw({ type: 'image/*', limit: MAX_BYTE_IMMAGINE }),
  (req, res) => {
    const mime = (req.headers['content-type'] ?? '').split(';')[0].trim();
    if (!Buffer.isBuffer(req.body)) throw httpErrors.badRequest('corpo-non-immagine', 'Il corpo della richiesta deve essere un file immagine (Content-Type image/*).');
    res.status(201).json(salvaImmagine(String(req.params.ambito) as AmbitoImmagine, String(req.params.chiave), mime, req.body));
  },
);

router.post('/:ambito/:chiave/da-url', validate({ params: paramsImmagine, body: bodyDaUrl }), async (req, res) => {
  res.status(201).json(await importaImmagineDaUrl(String(req.params.ambito) as AmbitoImmagine, String(req.params.chiave), (req.body as { url: string }).url));
});

router.delete('/:ambito/:chiave', validate({ params: paramsImmagine }), (req, res) => {
  eliminaImmagine(String(req.params.ambito), String(req.params.chiave));
  res.status(204).end();
});

export default router;
