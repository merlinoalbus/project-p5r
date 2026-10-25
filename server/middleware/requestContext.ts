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

/**
 * Il proprietario delle partite quando l'identità non è verificata (L12, passo 3): tutte le partite esistenti prima della migrazione
 * utente 045 hanno questo valore, e in preparazione (senza Cloudflare Access) ogni richiesta lo porta. Stesso valore del DEFAULT
 * della colonna `partita.proprietario`.
 */
export const PROPRIETARIO_UNICO = 'proprietario-unico';

/** Dati che seguono una singola richiesta lungo la catena asincrona. */
export interface RequestContext {
  requestId: string;
  logger: Logger;
  /** Chi possiede le partite viste da questa richiesta: `sub` del token di Cloudflare Access, oppure `PROPRIETARIO_UNICO`. */
  proprietario: string;
  /** L'email del token (solo per le partite create da un utente riconosciuto); `null` con il proprietario unico. */
  proprietarioEmail: string | null;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Il proprietario della richiesta corrente. Fuori da una richiesta (avvio, migrazioni, test dei servizi) è `PROPRIETARIO_UNICO`:
 * i servizi delle partite funzionano identici a prima.
 */
export function getProprietario(): string {
  return storage.getStore()?.proprietario ?? PROPRIETARIO_UNICO;
}

/** L'email associata al proprietario della richiesta corrente, se l'identità è stata verificata. */
export function getProprietarioEmail(): string | null {
  return storage.getStore()?.proprietarioEmail ?? null;
}

/** Il middleware d'identità fissa il proprietario della richiesta in corso (una volta, prima di ogni rotta). */
export function impostaProprietario(proprietario: string, email: string | null): void {
  const ctx = storage.getStore();
  if (!ctx) return;
  ctx.proprietario = proprietario;
  ctx.proprietarioEmail = email;
}

/**
 * Esegue `fn` come se la richiesta fosse di `proprietario` (test di appartenenza e strumenti di sola lettura fuori richiesta). Il
 * contesto ereditato (requestId, logger) si conserva; senza contesto se ne crea uno minimo.
 */
export function comeProprietario<T>(proprietario: string, email: string | null, fn: () => T): T {
  const attuale = storage.getStore();
  const ctx: RequestContext = attuale
    ? { ...attuale, proprietario, proprietarioEmail: email }
    : { requestId: 'fuori-richiesta', logger: rootLogger, proprietario, proprietarioEmail: email };
  return storage.run(ctx, fn);
}

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
    proprietario: PROPRIETARIO_UNICO,
    proprietarioEmail: null,
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
