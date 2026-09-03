// ============================================================
// Client HTTP FE — timeout + retry
// ============================================================
//
//   - abort per tentativo dopo `timeoutMs` (default 30s);
//   - retry sui fallimenti transitori (5xx, rete, timeout) fino a
//     `maxRetries` con backoff esponenziale (500, 1500, 4500 ms);
//   - offline → toast e stop immediato;
//   - i 4xx passano intatti al chiamante.
// ============================================================

import { useNotificationStore } from '../../stores/notificationStore';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [500, 1500, 4500];

/** Opzioni aggiuntive del client, compreso il segnale di annullamento. */
export interface HttpFetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  /** true: nessun toast automatico (il chiamante gestisce il messaggio). */
  silent?: boolean;
  externalSignal?: AbortSignal;
}

function isRetriableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

function isRetriableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  if (err instanceof TypeError) return true;
  return false;
}

function notifyError(message: string, silent: boolean): void {
  if (silent) return;
  try {
    useNotificationStore.getState().addNotification('error', message);
  } catch (e) {
    console.warn('[httpFetch] impossibile mostrare il toast', e);
  }
}

/** Esegue `fetch` con timeout e retry e restituisce la `Response` grezza. */
export async function httpFetch(
  input: string,
  init: RequestInit = {},
  opts: HttpFetchOptions = {},
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;
  const silent = opts.silent ?? false;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    notifyError('Sei offline. Riconnetti la rete e riprova.', silent);
    throw new TypeError('offline: navigator.onLine === false');
  }

  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BACKOFF_MS[attempt - 1] ?? 4500;
      await new Promise((r) => setTimeout(r, delay));
    }

    const ctrl = new AbortController();
    const timeoutHandle = setTimeout(() => ctrl.abort(), timeoutMs);
    const onExternalAbort = (): void => ctrl.abort();
    if (opts.externalSignal) {
      if (opts.externalSignal.aborted) ctrl.abort();
      else opts.externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      clearTimeout(timeoutHandle);
      opts.externalSignal?.removeEventListener('abort', onExternalAbort);

      if (res.ok) return res;
      if (!isRetriableStatus(res.status) || attempt >= maxRetries) {
        return res;
      }
      lastError = new Error(`HTTP ${res.status} on ${input}`);
      continue;
    } catch (err) {
      clearTimeout(timeoutHandle);
      opts.externalSignal?.removeEventListener('abort', onExternalAbort);
      if (opts.externalSignal?.aborted) throw err;
      lastError = err;
      if (!isRetriableError(err) || attempt >= maxRetries) {
        notifyError(`Errore di rete: ${err instanceof Error ? err.message : String(err)}`, silent);
        throw err;
      }
    }
  }

  notifyError('Backend non raggiungibile dopo più tentativi. Riprova fra qualche secondo.', silent);
  throw lastError ?? new Error('httpFetch: tentativi esauriti');
}
