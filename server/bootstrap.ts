// ============================================================
// bootstrap — factory dell'app Express e catena dei middleware
// ============================================================
//
// Ordine:
//   1. requestContext  — requestId + child logger per richiesta
//   2. responseShape   — envelope { data } su ogni res.json
//   2b. identità (L12) — solo con CF_ACCESS_TEAM + CF_ACCESS_AUD: verifica il token di Cloudflare Access (401 se manca o non vale)
//   3. express.json (niente CORS: il frontend è sulla stessa origine, proxy Vite / nginx — DECISIONI 2026-10-03)
//   3b. appartenenza delle partite (L12) — una partita citata nel percorso, nella query o nel corpo deve essere del proprietario (404)
//   4. router di area (`ROUTER_DI_AREA` in routes/index.ts): /api/compendio, /api/traduzioni, /api/partite, /api/immagini,
//      /api/fusione, /api/mappe, /api/font, /api/impostazioni, /api/catalogo, /api/condizioni
//   5. /api/health + /api/config
//   6. documentazione: /api/openapi.json (OpenAPI 3.1) e /api/docs (Swagger UI)
//   7. 404 JSON per /api/* sconosciute
//   8. errorHandler    — SEMPRE ultimo
// ============================================================

import express, { type Express } from 'express';
import { z } from 'zod';
import { config } from './config.js';
import { getRequestLogger, requestContextMiddleware } from './middleware/requestContext.js';
import { responseShapeMiddleware } from './middleware/responseShape.js';
import { errorHandler } from './middleware/errorHandler.js';
import { indiceRicercaDopoScritture } from './middleware/indiceRicerca.js';
import { creaMiddlewareIdentita, type OpzioniIdentita } from './middleware/identita.js';
import { controlloAppartenenzaPartite } from './middleware/appartenenzaPartita.js';
import { httpErrors } from './utils/httpError.js';
import { getDb } from './db/dbService.js';
import { ROUTER_DI_AREA } from './routes/index.js';
import { documentoOpenApi, operazioniSenzaProva } from './openapi/documento.js';
import { CARTELLA_SWAGGER_UI, paginaDocumentazione } from './openapi/pagina.js';
import { capacitaDi, MODALITA_PREDEFINITA, type Modalita } from '../shared/capacita.js';

// Messaggi di validazione zod in italiano (details.issues[].message).
z.config(z.locales.it());

/** Le opzioni di `createApp`. */
export interface OpzioniApp {
  /**
   * La modalità dell'istanza (L12, passo 1): `preparazione` (predefinita, tutte le funzioni di oggi) o `rilascio` (pubblica, sola
   * lettura). Per ora la modalità è soltanto ESPOSTA da `/api/config`, con le sue capacità; l'elenco delle rotte ammesse nel rilascio
   * lo applica il passo 5 (`server/rilascio/rotteGiocatore.ts`). Chi la fissa è il punto d'avvio (`server/index.ts` → preparazione,
   * `server/rilascio.ts` → rilascio), mai una variabile d'ambiente.
   */
  modalita?: Modalita;
  /**
   * L12, passo 3: l'identità di Cloudflare Access. Senza questa opzione si leggono `CF_ACCESS_TEAM` e `CF_ACCESS_AUD` da `config`.
   * Passarla serve alle prove e agli strumenti che costruiscono l'app con chiavi proprie (`chiavi`); `null` forza l'assenza
   * dell'identità (proprietario unico) anche se le variabili ci sono.
   */
  identita?: OpzioniIdentita | null;
}

/**
 * L'identità da usare: quella indicata, oppure quella delle variabili dello stack. Regole (progetto §4):
 *   - le due variabili vanno impostate INSIEME (una sola è un errore di configurazione: l'avvio si ferma, in ogni modalità);
 *   - in `rilascio` sono obbligatorie: senza, ogni utente sarebbe il proprietario unico e vedrebbe le partite degli altri;
 *   - in preparazione, senza variabili, non c'è identità: comportamento di sempre.
 */
export function identitaDellApp(modalita: Modalita, esplicita?: OpzioniIdentita | null): OpzioniIdentita | null {
  const scelta = esplicita !== undefined ? esplicita
    : (config.cfAccessTeam && config.cfAccessAud ? { team: config.cfAccessTeam, aud: config.cfAccessAud } : null);
  if (esplicita === undefined && !!config.cfAccessTeam !== !!config.cfAccessAud) {
    throw new Error('Configurazione dell\'identità incompleta: CF_ACCESS_TEAM e CF_ACCESS_AUD vanno impostate insieme (oppure nessuna delle due, solo in preparazione).');
  }
  if (modalita === 'rilascio' && !scelta) {
    throw new Error('Modalità rilascio senza identità: CF_ACCESS_TEAM e CF_ACCESS_AUD sono obbligatorie (le partite sono di chi le crea; senza Cloudflare Access sarebbero di tutti).');
  }
  return scelta;
}

