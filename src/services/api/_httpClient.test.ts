// ============================================================
// Test del client HTTP — tentativi solo sui metodi idempotenti (B2") e busta `{ data }` letta per chiave (B7")
// ============================================================

import { httpFetch } from './_httpClient';
import { apiGet, apiPost, payloadDellaBusta } from './_helpers';

vi.mock('../../stores/notificationStore', () => ({ useNotificationStore: { getState: () => ({ addNotification: vi.fn() }) } }));

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
