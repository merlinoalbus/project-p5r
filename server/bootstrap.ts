// ============================================================
// bootstrap — factory dell'app Express e catena dei middleware
// ============================================================
//
// Ordine:
//   1. requestContext  — requestId + child logger per richiesta
//   2. responseShape   — envelope { data } su ogni res.json
//   3. express.json (niente CORS: il frontend è sulla stessa origine, proxy Vite / nginx — DECISIONI 2026-10-03)
//   4. router di area (`ROUTER_DI_AREA` in routes/index.ts): /api/compendio, /api/traduzioni, /api/partite, /api/immagini,
//      /api/fusione, /api/mappe, /api/font, /api/impostazioni, /api/catalogo, /api/condizioni
//   5. /api/health + /api/config
//   6. documentazione: /api/openapi.json (OpenAPI 3.1) e /api/docs (Swagger UI)
//   7. 404 JSON per /api/* sconosciute
//   8. errorHandler    — SEMPRE ultimo
// ============================================================

import express, { type Express } from 'express';
import { z } from 'zod';
import { config } from './config.js';
import { getRequestLogger, requestContextMiddleware } from './middleware/requestContext.js';
import { responseShapeMiddleware } from './middleware/responseShape.js';
import { errorHandler } from './middleware/errorHandler.js';
import { httpErrors } from './utils/httpError.js';
import { getDb } from './db/dbService.js';
import { ROUTER_DI_AREA } from './routes/index.js';
import { documentoOpenApi, operazioniSenzaProva } from './openapi/documento.js';
import { CARTELLA_SWAGGER_UI, paginaDocumentazione } from './openapi/pagina.js';

// Messaggi di validazione zod in italiano (details.issues[].message).
z.config(z.locales.it());

/** Costruisce l'applicazione HTTP senza aprire una porta di rete. */
export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');

  // ---- Middleware globali ----
  app.use(requestContextMiddleware);
  app.use(responseShapeMiddleware);
  // Il pacchetto delle mappe include le immagini: deve essere letto prima del limite globale.
  app.post('/api/mappe/importa', express.json({ limit: '64mb' }));
  app.use(express.json({ limit: '5mb' }));

  // ---- Router di area ----
  for (const [prefisso, router] of ROUTER_DI_AREA) app.use(prefisso, router);

  // ---- Health ----
  // 503 quando il database non risponde: l'HEALTHCHECK di Docker guarda solo il codice HTTP.
  // Il motivo resta nel log, non nella risposta (può contenere percorsi e messaggi di SQLite).
  app.get('/api/health', (req, res) => {
    let dbHealth: { ok: true; userVersion: number } | { ok: false; error: string };
    try {
      const db = getDb();
      db.prepare('SELECT 1').get();
      const userVersion = db.pragma('user_version', { simple: true }) as number;
      dbHealth = { ok: true, userVersion };
    } catch (err) {
      getRequestLogger().error({ err, path: req.path }, 'verifica del database fallita');
      dbHealth = { ok: false, error: 'Il database non risponde.' };
    }
    res.status(dbHealth.ok ? 200 : 503).json({
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

  // ---- Documentazione dell'API (OpenAPI 3.1 e Swagger UI) ----
  // Il documento si costruisce alla prima richiesta, quando tutte le rotte sono montate, e poi resta: le rotte non
  // cambiano finché il processo vive. Si manda con `res.send`, fuori dalla busta `{ data }`: è il formato che i
  // client OpenAPI si aspettano.
  let documento: string | null = null;
  app.get('/api/openapi.json', (_req, res) => {
    documento ??= JSON.stringify(documentoOpenApi(app));
    res.type('application/json').send(documento);
  });
  app.get('/api/docs', (_req, res) => {
    res.type('html').send(paginaDocumentazione(operazioniSenzaProva(app)));
  });
  app.use('/api/docs', express.static(CARTELLA_SWAGGER_UI, { index: false, maxAge: '1d' }));

  // ---- 404 JSON per ogni /api/* non gestita ----
  app.use('/api', (req, _res, next) => {
    next(httpErrors.notFound('not-found', `Endpoint non trovato: ${req.method} ${req.originalUrl}`));
  });

  // ---- Error handler centrale — DEVE essere l'ultimo ----
  app.use(errorHandler);

  return app;
}
