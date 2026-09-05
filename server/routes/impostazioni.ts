// ============================================================
// Route /api/impostazioni — stato dell'istanza, backup e ripristino (Fase 15.29)
// ============================================================
//
// L'esportazione risponde con un file binario (`res.download` / `res.send`), quindi NON passa dall'envelope `{ data }`
// del middleware, che tocca solo `res.json`. Il ripristino riceve il file come corpo grezzo.
// ============================================================

import express, { Router } from 'express';
import fs from 'node:fs';
import { MAX_BYTE_RIPRISTINO, copiaDatabase, copiaIstanza, ripristinaIstanza, statoIstanza } from '../services/impostazioniService.js';
import { httpErrors } from '../utils/httpError.js';

const router = Router();

/** Stato dell'istanza: versioni, dimensioni, conteggi. */
router.get('/istanza', (_req, res) => {
  res.json(statoIstanza());
});

/** Scarica il solo database SQLite. */
router.get('/istanza/database', (_req, res, next) => {
  void (async () => {
    try {
      const { percorso, nome } = await copiaDatabase();
      res.setHeader('Content-Type', 'application/vnd.sqlite3');
      res.download(percorso, nome, () => fs.rmSync(percorso, { force: true }));
    } catch (err) {
      next(err);
    }
  })();
});

/** Scarica l'istanza completa: database, immagini caricate, caratteri, manifesto. */
router.get('/istanza/completa.zip', (_req, res, next) => {
  void (async () => {
    try {
      const { contenuto, nome } = await copiaIstanza();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
      res.send(contenuto);
    } catch (err) {
      next(err);
    }
  })();
});

/** Sostituisce l'istanza con il file caricato (database .db o ZIP dell'istanza). */
router.put('/istanza', express.raw({ type: ['application/octet-stream', 'application/zip', 'application/vnd.sqlite3', 'application/x-sqlite3'], limit: MAX_BYTE_RIPRISTINO }), (req, res, next) => {
  void (async () => {
    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw httpErrors.badRequest('file-mancante', 'Invia il file di backup come corpo grezzo (Content-Type application/octet-stream).');
      }
      res.json(await ripristinaIstanza(req.body));
    } catch (err) {
      next(err);
    }
  })();
});

export default router;
