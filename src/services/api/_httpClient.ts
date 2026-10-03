// ============================================================
// Client HTTP FE — timeout + retry
// ============================================================
//
//   - abort per tentativo dopo `timeoutMs` (default 30s);
//   - retry sui fallimenti transitori (5xx, rete, timeout) fino a
//     `maxRetries` con backoff esponenziale (500, 1500, 4500 ms), solo per
//     i metodi idempotenti (POST e PATCH: 0 tentativi in più, salvo richiesta);
//   - offline → toast e stop immediato;
//   - i 4xx passano intatti al chiamante.
// ============================================================

import { useNotificationStore } from '../../stores/notificationStore';

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [500, 1500, 4500];

/**
 * Opzioni aggiuntive del client. Il segnale di annullamento esterno (`externalSignal`) non c'è più: nessuno lo passava, e
 * annullare una richiesta non ferma il lavoro già partito sul server (rilievo B11" della verifica completa). `useCarica`
 * scarta le risposte superate.
 */
export interface HttpFetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  /** true: nessun toast automatico (il chiamante gestisce il messaggio). */
  silent?: boolean;
}

/** GET, HEAD, PUT, DELETE e OPTIONS si possono ripetere senza effetti in più (RFC 9110 §9.2.2); POST e PATCH no. */
function metodoIdempotente(metodo: string | undefined): boolean {
  return !['POST', 'PATCH'].includes((metodo ?? 'GET').toUpperCase());
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
  // POST e PATCH non sono idempotenti: un 5xx o un timeout possono arrivare a scrittura già avvenuta (yen aggiunti, fusione
  // eseguita), e ripeterli la raddoppierebbe. Si ritentano solo se il chiamante lo chiede esplicitamente.
  const maxRetries = opts.maxRetries ?? (metodoIdempotente(init.method) ? DEFAULT_MAX_RETRIES : 0);
  const silent = opts.silent ?? false;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    notifyError('Sei offline. Riconnetti la rete e riprova.', silent);
    throw new TypeError('offline: navigator.onLine === false');
  }

  // L'ultimo tentativo esce sempre dal ciclo con la risposta (anche un 5xx, che il chiamante trasforma in errore) o con
  // l'errore: dopo il ciclo non si arriva mai, e la coda che c'era (un toast «tentativi esauriti») non scattava (B11").
  for (let attempt = 0; ; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BACKOFF_MS[attempt - 1] ?? 4500;
      await new Promise((r) => setTimeout(r, delay));
    }

    const ctrl = new AbortController();
    const timeoutHandle = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(input, { ...init, signal: ctrl.signal });
      clearTimeout(timeoutHandle);
      if (res.ok || !isRetriableStatus(res.status) || attempt >= maxRetries) return res;
    } catch (err) {
      clearTimeout(timeoutHandle);
      if (!isRetriableError(err) || attempt >= maxRetries) {
        notifyError(`Errore di rete: ${err instanceof Error ? err.message : String(err)}`, silent);
        throw err;
      }
    }
  }
}
