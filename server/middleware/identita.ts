// ============================================================
// identita — chi è l'utente che chiama: il token di Cloudflare Access, verificato (L12 · passo 3, progetto delle due istanze §4)
// ============================================================
//
// Nell'istanza pubblica ogni richiesta arriva da Cloudflare Access, che aggiunge l'intestazione `Cf-Access-Jwt-Assertion` con un JWT
// firmato (RS256). Il backend NON si fida dell'intestazione `Cf-Access-Authenticated-User-Email` (si può falsificare se il tunnel
// viene aggirato): verifica la firma del token con le chiavi pubbliche del team (`https://<team>.cloudflareaccess.com/cdn-cgi/access/certs`,
// in cache), l'emittente (`iss`), il destinatario (`aud` = AUD dell'applicazione Access), la scadenza (`exp`) e l'inizio di validità
// (`nbf`). Un token senza email (per esempio quello di un service token) è rifiutato. Il proprietario delle partite è il `sub` del
// token: non cambia se l'utente cambia email.
//
// ATTIVAZIONE
//   - con `CF_ACCESS_TEAM` e `CF_ACCESS_AUD` (variabili dello stack, mai nel repository) il middleware è attivo su tutto `/api`
//     tranne `GET /api/health` (lo chiama l'HEALTHCHECK di Docker, che non ha token);
//   - in modalità `rilascio` sono OBBLIGATORIE: `createApp` lancia e l'avvio si ferma se mancano;
//   - in preparazione, senza le variabili, il middleware non esiste: ogni richiesta ha il proprietario unico e il comportamento è
//     identico a quello di prima.
// Errori: 401 `accesso-non-verificato` (token assente, scaduto, firmato male, di un'altra applicazione, senza email); 503
// `identita-non-disponibile` se le chiavi del team non si riescono a scaricare (non è colpa del token: l'utente può riprovare).
// Il token non finisce mai nei log.
// ============================================================

import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { createRemoteJWKSet, errors as erroriJose, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { HttpError, httpErrors } from '../utils/httpError.js';
import { getRequestLogger, impostaProprietario, PROPRIETARIO_UNICO } from './requestContext.js';

/** I parametri dell'identità: il team di Cloudflare Access, l'AUD dell'applicazione e (per le prove) un fornitore di chiavi alternativo. */
export interface OpzioniIdentita {
  /** `<team>` oppure il nome host completo `<team>.cloudflareaccess.com` (o un dominio proprio del team). */
  team: string;
  /** L'AUD (audience tag) dell'applicazione Access. */
  aud: string;
  /** Le chiavi con cui verificare la firma; senza, si usano quelle remote del team (con cache). */
  chiavi?: JWTVerifyGetKey;
}

/** Il nome host del team: un nome senza punti è il sottodominio di `cloudflareaccess.com`. */
export function hostDelTeam(team: string): string {
  const pulito = team.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return pulito.includes('.') ? pulito : `${pulito}.cloudflareaccess.com`;
}

/** I motivi per cui un token è sbagliato (colpa di chi lo presenta, quindi 401); gli altri errori di `jose` sono del servizio di chiavi. */
const CODICI_TOKEN_NON_VALIDO = new Set([
  'ERR_JWT_EXPIRED', 'ERR_JWT_CLAIM_VALIDATION_FAILED', 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED', 'ERR_JWS_INVALID', 'ERR_JWT_INVALID',
  'ERR_JWKS_NO_MATCHING_KEY', 'ERR_JWKS_MULTIPLE_MATCHING_KEYS', 'ERR_JOSE_ALG_NOT_ALLOWED', 'ERR_JOSE_NOT_SUPPORTED', 'ERR_JWK_INVALID',
]);

const accessoNonVerificato = (motivo: string): HttpError =>
  httpErrors.unauthorized('accesso-non-verificato', `Accesso non verificato: ${motivo}`);

/**
 * Il middleware d'identità. Verifica il token e, se valido, fissa il proprietario della richiesta (`impostaProprietario`); altrimenti
 * risponde 401. Le chiavi remote si scaricano alla prima richiesta e si tengono sei ore (con un intervallo minimo di trenta secondi
 * fra due riscaricamenti, per non martellare Cloudflare con token firmati da chiavi sconosciute).
 */
export function creaMiddlewareIdentita(opzioni: OpzioniIdentita): RequestHandler {
  const host = hostDelTeam(opzioni.team);
  const emittente = `https://${host}`;
  const chiavi = opzioni.chiavi ?? createRemoteJWKSet(new URL(`${emittente}/cdn-cgi/access/certs`), {
    cacheMaxAge: 6 * 60 * 60 * 1000, cooldownDuration: 30 * 1000, timeoutDuration: 5000,
  });

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    // L'HEALTHCHECK di Docker non ha un token: solo questa lettura passa senza identità (e non tocca nessuna partita).
    if (req.method === 'GET' && req.path === '/health') { next(); return; }
    try {
      const token = req.header('cf-access-jwt-assertion');
      if (!token) throw accessoNonVerificato('manca il token di Cloudflare Access.');
      let payload;
      try {
        ({ payload } = await jwtVerify(token, chiavi, {
          issuer: emittente, audience: opzioni.aud, algorithms: ['RS256'], clockTolerance: 5, requiredClaims: ['exp', 'sub'],
        }));
      } catch (err) {
        if (err instanceof erroriJose.JOSEError && CODICI_TOKEN_NON_VALIDO.has(err.code)) {
          // il motivo tecnico (scaduto, firma, emittente…) resta nel log; all'utente basta sapere che deve riaccedere
          getRequestLogger().warn({ codice: err.code }, 'token di Cloudflare Access non valido');
          throw accessoNonVerificato('il token è scaduto o non è valido; accedi di nuovo.');
        }
        // chiavi non scaricabili, timeout, errore di rete: non è il token, e non si può dire se sia valido
        getRequestLogger().error({ err }, 'verifica del token di Cloudflare Access non riuscita');
        throw new HttpError(503, 'identita-non-disponibile', 'Non riesco a verificare l\'accesso in questo momento: riprova fra poco.');
      }
      const email = typeof payload.email === 'string' ? payload.email.trim() : '';
      const sub = typeof payload.sub === 'string' ? payload.sub.trim() : '';
      // Un token senza email è di un service token o di una policy non pensata per le persone: nessuna partita (progetto §4).
      if (!email.includes('@') || email.length > 320) throw accessoNonVerificato('il token non porta un indirizzo email.');
      // Il proprietario unico è riservato alla preparazione: nessun `sub` può spacciarsi per lui.
      if (!sub || sub.length > 200 || sub === PROPRIETARIO_UNICO) throw accessoNonVerificato('il token non identifica un utente.');
      impostaProprietario(sub, email);
      next();
    } catch (err) {
      next(err);
    }
  };
}
