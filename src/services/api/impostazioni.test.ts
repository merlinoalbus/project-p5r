// @vitest-environment jsdom
// ============================================================
// Test dell'invio di un file — avanzamento, errori, silenzio prolungato
// ============================================================
//
// `inviaFile` è passato da `fetch` a XMLHttpRequest per poter dire a che punto è l'invio, e ha perso il
// timeout complessivo che uccideva gli invii lenti. Qui si verifica che riferisca l'avanzamento, che
// traduca gli errori nello stesso `ApiError` di prima e che interrompa solo dopo un silenzio vero.
// ============================================================

import { anteprimaPacchettoGioco, importaPacchettoGioco } from './impostazioni';

/** XMLHttpRequest finto: espone gli agganci che il modulo installa, per pilotarli dal test. */
class XhrFinto {
  static ultimo: XhrFinto | null = null;
  upload: { onprogress: ((e: { loaded: number; total: number; lengthComputable: boolean }) => void) | null; onload: (() => void) | null } = { onprogress: null, onload: null };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  status = 0;
  responseText = '';
  metodo = '';
  indirizzo = '';
  intestazioni: Record<string, string> = {};
  corpo: unknown = null;
  open(metodo: string, indirizzo: string) { this.metodo = metodo; this.indirizzo = indirizzo; XhrFinto.ultimo = this; }
  setRequestHeader(chiave: string, valore: string) { this.intestazioni[chiave] = valore; }
  send(corpo: unknown) { this.corpo = corpo; }
  abort() { this.onabort?.(); }
  /** Il server risponde. */
  rispondi(status: number, corpo: string) { this.status = status; this.responseText = corpo; this.onload?.(); }
}

const file = () => new File(['pacchetto'], 'gioco.db', { type: 'application/octet-stream' });
const ultimo = () => XhrFinto.ultimo!;

beforeEach(() => {
  XhrFinto.ultimo = null;
  vi.stubGlobal('XMLHttpRequest', XhrFinto);
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

it('manda il file come corpo grezzo e riferisce l’avanzamento, fino alla presa in carico del server', async () => {
  const avanzamenti: Array<{ percentuale: number; inviato: boolean }> = [];
  const promessa = anteprimaPacchettoGioco(file(), (a) => avanzamenti.push({ percentuale: a.percentuale, inviato: a.inviato }));
  const xhr = ultimo();
  expect(xhr.metodo).toBe('POST');
  expect(xhr.indirizzo).toContain('/impostazioni/istanza/gioco/anteprima');
  expect(xhr.intestazioni['Content-Type']).toBe('application/octet-stream');
  expect(xhr.corpo).toBeInstanceOf(File);

  xhr.upload.onprogress?.({ loaded: 25, total: 100, lengthComputable: true });
  xhr.upload.onprogress?.({ loaded: 60, total: 100, lengthComputable: true });
  xhr.upload.onload?.();
  xhr.rispondi(200, JSON.stringify({ data: { versioneSchema: 81, importabile: true } }));

  await expect(promessa).resolves.toMatchObject({ versioneSchema: 81 });
  expect(avanzamenti).toEqual([
    { percentuale: 25, inviato: false },
    { percentuale: 60, inviato: false },
    { percentuale: 100, inviato: true },
  ]);
});

it('un file .zip viaggia con il suo tipo', async () => {
  const promessa = importaPacchettoGioco(new File(['x'], 'istanza.zip'));
  expect(ultimo().intestazioni['Content-Type']).toBe('application/zip');
  ultimo().rispondi(200, JSON.stringify({ data: {} }));
  await promessa;
});

it('l’errore del server conserva codice e messaggio', async () => {
  const promessa = importaPacchettoGioco(file());
  ultimo().rispondi(409, JSON.stringify({ error: { code: 'importazione-in-corso', message: 'Un’importazione è già in corso.' }, requestId: 'r1' }));
  await expect(promessa).rejects.toMatchObject({ status: 409, code: 'importazione-in-corso', message: 'Un’importazione è già in corso.', requestId: 'r1' });
});

it('una risposta riuscita ma illeggibile non passa per buona', async () => {
  const promessa = importaPacchettoGioco(file());
  ultimo().rispondi(200, '<html>il proxy ha risposto al posto dell’app</html>');
  await expect(promessa).rejects.toMatchObject({ code: 'risposta-non-leggibile' });
});

it('la rete caduta lo dice in italiano', async () => {
  const promessa = importaPacchettoGioco(file());
  ultimo().onerror?.();
  await expect(promessa).rejects.toMatchObject({ code: 'rete-non-disponibile' });
});

it('l’invio si interrompe solo dopo un silenzio lungo, e ogni byte rimette il cronometro a zero', async () => {
  vi.useFakeTimers();
  const promessa = importaPacchettoGioco(file());
  const xhr = ultimo();
  // nove minuti di silenzio: ancora vivo
  vi.advanceTimersByTime(9 * 60 * 1000);
  xhr.upload.onprogress?.({ loaded: 1, total: 100, lengthComputable: true });
  // altri nove: il cronometro era ripartito, quindi non è scattato
  vi.advanceTimersByTime(9 * 60 * 1000);
  let conclusa = false;
  void promessa.catch(() => { conclusa = true; });
  await Promise.resolve();
  expect(conclusa).toBe(false);
  // ora il silenzio supera i dieci minuti
  vi.advanceTimersByTime(2 * 60 * 1000);
  await expect(promessa).rejects.toMatchObject({ code: 'invio-interrotto' });
});
