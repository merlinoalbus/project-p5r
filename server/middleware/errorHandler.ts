// ============================================================
// Error handler Express — errore → risposta canonica
// ============================================================
//
// Montato PER ULTIMO in bootstrap.ts. Intercetta ogni `next(err)` o
// throw negli handler async (Express 5 li propaga da solo). Per gli
// `HttpError` serializza la forma canonica; gli errori 4xx di Express/
// body-parser (JSON malformato, corpo oltre il limite, percorso non
// decodificabile) diventano envelope canonici in italiano; qualsiasi
// altro Error è loggato con lo stack e risponde 500 con la stessa forma e
// un messaggio fisso (il dettaglio resta nel log, col requestId).
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError.js';
import { getRequestLogger, getRequestId } from './requestContext.js';
import { segnaRispostaFormata } from './responseShape.js';

interface RispostaErrore {
  status: number;
  code: string;
  message: string;
}

/** Riconosce gli errori 4xx generati da Express/body-parser e li traduce. */
function mappaErroreExpress(err: unknown): RispostaErrore | null {
  if (!(err instanceof Error)) return null;
  const e = err as Error & { status?: number; statusCode?: number; type?: string; limit?: number };
  const status = e.status ?? e.statusCode;
  if (typeof status !== 'number' || status < 400 || status >= 500) return null;
  if (e.type === 'entity.too.large' || status === 413) {
    const limite = typeof e.limit === 'number' ? ` (massimo ${Math.round(e.limit / 1024 / 1024)} MB)` : '';
    return { status: 413, code: 'corpo-troppo-grande', message: `Il contenuto inviato supera la dimensione massima consentita${limite}.` };
  }
  if (e.type === 'entity.parse.failed' || (err instanceof SyntaxError && status === 400)) {
    return { status: 400, code: 'json-malformato', message: 'Il corpo della richiesta non è JSON valido.' };
  }
  if (err instanceof URIError) {
    return { status: 400, code: 'percorso-non-valido', message: 'Il percorso della richiesta contiene una codifica non valida.' };
  }
  if (e.type === 'charset.unsupported' || e.type === 'encoding.unsupported') {
    return { status: 415, code: 'codifica-non-supportata', message: 'La codifica del contenuto inviato non è supportata.' };
  }
  if (e.type === 'request.aborted') {
    return { status: 400, code: 'richiesta-interrotta', message: 'La richiesta è stata interrotta prima del completamento.' };
  }
  // Errori di `res.sendFile`/`res.download` (modulo `send`): file sparito, percorso vietato, intervallo di byte impossibile.
  if (status === 404) return { status, code: 'not-found', message: 'La risorsa richiesta non esiste.' };
  if (status === 403) return { status, code: 'accesso-negato', message: 'La risorsa richiesta non è accessibile.' };
  if (status === 416) return { status, code: 'intervallo-non-valido', message: "L'intervallo di byte richiesto non è disponibile." };
  return { status, code: 'richiesta-non-valida', message: 'La richiesta non è valida.' };
}

/** Scrive il corpo dell'errore così com'è (senza la busta `{ data }` di `responseShape`). Una rotta che stava per mandare un file
 *  può aver già impostato tipo e allegato (`application/vnd.sqlite3`, `attachment`): `res.json` non sovrascrive un Content-Type
 *  esistente, quindi si rimettono le intestazioni di una risposta JSON. */
function inviaErrore(res: Response, status: number, corpo: unknown): void {
  if (res.headersSent) return;
  segnaRispostaFormata(res);
  res.removeHeader('Content-Disposition');
  res.type('application/json');
  res.status(status).json(corpo);
}

/** Converte gli errori applicativi nell'envelope HTTP comune. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const log = getRequestLogger();
  const requestId = getRequestId();

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      log.error({ err, status: err.status, code: err.code, path: req.path, method: req.method }, 'http error');
    } else {
      log.warn({ status: err.status, code: err.code, path: req.path, method: req.method }, 'http error');
    }
    inviaErrore(res, err.status, err.toBody(requestId));
    return;
  }

  // Errori di Express/body-parser (portano `status`/`statusCode` 4xx): JSON malformato,
  // corpo oltre il limite, percorso non decodificabile… → envelope canonico in italiano.
  const rispostaExpress = mappaErroreExpress(err);
  if (rispostaExpress) {
    const causa = err as Error & { type?: string };
    log.warn({ path: req.path, method: req.method, status: rispostaExpress.status, code: rispostaExpress.code, tipo: causa.type, causa: causa.message }, 'richiesta rifiutata');
    inviaErrore(res, rispostaExpress.status, {
      error: { code: rispostaExpress.code, message: rispostaExpress.message },
      ...(requestId ? { requestId } : {}),
    });
    return;
  }

  // Il messaggio vero (SQLite, percorsi assoluti…) resta nel log, ritrovabile col requestId.
  log.error({ err, path: req.path, method: req.method }, 'errore non gestito');
  inviaErrore(res, 500, {
    error: { code: 'internal-error', message: 'Errore interno del server.' },
    ...(requestId ? { requestId } : {}),
  });
}
