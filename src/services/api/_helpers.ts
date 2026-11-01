// ============================================================
// Helper API tipizzati — unwrap dell'envelope {data} + ApiError
// ============================================================

import { API_BASE_URL } from '../../utils/constants';
import { httpFetch, type HttpFetchOptions } from './_httpClient';
import { epocaCacheGioco, scriviCacheGioco, svuotaCacheGioco } from './cacheGioco';
import { segnalaScritturaCondivisa } from './letturaCondivisa';
import type { AvanzamentoInIntestazioneDto } from '../../types';

/** Errore HTTP normalizzato con status, codice, dettagli e request ID backend. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;
  readonly requestId?: string;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>, requestId?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

/** Verifica il tipo dell'errore e, facoltativamente, il suo codice applicativo. */
export function isApiError(err: unknown, code?: string): err is ApiError {
  if (!(err instanceof ApiError)) return false;
  return code === undefined || err.code === code;
}

/** Messaggio leggibile per uno stato HTTP senza busta d'errore del server (un proxy, un 502): nessuno stato né testo HTTP a
 *  schermo, quelli restano nell'`ApiError` (`status`, `details.dettaglioTecnico`) per il log. */
function messaggioPerStato(status: number): string {
  if (status >= 500) return 'Il server ha un problema in questo momento: riprova tra poco.';
  if (status === 404) return 'Non trovo quello che cerchi sul server.';
  if (status === 413) return 'Il contenuto inviato è troppo grande per il server.';
  return 'Il server non ha accettato la richiesta: riprova.';
}

/** Trasforma una risposta non riuscita in `ApiError`: usa codice, messaggio, dettagli e requestId della busta d'errore del
 *  server se il corpo è JSON con `error.code`, altrimenti un errore generico `http-error` con un messaggio in italiano
 *  (lo stato e il testo HTTP vanno in `details.dettaglioTecnico` e in console). */
async function parseError(res: Response, fallbackPrefix: string): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error?.code) {
      return new ApiError(
        res.status,
        body.error.code,
        body.error.message ?? messaggioPerStato(res.status),
        body.error.details,
        body.requestId,
      );
    }
  } catch {
    /* body non JSON */
  }
  const dettaglioTecnico = `${fallbackPrefix}: ${res.status} ${res.statusText}`;
  console.warn('[api]', dettaglioTecnico);
  return new ApiError(res.status, 'http-error', messaggioPerStato(res.status), { dettaglioTecnico });
}

/** Legge il corpo di una risposta riuscita come JSON. Un 200 che non è JSON (la pagina di accesso di un wifi pubblico, un proxy)
 *  diventa un `ApiError` leggibile invece di «Unexpected token '<'». */
function leggiJson(testo: string, res: Response, descrizione: string): unknown {
  try {
    return JSON.parse(testo);
  } catch {
    console.warn('[api] risposta non JSON', descrizione, testo.slice(0, 120));
    throw new ApiError(res.status, 'risposta-non-valida', 'Risposta inattesa dal server: controlla la connessione e riprova.', {
      dettaglioTecnico: `${descrizione}: corpo non JSON`,
    });
  }
}

/** Intestazione con cui il server dice che la richiesta ha fatto avanzare una partita senza che il corpo lo porti (`responseShape`). */
const INTESTAZIONE_AVANZAMENTO = 'X-Avanzamento-Partita';
let gestoreAvanzamento: ((esiti: AvanzamentoInIntestazioneDto[]) => void) | null = null;

/** Chi riallinea la partita (la rilegge) e avvisa (`seAvanzamentoInIntestazione`): registrato all'avvio, perché questo modulo non importi gli store che usano l'API. */
export function impostaGestoreAvanzamento(fn: (esiti: AvanzamentoInIntestazioneDto[]) => void): void {
  gestoreAvanzamento = fn;
}

/** Applica gli avanzamenti dell'intestazione di una risposta riuscita. Non lancia mai: la richiesta è già riuscita. */
function applicaAvanzamentoDellaRisposta(res: Response): void {
  const grezzo = res.headers.get(INTESTAZIONE_AVANZAMENTO);
  if (!grezzo || !gestoreAvanzamento) return;
  try {
    const esiti: unknown = JSON.parse(decodeURIComponent(grezzo));
    if (Array.isArray(esiti)) gestoreAvanzamento(esiti as AvanzamentoInIntestazioneDto[]);
  } catch (err) {
    console.warn('[api] intestazione di avanzamento illeggibile', err);
  }
}

/** Richiesta JSON verso l'API: serializza il corpo (se c'è) con Content-Type JSON, lancia `ApiError` sugli stati non riusciti,
 *  restituisce `undefined` per un corpo vuoto e altrimenti il contenuto della busta `{ data }`. */
