// ============================================================
// Client HTTP FE — timeout + retry
// ============================================================
//
//   - abort per tentativo dopo `timeoutMs` (default 30s);
//   - retry sui fallimenti transitori (5xx, rete, timeout) fino a
//     `maxRetries` con backoff esponenziale (500, 1500, 4500 ms), per
//     default solo per le letture (GET, HEAD, OPTIONS): ogni scrittura (POST, PATCH,
//     PUT, DELETE) ha 0 tentativi in più, salvo `maxRetries` esplicito;
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

/**
 * Solo le letture si ripetono da sole. PUT e DELETE sono idempotenti solo sulla carta: una PUT può aggiungere una riga al
 * registro (acquisti), una DELETE ripetuta dopo una cancellazione riuscita risponde 404 e fa passare per fallita un'azione
 * riuscita, e una PUT ritardata può sovrascrivere un valore più nuovo già salvato. Una scrittura si ripete in automatico solo se
 * il chiamante lo dichiara (`maxRetries` > 0) dopo aver verificato che il servizio corrispondente è davvero idempotente.
 */
function metodoRipetibile(metodo: string | undefined): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes((metodo ?? 'GET').toUpperCase());
}

/** Stati che meritano un nuovo tentativo: solo gli errori del server (5xx). */
function isRetriableStatus(status: number): boolean {
  return status >= 500 && status < 600;
}

/** Errori transitori che meritano un nuovo tentativo: annullamento per timeout e `TypeError` (errore di rete di `fetch`). */
function isRetriableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === 'AbortError' || err.name === 'TimeoutError') return true;
  if (err instanceof TypeError) return true;
  return false;
}

/** I tre modi in cui una richiesta non arriva al server: nessuna rete, rete che cade, risposta che non arriva in tempo. */
export type MotivoErroreRete = 'offline' | 'rete' | 'timeout';

// L'unico punto in cui i guasti di rete diventano testo per l'utente (italiano, nessun dettaglio tecnico).
const MESSAGGI_RETE: Record<MotivoErroreRete, string> = {
  offline: 'Sei offline: controlla la connessione e riprova.',
  rete: 'Non riesco a raggiungere il server: controlla la connessione e riprova.',
  timeout: 'Il server non risponde in tempo: riprova tra poco.',
};

/** Guasto di rete (la richiesta non ha ricevuto risposta): il messaggio è già leggibile, l'errore originale sta in `cause`. */
export class ErroreRete extends Error {
  readonly motivo: MotivoErroreRete;

  constructor(motivo: MotivoErroreRete, causa?: unknown) {
    super(MESSAGGI_RETE[motivo], causa === undefined ? undefined : { cause: causa });
    this.name = 'ErroreRete';
    this.motivo = motivo;
  }
}

/** Mostra un toast d'errore, salvo modalità silenziosa; se lo store delle notifiche non risponde si limita a un avviso in console. */
function notifyError(message: string, silent: boolean, lettura: boolean): void {
  if (silent) return;
  try {
    // ogni errore notificato qui è un guasto di rete; quello di una lettura si toglie quando la connessione torna (la lettura si rifà),
    // quello di una scrittura resta: dice che il gesto non è arrivato, e nessuno lo ripete da solo
    useNotificationStore.getState().addNotification('error', message, undefined, lettura ? { daRete: true } : undefined);
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
  // Un 5xx o un timeout possono arrivare a scrittura già avvenuta (yen aggiunti, acquisto registrato, fusione eseguita), e
  // ripeterla la raddoppierebbe. Le scritture si ritentano solo se il chiamante lo chiede esplicitamente.
  const maxRetries = opts.maxRetries ?? (metodoRipetibile(init.method) ? DEFAULT_MAX_RETRIES : 0);
  const silent = opts.silent ?? false;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    const offline = new ErroreRete('offline');
    notifyError(offline.message, silent, metodoRipetibile(init.method));
    throw offline;
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
        const scaduto = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
        const guasto = new ErroreRete(scaduto ? 'timeout' : 'rete', err);
        console.warn('[httpFetch] richiesta senza risposta', input, err);
        notifyError(guasto.message, silent, metodoRipetibile(init.method));
        throw guasto;
      }
    }
  }
}
