// ============================================================
// Response shape — envelope `{ data: ... }` su ogni res.json
// ============================================================
//
// Il FE destruttura sempre `body.data` per il payload e `body.error`
// per il fallimento (quest'ultimo lo produce `errorHandler`).
// Gli envelope già formati passano intatti (idempotente); `res.send`
// NON è toccato, quindi export testuali e streaming restano liberi.
// ============================================================

import type { Request, Response, NextFunction } from 'express';

/** Avvolge le risposte JSON riuscite in `{ data: ... }`. */
export function responseShapeMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    if (body && typeof body === 'object' && !Array.isArray(body)) {
      const obj = body as Record<string, unknown>;
      if ('error' in obj || 'data' in obj) {
        return originalJson(body);
      }
    }
    return originalJson({ data: body });
  };

  next();
}