async function requestJson<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: HttpFetchOptions,
): Promise<T> {
  try {
    const res = await httpFetch(
      `${API_BASE_URL}${path}`,
      {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      },
      opts,
    );
    if (!res.ok) throw await parseError(res, `API ${method} ${path}`);
    applicaAvanzamentoDellaRisposta(res);
    const text = await res.text();
    if (!text) return undefined as T;
    return payloadDellaBusta<T>(leggiJson(text, res, `API ${method} ${path}`));
  } finally {
    // qualunque scrittura sui contenuti (anche una finita in errore o in timeout: può essere arrivata a metà) rende vecchie le
    // letture in cache dei dati di gioco; l'avanzamento della partita non vi è mai (vedi `cacheGioco.ts`)
    if (scriveContenuti(method, path)) svuotaCacheGioco();
    // L5-07: qualunque scrittura (anche dentro `/partite`, che qui sopra non svuota niente) rende vecchie le letture condivise fra le istanze
    if (eScrittura(method)) segnalaScritturaCondivisa();
  }
}

/** Ogni metodo che può cambiare qualcosa sul server. */
function eScrittura(method: string): boolean {
  return method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
}

/** Vero se la richiesta può cambiare i dati di gioco: ogni metodo di scrittura fuori da `/partite` (l'avanzamento non è in cache). */
function scriveContenuti(method: string, path: string): boolean {
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return false;
  return !/^\/partite(\/|\?|$)/.test(path);
}

/** Il contenuto della busta `{ data }` che il server mette su ogni risposta riuscita (`responseShape`). Si guarda la presenza
 *  della chiave, non il valore: `{ data: null }` vale `null`, non la busta intera. Un corpo senza `data` NON è un errore: una
 *  rotta che risponde `res.json(undefined)` (le scritture senza esito) esce come `{}` perché `JSON.stringify` toglie la chiave,
 *  e il chiamante si aspetta `void`. */
export function payloadDellaBusta<T>(parsed: unknown): T {
  if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) && 'data' in parsed) return (parsed as { data: T }).data;
  return parsed as T;
}

/** GET → contenuto di `data`. */
export const apiGet = <T>(path: string, opts?: HttpFetchOptions): Promise<T> =>
  requestJson<T>('GET', path, undefined, opts);
/**
 * GET di un dato di GIOCO (non dell'avanzamento): come `apiGet`, ma il risultato riuscito si memorizza per indirizzo in `cacheGioco`,
 * da dove `useCarica` (opzione `cacheUrl`) lo mostra subito al ritorno su una pagina. La rete si interroga sempre: la cache non
 * sostituisce la lettura, la anticipa. Da usare solo per indirizzi senza `partita` (altrimenti non si memorizza).
 */
export async function apiGetGioco<T>(path: string, opts?: HttpFetchOptions): Promise<T> {
  const epocaAvvio = epocaCacheGioco();
  const dati = await requestJson<T>('GET', path, undefined, opts);
  scriviCacheGioco(path, dati, epocaAvvio);
  return dati;
}
/** POST JSON → contenuto di `data`. */
export const apiPost = <T>(path: string, body?: unknown, opts?: HttpFetchOptions): Promise<T> =>
  requestJson<T>('POST', path, body, opts);
/** PUT JSON → contenuto di `data`. */
export const apiPut = <T>(path: string, body?: unknown, opts?: HttpFetchOptions): Promise<T> =>
  requestJson<T>('PUT', path, body, opts);
/** PATCH JSON → contenuto di `data`. */
export const apiPatch = <T>(path: string, body?: unknown, opts?: HttpFetchOptions): Promise<T> =>
  requestJson<T>('PATCH', path, body, opts);
/** DELETE → contenuto di `data`. */
export const apiDelete = <T>(path: string, opts?: HttpFetchOptions): Promise<T> =>
  requestJson<T>('DELETE', path, undefined, opts);
/** DELETE con precondizioni nel corpo: non espone fotografie o token nell’URL. */
export const apiDeleteConCorpo = <T>(path: string, body: unknown, opts?: HttpFetchOptions): Promise<T> =>
  requestJson<T>('DELETE', path, body, opts);

/**
 * Invia un file come corpo grezzo (Content-Type = tipo del file) e restituisce il contenuto di `data`. Lo stato si controlla
 * PRIMA di leggere il corpo: un rifiuto del proxy (413 di nginx oltre i 10 MB, 502) è una pagina HTML, e leggerla come JSON dava
 * «Unexpected token '<'» invece di un errore leggibile. Nessun nuovo tentativo: un caricamento non si ripete da solo.
 */
export async function inviaFile<T>(method: 'PUT' | 'POST', path: string, file: File): Promise<T> {
  try {
    const res = await httpFetch(
      `${API_BASE_URL}${path}`,
      { method, body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } },
      { maxRetries: 0, timeoutMs: 120_000 },
    );
    if (!res.ok) throw await parseError(res, 'Caricamento fallito');
    return payloadDellaBusta<T>(leggiJson(await res.text(), res, `Caricamento ${method} ${path}`));
  } finally {
    // un file caricato cambia i contenuti (immagini, mappe importate): stessa regola delle scritture JSON
    if (scriveContenuti(method, path)) svuotaCacheGioco();
    segnalaScritturaCondivisa();
  }
}

/** Costruisce una query string da un oggetto, saltando i valori vuoti. */
export function queryString(params: object): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v === undefined || v === null || v === '') continue;
    sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
