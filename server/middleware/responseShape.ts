// ============================================================
// Response shape — envelope `{ data: ... }` su ogni res.json
// ============================================================
//
// Il FE destruttura sempre `body.data` per il payload e `body.error`
// per il fallimento (quest'ultimo lo produce `errorHandler`).
// Ogni `res.json` riuscito viene avvolto, qualunque forma abbia il corpo:
// un DTO con un campo `data` o `error` (es. `DomandaDto.data`) resta un
// payload e non viene scambiato per una busta. Solo l'errorHandler, che
// marca la risposta con `segnaRispostaFormata`, scrive il corpo così com'è.
// `res.send` NON è toccato: export testuali e streaming restano liberi.
// ============================================================

import type { Request, Response, NextFunction } from 'express';

/** Chiave in `res.locals` che dice «il corpo è già la risposta finale». */
const FORMATA = Symbol('rispostaFormata');

/** Marca la risposta: il prossimo `res.json` scrive il corpo senza busta (lo usa l'errorHandler). */
export function segnaRispostaFormata(res: Response): void {
  (res.locals as Record<symbol, unknown>)[FORMATA] = true;
}

/** Avvolge le risposte JSON riuscite in `{ data: ... }`. */
export function responseShapeMiddleware(_req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    if ((res.locals as Record<symbol, unknown>)[FORMATA] === true) return originalJson(body);
    return originalJson({ data: body });
  };

  next();
}
