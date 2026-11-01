// ============================================================
// Validatore zod di confine — validate({ body, params, query })
// ============================================================
//
// Ogni route dichiara i propri schemi zod e li monta come middleware:
// gli handler ricevono dati già validati/coerced e tipizzati.
// I fallimenti diventano HttpError(400, 'validation-error') con le
// `issues` zod nei details.
//
// Il middleware è tipizzato con l'uscita degli schemi (L11-03): montato prima del gestore nella stessa rotta,
// `req.body`, `req.params` e `req.query` del gestore hanno il tipo dello schema zod (`z.output`), senza cast.
// Una parte che la rotta non valida resta col tipo di Express.
//
// Gli schemi restano anche attaccati al middleware (`schemiDiValidazione`): la documentazione OpenAPI
// (`server/openapi/`) li legge da lì, così il contratto descritto è lo stesso che si applica.
// ============================================================

import type { Request, RequestHandler, Response, NextFunction } from 'express';
import type { ZodType, z } from 'zod';
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

/** Il tipo di una parte della richiesta dopo `validate`: l'uscita dello schema zod, o quello di Express se la parte non si valida. */
type Validato<S, DiExpress> = S extends ZodType ? z.output<S> : DiExpress;

/**
 * Il middleware di `validate` con i tipi delle parti validate: Express li propaga al gestore che segue nella stessa rotta. La risposta
 * resta quella di Express.
 */
export type GestoreValidato<B, P, Q> = RequestHandler<
  Validato<P, Request['params']>, Parameters<Response['json']>[0], Validato<B, Request['body']>, Validato<Q, Request['query']>
>;

/**
 * Il corpo di una rotta il cui schema verifica solo la forma esterna, perché il servizio completa da sé la verifica (gli effetti delle voci
 * con `normalizzaEffettoVoce`, l'albero di un piano con `verificaAlbero`, il pacchetto delle mappe in `importaMappe`…): il gestore riceve il
 * tipo del servizio, `T`, invece dell'uscita più larga dello schema. Lo schema resta lo stesso oggetto (stessa validazione, stessa
 * documentazione OpenAPI): cambia solo il tipo che `validate` passa al gestore. Il tipo dichiarato deve stare dentro ciò che lo schema
 * lascia passare (`T` assegnabile a `z.output` dello schema, controllato dal compilatore): un contratto incompatibile non compila.
 * Le rotte che lo usano si trovano cercando `corpoDelServizio<`.
 */
export function corpoDelServizio<T>() {
  return <S extends ZodType>(
    schema: S & ([T] extends [SenzaParteAperta<z.output<S>>] ? unknown : { contrattoIncompatibile: 'il tipo del servizio non sta dentro l’uscita dello schema' }),
  ): ZodType<T, z.input<S>> => schema as unknown as ZodType<T, z.input<S>>;
}

/**
 * L'uscita di uno schema senza la parte aperta degli oggetti `passthrough`/`loose` (la firma `[chiave: string]: unknown`): lì lo schema non
 * verifica niente, e un'interfaccia del servizio (che non ha firme d'indice) non sarebbe confrontabile. Le chiavi dichiarate restano tutte.
 */
type SenzaParteAperta<T> = T extends readonly (infer U)[] ? SenzaParteAperta<U>[]
  : T extends object ? { [K in keyof T as string extends K ? never : number extends K ? never : K]: SenzaParteAperta<T[K]> }
  : T;

/** Middleware che valida e normalizza body, parametri e query prima dell'handler. */
export function validate<
  B extends ZodType | undefined = undefined,
  P extends ZodType | undefined = undefined,
  Q extends ZodType | undefined = undefined,
>(schemas: { body?: B; params?: P; query?: Q }): GestoreValidato<B, P, Q> {
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
  // il tipo si afferma qui (le parti qui sopra diventano proprio l'uscita degli schemi) e in `corpoDelServizio`: i soli due punti
  // con un cast, fuori dalle rotte
  return middleware as unknown as GestoreValidato<B, P, Q>;
}
