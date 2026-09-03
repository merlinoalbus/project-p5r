// ============================================================
// Factory dell'app Express + catena middleware
// ============================================================
//
// Ordine:
//   1. requestContext  — requestId + child logger per richiesta
//   2. responseShape   — envelope { data } su ogni res.json
//   3. cors + express.json
//   4. router /api/*
//   5. /api/health + /api/config
//   6. 404 JSON per /api/* sconosciute
//   7. errorHandler    — SEMPRE ultimo
// ============================================================

import express, { type Express } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { requestContextMiddleware } from './middleware/requestContext.js';
import { responseShapeMiddleware } from './middleware/responseShape.js';
import { errorHandler } from './middleware/errorHandler.js';
import { httpErrors } from './utils/httpError.js';
import { getDb } from './db/dbService.js';

/** Costruisce l'applicazione HTTP senza aprire una porta di rete. */
export function createApp(): Express {
  const app = express();

  // ---- Middleware globali ----
  app.use(requestContextMiddleware);
  app.use(responseShapeMiddleware);
  app.use(cors());
  app.use(express.json({ limit: '5mb' }));

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
