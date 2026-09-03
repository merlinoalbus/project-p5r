// ============================================================
// Error handler Express — errore → risposta canonica
// ============================================================
//
// Montato PER ULTIMO in bootstrap.ts. Intercetta ogni `next(err)` o
// throw negli handler async (Express 5 li propaga da solo). Per gli
// `HttpError` serializza la forma canonica; per qualsiasi altro Error
// logga lo stack completo e risponde 500 con la stessa forma.
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';
import { getRequestLogger, getRequestId } from './requestContext.js';
import { logger as rootLogger } from '../utils/logger.js';

/** Converte gli errori applicativi nell'envelope HTTP comune. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const log = getRequestLogger() ?? rootLogger;
  const requestId = getRequestId();

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      log.error({ err, status: err.status, code: err.code, path: req.path, method: req.method }, 'http error');
    } else {
      log.warn({ status: err.status, code: err.code, path: req.path, method: req.method }, 'http error');
    }
    if (!res.headersSent) {
      res.status(err.status).json(err.toBody(requestId));
    }
    return;
  }

  // Body JSON malformato: express.json lancia un SyntaxError con status 400.
  if (err instanceof SyntaxError && 'status' in err && (err as { status?: number }).status === 400) {
    log.warn({ path: req.path, method: req.method }, 'json malformato');
    if (!res.headersSent) {
      res.status(400).json({
        error: { code: 'json-malformato', message: 'Il corpo della richiesta non è JSON valido.' },
        ...(requestId ? { requestId } : {}),
      });
    }
    return;
  }

  log.error({ err, path: req.path, method: req.method }, 'errore non gestito');
  if (!res.headersSent) {
    res.status(500).json({
      error: {
        code: 'internal-error',
        message: err instanceof Error ? err.message : 'Errore interno del server.',
      },
      ...(requestId ? { requestId } : {}),
    });
  }
}
