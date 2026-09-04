// ============================================================
// Helper API tipizzati — unwrap dell'envelope {data} + ApiError
// ============================================================

import { API_BASE_URL } from '../../utils/constants';
import { httpFetch, type HttpFetchOptions } from './_httpClient';

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

async function parseError(res: Response, fallbackPrefix: string): Promise<ApiError> {
  try {
    const body = await res.json();
    if (body?.error?.code) {
      return new ApiError(
        res.status,
        body.error.code,
        body.error.message ?? `${fallbackPrefix}: ${res.status}`,
        body.error.details,
        body.requestId,
      );
    }
  } catch {
    /* body non JSON */
  }
  return new ApiError(res.status, 'http-error', `${fallbackPrefix}: ${res.status} ${res.statusText}`);
}

async function requestJson<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: HttpFetchOptions,
): Promise<T> {
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
  const text = await res.text();
  if (!text) return undefined as T;
  const parsed = JSON.parse(text);
  return (parsed?.data ?? parsed) as T;
}

/** GET → contenuto di `data`. */
export const apiGet = <T>(path: string, opts?: HttpFetchOptions): Promise<T> =>
  requestJson<T>('GET', path, undefined, opts);
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
