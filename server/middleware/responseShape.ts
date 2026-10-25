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
import { prelevaAvanzamentoValido } from '../services/avanzamentoGiornataService.js';

/** Chiave in `res.locals` che dice «il corpo è già la risposta finale». */
const FORMATA = Symbol('rispostaFormata');

/** Marca la risposta: il prossimo `res.json` scrive il corpo senza busta (lo usa l'errorHandler). */
export function segnaRispostaFormata(res: Response): void {
  (res.locals as Record<symbol, unknown>)[FORMATA] = true;
}

/**
 * Decisione A1 (2026-10-25): se la richiesta su `/api/partite/:id/…` ha fatto avanzare la partita (alla sera, al giorno dopo) chiudendo da sola
 * una decisione aperta (la rotta non ne sa niente), il corpo della risposta porta `fasciaAvanzata` / `giornoAvanzato` come dopo una spunta, e il
 * client si allinea. Un corpo che li ha già, o che non è un oggetto (elenchi, valori), resta com'è.
 */
function conAvanzamento(req: Request, body: unknown): unknown {
  const m = /^\/api\/partite\/(\d+)(?:[/?]|$)/.exec(req.originalUrl);
  if (!m) return body;
  const esito = prelevaAvanzamentoValido(Number(m[1]));
  if (!esito || !body || typeof body !== 'object' || Array.isArray(body)) return body;
  const b = body as Record<string, unknown>;
  if (b.giornoAvanzato !== undefined || b.fasciaAvanzata !== undefined) return body;
  return { ...b, ...esito };
}

/** Avvolge le risposte JSON riuscite in `{ data: ... }`. */
export function responseShapeMiddleware(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown): Response {
    if ((res.locals as Record<symbol, unknown>)[FORMATA] === true) return originalJson(body);
    return originalJson({ data: conAvanzamento(req, body) });
  };

  next();
}
