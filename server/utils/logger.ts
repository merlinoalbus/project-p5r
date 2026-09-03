// ============================================================
// Logger pino — istanza centrale + child logger per richiesta
// ============================================================
//
// - Istanza radice unica configurata da env (LOG_LEVEL).
// - Output leggibile in dev (auto-rilevato quando stdout è un TTY),
//   JSON grezzo altrimenti.
// - `withRequestId(reqId)` restituisce un child già legato al requestId.
// ============================================================

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production' && process.stdout.isTTY;

/** Logger principale del backend. */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'project-p5r-be' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname,service',
          },
        },
      }
    : {}),
});

/** Child logger pre-legato al requestId indicato. */
export function withRequestId(requestId: string): pino.Logger {
  return logger.child({ requestId });
}