/** Costruisce l'applicazione HTTP senza aprire una porta di rete. Senza opzioni è l'istanza di preparazione, identica a prima. */
export function createApp(opzioni: OpzioniApp = {}): Express {
  const modalita: Modalita = opzioni.modalita ?? MODALITA_PREDEFINITA;
  // prima di aprire qualsiasi cosa: un'identità mancante o a metà in rilascio ferma l'avvio (lancia da qui)
  const identita = identitaDellApp(modalita, opzioni.identita);
  const app = express();
  app.disable('x-powered-by');

  // ---- Middleware globali ----
  app.use(requestContextMiddleware);
  app.use(responseShapeMiddleware);
  // L12: l'identità PRIMA di leggere qualunque corpo (un anonimo non fa caricare nemmeno i 512 MB dell'importazione): solo con
  // Cloudflare Access configurato. Senza (preparazione) ogni richiesta ha il proprietario unico, come sempre.
  if (identita) app.use('/api', creaMiddlewareIdentita(identita));
  // Il pacchetto delle mappe include le immagini: deve essere letto prima del limite globale. L'esportazione completa pesa 103 MB
  // (O3-1 di L3, decisione del PM del 2026-10-20): 512 MB la coprono con margine; vale per questa sola rotta.
  app.post('/api/mappe/importa', express.json({ limit: '512mb' }));
  app.use(express.json({ limit: '5mb' }));

  // ---- Appartenenza delle partite (L12) ----
  // Una partita citata nel percorso, nella query o nel corpo deve essere del proprietario della richiesta (404 altrimenti). Un
  // controllo solo, prima dei router; rigoroso (anche gli id inesistenti sono 404) quando l'identità è verificata.
  app.use('/api', controlloAppartenenzaPartite(identita !== null));

  // ---- Router di area ----
  // l'indice della ricerca si svuota dopo ogni scrittura riuscita sui dati di gioco (prima dei router: vede ogni risposta)
  app.use('/api', indiceRicercaDopoScritture);
  for (const [prefisso, router] of ROUTER_DI_AREA) app.use(prefisso, router);

  // ---- Health ----
  // 503 quando il database non risponde: l'HEALTHCHECK di Docker guarda solo il codice HTTP.
  // Il motivo resta nel log, non nella risposta (può contenere percorsi e messaggi di SQLite).
  app.get('/api/health', (req, res) => {
    let dbHealth: { ok: true; userVersion: number } | { ok: false; error: string };
    try {
      const db = getDb();
      db.prepare('SELECT 1').get();
      const userVersion = db.pragma('user_version', { simple: true }) as number;
      dbHealth = { ok: true, userVersion };
    } catch (err) {
      getRequestLogger().error({ err, path: req.path }, 'verifica del database fallita');
      dbHealth = { ok: false, error: 'Il database non risponde.' };
    }
    res.status(dbHealth.ok ? 200 : 503).json({
      status: dbHealth.ok ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      db: dbHealth,
    });
  });

  // ---- Config pubblica per il frontend ----
  app.get('/api/config', (_req, res) => {
    res.json({
      appVersion: config.appVersion,
      gioco: 'Persona 5 Royal',
      modalita,
      capacita: capacitaDi(modalita),
    });
  });

  // ---- Documentazione dell'API (OpenAPI 3.1 e Swagger UI) ----
  // Il documento si costruisce alla prima richiesta, quando tutte le rotte sono montate, e poi resta: le rotte non
  // cambiano finché il processo vive. Si manda con `res.send`, fuori dalla busta `{ data }`: è il formato che i
  // client OpenAPI si aspettano.
  let documento: string | null = null;
  app.get('/api/openapi.json', (_req, res) => {
    documento ??= JSON.stringify(documentoOpenApi(app));
    res.type('application/json').send(documento);
  });
  app.get('/api/docs', (_req, res) => {
    res.type('html').send(paginaDocumentazione(operazioniSenzaProva(app)));
  });
  app.use('/api/docs', express.static(CARTELLA_SWAGGER_UI, { index: false, maxAge: '1d' }));

  // ---- 404 JSON per ogni /api/* non gestita ----
  app.use('/api', (req, _res, next) => {
    next(httpErrors.notFound('not-found', `Endpoint non trovato: ${req.method} ${req.originalUrl}`));
  });

  // ---- Error handler centrale — DEVE essere l'ultimo ----
  app.use(errorHandler);

  return app;
}
