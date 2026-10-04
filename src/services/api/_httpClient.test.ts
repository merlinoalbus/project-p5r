// ============================================================
// Test del client HTTP — tentativi solo sui metodi idempotenti (B2") e busta `{ data }` letta per chiave (B7")
// ============================================================

import { httpFetch } from './_httpClient';
import { ApiError, apiGet, apiPost, inviaFile, payloadDellaBusta } from './_helpers';

vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero, { useNotificationStore: { getState: () => ({ addNotification: vi.fn() }) } }));

/** Una nuova risposta HTTP 500 con il corpo d'errore dell'API (`internal-error`); nuova a ogni chiamata, perché il corpo si legge una volta sola. */
const risposta500 = () => new Response(JSON.stringify({ error: { code: 'internal-error', message: 'x' } }), { status: 500 });

describe('httpFetch — tentativi', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('POST e PATCH non si ritentano dopo un 5xx: la scrittura potrebbe essere già avvenuta', async () => {
    for (const method of ['POST', 'PATCH', 'post']) {
      const fetchFinto = vi.fn(async () => risposta500());
      vi.stubGlobal('fetch', fetchFinto);
      const res = await httpFetch('/api/x', { method });
      expect(res.status).toBe(500);
      expect(fetchFinto).toHaveBeenCalledTimes(1);
    }
  });

  it('POST su errore di rete: un solo tentativo, l\'errore arriva al chiamante', async () => {
    const fetchFinto = vi.fn(async () => { throw new TypeError('rete giù'); });
    vi.stubGlobal('fetch', fetchFinto);
    await expect(httpFetch('/api/x', { method: 'POST' }, { silent: true })).rejects.toThrow('rete giù');
    expect(fetchFinto).toHaveBeenCalledTimes(1);
  });

  it('GET, PUT e DELETE si ritentano (tre chiamate col default di 2 tentativi in più)', async () => {
    for (const method of [undefined, 'PUT', 'DELETE']) {
      const fetchFinto = vi.fn(async () => risposta500());
      vi.stubGlobal('fetch', fetchFinto);
      const p = httpFetch('/api/x', method ? { method } : {});
      await vi.runAllTimersAsync();
      expect((await p).status).toBe(500);
      expect(fetchFinto).toHaveBeenCalledTimes(3);
    }
  });

  it('un POST si ritenta se il chiamante lo chiede esplicitamente', async () => {
    const fetchFinto = vi.fn(async () => risposta500());
    vi.stubGlobal('fetch', fetchFinto);
    const p = httpFetch('/api/x', { method: 'POST' }, { maxRetries: 1 });
    await vi.runAllTimersAsync();
    await p;
    expect(fetchFinto).toHaveBeenCalledTimes(2);
  });
});

describe('busta { data }', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('payloadDellaBusta guarda la chiave, non il valore', () => {
    expect(payloadDellaBusta({ data: null })).toBeNull();
    expect(payloadDellaBusta({ data: 0 })).toBe(0);
    expect(payloadDellaBusta({ data: { data: '04-12', tipo: 'classe' } })).toEqual({ data: '04-12', tipo: 'classe' });
    expect(payloadDellaBusta([1, 2])).toEqual([1, 2]);
  });

  it('una risposta { data: null } arriva al chiamante come null, non come la busta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: null }), { status: 200 })));
    await expect(apiGet('/x')).resolves.toBeNull();
  });

  it('un DTO con un campo `data` dentro la busta resta il DTO', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ data: { id: 1, data: '04-12' } }), { status: 200 })));
    await expect(apiPost('/x', {})).resolves.toEqual({ id: 1, data: '04-12' });
  });
});

describe('B8": inviaFile', () => {
  afterEach(() => vi.unstubAllGlobals());
  const file = new File(['x'], 'mappa.png', { type: 'image/png' });

  it('un rifiuto del proxy in HTML (413 di nginx) diventa un ApiError leggibile, non «Unexpected token <»', async () => {
    const fetchFinto = vi.fn(async () => new Response('<html><body>413 Request Entity Too Large</body></html>', { status: 413, statusText: 'Request Entity Too Large', headers: { 'Content-Type': 'text/html' } }));
    vi.stubGlobal('fetch', fetchFinto);
    const errore = await inviaFile('PUT', '/mappe/x/immagine', file).catch((e: unknown) => e);
    expect(errore).toBeInstanceOf(ApiError);
    expect(errore).toMatchObject({ status: 413, code: 'http-error' });
    expect((errore as Error).message).toMatch(/413/);
    expect(fetchFinto).toHaveBeenCalledTimes(1);
  });

  it('un errore JSON del server tiene il suo codice; una risposta riuscita restituisce `data`', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { code: 'immagine-troppo-grande', message: 'Troppo grande.' } }), { status: 400 })));
    await expect(inviaFile('POST', '/mappe/spilli/1/immagini', file)).rejects.toMatchObject({ code: 'immagine-troppo-grande', message: 'Troppo grande.' });
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init?: RequestInit) => new Response(JSON.stringify({ data: { metodo: init?.method, tipo: (init?.headers as Record<string, string>)['Content-Type'] } }), { status: 200 })));
    await expect(inviaFile('PUT', '/font/display', file)).resolves.toEqual({ metodo: 'PUT', tipo: 'image/png' });
  });
});

describe('F7 (validazione voce 2): le PUT relative non si ripetono', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('spostamenti e punti dei Confidenti: un solo tentativo dopo un 5xx; una PUT assoluta si ritenta', async () => {
    const { spostaVoceGiornata, spostaPunto, aggiornaPunto } = await import('./compendio');
    const { aggiornaConfidente } = await import('./partite');
    for (const chiamata of [() => spostaVoceGiornata('u1', 1), () => spostaPunto('p1', -1), () => aggiornaConfidente(1, 'sojiro', { noteRisposta: 3 })]) {
      const fetchFinto = vi.fn(async () => risposta500());
      vi.stubGlobal('fetch', fetchFinto);
      const p = chiamata().catch((e: unknown) => e);
      await vi.runAllTimersAsync();
      expect(await p).toBeInstanceOf(ApiError);
      expect(fetchFinto).toHaveBeenCalledTimes(1);
    }
    // controllo: una PUT assoluta (il testo di un punto) resta ripetibile
    const fetchFinto = vi.fn(async () => risposta500());
    vi.stubGlobal('fetch', fetchFinto);
    const p = aggiornaPunto('p1', { descrizione: 'x' }).catch(() => null);
    await vi.runAllTimersAsync();
    await p;
    expect(fetchFinto).toHaveBeenCalledTimes(3);
  });
});
