// ============================================================
// HttpError — classe errore tipizzata + forma della risposta
// ============================================================
//
// Risposta di errore canonica:
//   {
//     "error": { "code": "<kebab-case>", "message": "<frase>", "details"?: {...} },
//     "requestId": "<uuid>"   // iniettato dall'errorHandler
//   }
//
// Gli handler lanciano `httpErrors.notFound('persona-non-trovata', ...)`;
// il middleware centrale imposta lo status e serializza. Tutto ciò che
// non è HttpError diventa 500 `internal-error` con stack nel log.
// ============================================================

/** Forma JSON stabile restituita dal backend quando una richiesta fallisce. */
export interface HttpErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  requestId?: string;
}

/** Errore applicativo con status HTTP, codice macchina e dettagli opzionali. */
export class HttpError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }

  toBody(requestId?: string): HttpErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
      ...(requestId ? { requestId } : {}),
    };
  }
}

/** Costruttori brevi per gli errori HTTP usati più spesso nelle route. */
export const httpErrors = {
  badRequest: (code: string, message: string, details?: Record<string, unknown>) =>
    new HttpError(400, code, message, details),
  notFound: (code: string, message: string, details?: Record<string, unknown>) =>
    new HttpError(404, code, message, details),
  conflict: (code: string, message: string, details?: Record<string, unknown>) =>
    new HttpError(409, code, message, details),
  internal: (message = 'Errore interno del server.', details?: Record<string, unknown>) =>
    new HttpError(500, 'internal-error', message, details),
};
