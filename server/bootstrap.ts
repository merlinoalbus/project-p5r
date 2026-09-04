// ============================================================
// Factory dell'app Express + catena middleware
// ============================================================
//
// Ordine:
//   1. requestContext  — requestId + child logger per richiesta
//   2. responseShape   — envelope { data } su ogni res.json
//   3. cors + express.json
//   4. router di area: /api/compendio, /api/traduzioni, /api/partite, /api/immagini, /api/fusione, /api/mappe, /api/font
//   5. /api/health + /api/config
//   6. 404 JSON per /api/* sconosciute
//   7. errorHandler    — SEMPRE ultimo
// ============================================================

import express, { type Express } from 'express';
import cors from 'cors';
import { z } from 'zod';
import { config } from './config.js';
import { requestContextMiddleware } from './middleware/requestContext.js';
import { responseShapeMiddleware } from './middleware/responseShape.js';
import { errorHandler } from './middleware/errorHandler.js';
import { httpErrors } from './utils/httpError.js';
import { getDb } from './db/dbService.js';
import compendioRouter from './routes/compendio.js';
import traduzioniRouter from './routes/traduzioni.js';
import partiteRouter from './routes/partite.js';
import immaginiRouter from './routes/immagini.js';
import fusioneRouter from './routes/fusione.js';
import mappeRouter from './routes/mappe.js';
import fontRouter from './routes/font.js';

// Messaggi di validazione zod in italiano (details.issues[].message).
z.config(z.locales.it());

/** Costruisce l'applicazione HTTP senza aprire una porta di rete. */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  // ---- Middleware globali ----
  app.use(requestContextMiddleware);
  app.use(responseShapeMiddleware);
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

  // ---- Router di area ----
  app.use('/api/compendio', compendioRouter);
  app.use('/api/traduzioni', traduzioniRouter);
  app.use('/api/partite', partiteRouter);
  app.use('/api/immagini', immaginiRouter);
  app.use('/api/fusione', fusioneRouter);
  app.use('/api/mappe', mappeRouter);
  app.use('/api/font', fontRouter);

  // ---- Health ----
  app.get('/api/health', (_req, res) => {
    let dbHealth: Record<string, unknown>;
    try {
      const db = getDb();
      db.prepare('SELECT 1').get();
      const userVersion = db.pragma('user_version', { simple: true }) as number;
      dbHealth = { ok: true, userVersion };
    } catch (err) {
      dbHealth = { ok: false, error: err instanceof Error ? err.message : 'verifica db fallita' };
    }
    res.json({
      status: dbHealth.ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db: dbHealth,
    });
  });

  // ---- Config pubblica per il frontend ----
  app.get('/api/config', (_req, res) => {
    res.json({
      appVersion: config.appVersion,
      gioco: 'Persona 5 Royal',
    });
  });

  // ---- 404 JSON per ogni /api/* non gestita ----
  app.use('/api', (req, _res, next) => {
    next(httpErrors.notFound('not-found', `Endpoint non trovato: ${req.method} ${req.originalUrl}`));
  });

  // ---- Error handler centrale — DEVE essere l'ultimo ----
  app.use(errorHandler);

  return app;
}
