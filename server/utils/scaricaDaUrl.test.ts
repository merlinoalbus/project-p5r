// ============================================================
// Test scaricaDaUrl — i tempi giusti (intestazioni ≠ inattività) e il tetto applicato mentre arriva
// ============================================================
//
// Il difetto che questi test proteggono: con `AbortSignal.timeout(n)` la scadenza vale anche per la
// lettura del corpo, quindi un file grande su una linea normale moriva sempre a metà. Qui un corpo
// lento ma vivo deve arrivare intero, e un corpo fermo deve interrompersi con un errore parlante.
// ============================================================

import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { scaricaDaUrl, urlValido } from './scaricaDaUrl.js';

const OPZIONI = { maxByte: 1024, cosa: 'il pacchetto', codiceScaricoFallito: 'scarico-fallito', codiceTroppoGrande: 'troppo-grande', accept: '*/*' };

let server: http.Server;
let base = '';
/** Come risponde il server di prova alla prossima richiesta. */
let rispondi: (req: http.IncomingMessage, res: http.ServerResponse) => void;

beforeAll(async () => {
  server = http.createServer((req, res) => rispondi(req, res));
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', () => ok()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(async () => { await new Promise<void>((ok) => server.close(() => ok())); });

it('rifiuta gli indirizzi che non sono http/https', () => {
  expect(() => urlValido('non-un-indirizzo')).toThrowError(expect.objectContaining({ code: 'url-non-valido' }));
  expect(() => urlValido('ftp://esempio.it/x')).toThrowError(expect.objectContaining({ code: 'url-non-valido' }));
  expect(() => urlValido('file:///c:/windows/system32/config/sam')).toThrowError(expect.objectContaining({ code: 'url-non-valido' }));
  expect(urlValido('https://esempio.it/x').host).toBe('esempio.it');
});

it('scarica il contenuto e riporta il tipo dichiarato', async () => {
  rispondi = (_req, res) => { res.writeHead(200, { 'Content-Type': 'application/vnd.sqlite3' }); res.end('contenuto del pacchetto'); };
  const esito = await scaricaDaUrl(`${base}/gioco.db`, OPZIONI);
  expect(esito.contenuto.toString()).toBe('contenuto del pacchetto');
  expect(esito.mime).toBe('application/vnd.sqlite3');
  expect(esito.url.host).toContain('127.0.0.1');
});

it('un corpo LENTO ma vivo arriva intero: la scadenza è sull’inattività, non sul totale', async () => {
  // quattro blocchi a 120 ms: 480 ms complessivi, molto oltre l'attesa delle intestazioni (100 ms)
  rispondi = (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    res.flushHeaders(); // le intestazioni partono subito: da qui conta solo l'inattività
    let n = 0;
    const timer = setInterval(() => {
      if (n === 4) { clearInterval(timer); res.end(); return; }
      res.write('ab'); n++;
    }, 120);
  };
  const esito = await scaricaDaUrl(`${base}/lento`, { ...OPZIONI, attesaRispostaMs: 100, inattivitaMs: 500 });
  expect(esito.contenuto.toString()).toBe('abababab');
});

it('un corpo FERMO viene interrotto con il motivo giusto', async () => {
  rispondi = (_req, res) => { res.writeHead(200); res.flushHeaders(); res.write('inizio'); /* e poi più nulla */ };
  await expect(scaricaDaUrl(`${base}/fermo`, { ...OPZIONI, inattivitaMs: 150 }))
    .rejects.toMatchObject({ code: 'scarico-fallito', message: expect.stringContaining('trasferimento fermo') });
});

it('se le intestazioni non arrivano, lo dice senza aspettare il corpo', async () => {
  rispondi = () => { /* nessuna risposta */ };
  await expect(scaricaDaUrl(`${base}/muto`, { ...OPZIONI, attesaRispostaMs: 120 }))
    .rejects.toMatchObject({ code: 'scarico-fallito', message: expect.stringContaining('nessuna risposta entro') });
});

it('il tetto vale anche quando l’origine non dichiara la dimensione', async () => {
  // chunked: nessun Content-Length, e il corpo supera il tetto solo strada facendo
  rispondi = (_req, res) => {
    res.writeHead(200, { 'Transfer-Encoding': 'chunked' });
    for (let i = 0; i < 40; i++) res.write('x'.repeat(64));
    res.end();
  };
  await expect(scaricaDaUrl(`${base}/enorme`, { ...OPZIONI, maxByte: 512 }))
    .rejects.toMatchObject({ code: 'troppo-grande' });
});

it('il tetto dichiarato viene fermato prima di scaricare', async () => {
  rispondi = (_req, res) => { res.writeHead(200, { 'Content-Length': '4096' }); res.end('x'.repeat(4096)); };
  await expect(scaricaDaUrl(`${base}/dichiarato`, { ...OPZIONI, maxByte: 512 }))
    .rejects.toMatchObject({ code: 'troppo-grande', message: expect.stringContaining('supera il limite') });
});

it('uno stato diverso da 200 e un corpo vuoto sono errori parlanti', async () => {
  rispondi = (_req, res) => { res.writeHead(404); res.end(); };
  await expect(scaricaDaUrl(`${base}/manca`, OPZIONI)).rejects.toMatchObject({ code: 'scarico-fallito', message: expect.stringContaining('404') });
  rispondi = (_req, res) => { res.writeHead(200); res.end(); };
  await expect(scaricaDaUrl(`${base}/vuoto`, OPZIONI)).rejects.toMatchObject({ code: 'scarico-fallito', message: expect.stringContaining('senza contenuto') });
});

it('un host che non risponde non lascia appeso il chiamante', async () => {
  await expect(scaricaDaUrl('http://127.0.0.1:9/x', { ...OPZIONI, attesaRispostaMs: 2000 }))
    .rejects.toMatchObject({ code: 'scarico-fallito' });
});
