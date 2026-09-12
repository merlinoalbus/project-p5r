// ============================================================
// Route /api/immagini — manifesto della grafica predefinita, caricamento, importazione da URL, lettura, rimozione
// ============================================================
//
// Caricamento: PUT /api/immagini/:ambito/:chiave con il file come corpo
// grezzo (Content-Type image/*), fino a 8 MB. Il frontend usa
// `fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })`.
// Le immagini vivono nel database (migrazione 079): il file si risponde dal contenuto della riga,
// con un ETag stabile finché la riga non cambia.
// ============================================================

import express, { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { bodyDaUrl, paramsImmagine, queryImmagini } from '../schemas/immagini.js';
import {
  MAX_BYTE_IMMAGINE, eliminaImmagine, eliminaImmaginiAmbito, elencaImmagini, fileImmagine, importaImmagineDaUrl, leggiImmagine, manifestoPredefinite, salvaImmagine, type AmbitoImmagine,
} from '../services/immaginiService.js';
import { httpErrors } from '../utils/httpError.js';

const router = Router();

router.get('/', validate({ query: queryImmagini }), (req, res) => {
  res.json(elencaImmagini((req.query as { ambito?: string }).ambito));
});

/** La grafica predefinita nel database, nella forma del manifest degli asset (chiave → URL versionato). */
router.get('/manifest', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json(manifestoPredefinite());
});

// Rimozione multipla: tutte le immagini caricate di un ambito (query `ambito`) o di tutti gli ambiti di caricamento.
router.delete('/', validate({ query: queryImmagini }), (req, res) => {
  res.json({ eliminate: eliminaImmaginiAmbito((req.query as { ambito?: string }).ambito) });
});

router.get('/:ambito/:chiave', validate({ params: paramsImmagine }), (req, res) => {
  const img = leggiImmagine(String(req.params.ambito), String(req.params.chiave));
  if (!img) throw httpErrors.notFound('immagine-non-trovata', `Nessuna immagine per ${String(req.params.ambito)}/${String(req.params.chiave)}.`);
  res.json(img);
});

router.get('/:ambito/:chiave/file', validate({ params: paramsImmagine }), (req, res) => {
  const f = fileImmagine(String(req.params.ambito), String(req.params.chiave));
  // URL versionato (`?v=`): il contenuto può restare in cache per un anno perché ogni sostituzione cambia l'URL; senza versione,
  // rivalidazione a ogni richiesta con l'ETag (id + byte + data), così una sostituzione è visibile subito.
  const versionato = typeof req.query.v === 'string' && req.query.v.length > 0;
  const etag = `"${f.id}-${f.byte}-${f.createdAt}"`;
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', versionato ? 'private, max-age=31536000, immutable' : 'private, no-cache');
  if (req.headers['if-none-match'] === etag) { res.status(304).end(); return; }
  res.type(f.mime);
  res.send(f.contenuto);
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
