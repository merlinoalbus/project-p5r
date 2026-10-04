// ============================================================
// Validatore zod di confine — validate({ body, params, query })
// ============================================================
//
// Ogni route dichiara i propri schemi zod e li monta come middleware:
// gli handler ricevono dati già validati/coerced e tipizzati.
// I fallimenti diventano HttpError(400, 'validation-error') con le
// `issues` zod nei details.
//
// Gli schemi restano anche attaccati al middleware (`schemiDiValidazione`): la documentazione OpenAPI
// (`server/openapi/`) li legge da lì, così il contratto descritto è lo stesso che si applica.
// ============================================================

import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';
import { httpErrors } from '../utils/httpError.js';

/** Parti della richiesta che una route può chiedere a Zod di verificare. */
export interface ValidateSchemas {
  body?: ZodType;
  params?: ZodType;
  query?: ZodType;
}

/** Gli schemi di ogni middleware creato da `validate`, per chi descrive le rotte senza eseguirle. */
const SCHEMI = new WeakMap<object, ValidateSchemas>();

/** Gli schemi con cui è stato creato un middleware di `validate`, o undefined se la funzione non ne è uno. */
export function schemiDiValidazione(gestore: object): ValidateSchemas | undefined {
  return SCHEMI.get(gestore);
}

/** Middleware che valida e normalizza body, parametri e query prima dell'handler. */
export function validate(schemas: ValidateSchemas) {
  /** Valida params, query e body nell'ordine; la prima parte che non passa diventa un 400 `validation-error`, quelle valide prendono il posto delle originali con i dati normalizzati. */
  const middleware = (req: Request, _res: Response, next: NextFunction): void => {
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part]);
      if (!result.success) {
        throw httpErrors.badRequest(
          'validation-error',
          `Richiesta non valida (${part}).`,
          { issues: result.error.issues },
        );
      }
      if (part === 'body') {
        req.body = result.data;
      } else if (part === 'query') {
        // Express 5: req.query è un getter di prototipo che ri-parsa la query
        // string a ogni accesso — si fa shadowing sull'istanza col risultato
        // zod, fuso sopra la query originale.
        const original = req.query as Record<string, unknown>;
        Object.defineProperty(req, 'query', {
          value: { ...original, ...(result.data as Record<string, unknown>) },
          configurable: true,
          enumerable: true,
          writable: false,
        });
      } else {
        Object.assign(req.params as Record<string, unknown>, result.data);
      }
    }
    next();
  };
  SCHEMI.set(middleware, schemas);
  return middleware;
}
