// ============================================================
// Request context — requestId + logger per richiesta
// ============================================================
//
// Ogni richiesta riceve un `requestId` (UUID v4) restituito anche
// nell'header `X-Request-Id`. AsyncLocalStorage trasporta id e child
// logger lungo tutta la catena asincrona senza passarli a mano.
// ============================================================

import { AsyncLocalStorage } from 'node:async_hooks';
import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { logger as rootLogger, withRequestId } from '../utils/logger.js';

/** Dati che seguono una singola richiesta lungo la catena asincrona. */
export interface RequestContext {
  requestId: string;
  logger: Logger;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Child logger della richiesta corrente, o logger radice fuori richiesta. */
export function getRequestLogger(): Logger {
  return storage.getStore()?.logger ?? rootLogger;
}

/** requestId corrente, o undefined fuori da una richiesta. */
export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

/**
 * Associa alla richiesta un identificativo e un logger figlio, poi registra
 * metodo, percorso, esito e durata quando la risposta termina.
 */
export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.headers['x-request-id'];
  const requestId = (typeof inbound === 'string' && inbound.length > 0 && inbound.length <= 128)
    ? inbound
    : randomUUID();
  res.setHeader('X-Request-Id', requestId);

  const ctx: RequestContext = {
    requestId,
    logger: withRequestId(requestId),
  };

  // Access log: una riga per risposta (warn per i 5xx). I preflight OPTIONS
  // non portano segnale e restano fuori.
  if (req.method !== 'OPTIONS') {
    const startedAt = process.hrtime.bigint();
    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      const line = {
        method: req.method,
        path: req.originalUrl.split('?')[0],
        status: res.statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        contentLength: res.getHeader('content-length') ?? undefined,
      };
      if (res.statusCode >= 500) ctx.logger.warn(line, 'richiesta fallita');
      else ctx.logger.info(line, 'richiesta completata');
    });
  }

  storage.run(ctx, () => next());
}
