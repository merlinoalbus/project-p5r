// @vitest-environment jsdom
// ============================================================
// Test useCodaProgresso — la coda dei «+» rapidi resta nella sua partita (rilievo A1 della verifica completa, 2026-10-03)
// ============================================================

import { act, renderHook } from '@testing-library/react';
import { useCodaProgresso, type OpzioniCodaProgresso } from './useCodaProgresso';

interface Gioco { chiave: string; progresso: number }

/** Prepara le opzioni della coda con funzioni finte: `invia` resta in sospeso e accoda la propria risoluzione in
 *  `risposte` (il test risponde quando vuole), `applica` e `segnalaErrore` registrano le chiamate. */
function prepara() {
  const risposte: Array<(g: Gioco) => void> = [];
  const invia = vi.fn((_partita: number, chiave: string, progresso: number) => new Promise<Gioco>((ok) => { risposte.push(ok); void chiave; void progresso; }));
  const applica = vi.fn();
  const segnalaErrore = vi.fn();
  const opz: OpzioniCodaProgresso<Gioco> = { invia, applica, segnalaErrore, messaggioErrore: 'fallito' };
  return { risposte, invia, applica, segnalaErrore, opz };
}

describe('useCodaProgresso', () => {
  it('le pressioni rapide si accodano: una richiesta per volta, che insegue l\'ultimo valore chiesto', async () => {
    const { risposte, invia, applica, opz } = prepara();
    const { result } = renderHook(({ p }) => useCodaProgresso<Gioco>(p, opz), { initialProps: { p: 1 as number | null } });
    const g = { chiave: 'tetris', progresso: 0 };
    act(() => { result.current.accoda(g, 1); });
    act(() => { result.current.accoda(g, 2); });
    act(() => { result.current.accoda(g, 3); });
    expect(result.current.valore(g)).toBe(3);
    expect(result.current.occupato(g)).toBe(true);
    expect(invia).toHaveBeenCalledTimes(1);
    await act(async () => { risposte[0]({ chiave: 'tetris', progresso: 1 }); });
    expect(invia).toHaveBeenLastCalledWith(1, 'tetris', 3);
    await act(async () => { risposte[1]({ chiave: 'tetris', progresso: 3 }); });
    expect(invia).toHaveBeenCalledTimes(2);
    expect(applica).toHaveBeenCalledTimes(2);
    expect(result.current.occupato(g)).toBe(false);
  });

  it('A1: cambiata la partita a metà coda, nella nuova non si scrive niente e i valori di una non si vedono nell\'altra', async () => {
    const { risposte, invia, applica, opz } = prepara();
    const { result, rerender } = renderHook(({ p }) => useCodaProgresso<Gioco>(p, opz), { initialProps: { p: 1 as number | null } });
    const g = { chiave: 'tetris', progresso: 0 };
    act(() => { result.current.accoda(g, 1); });
    act(() => { result.current.accoda(g, 2); }); // in coda dietro la prima
    rerender({ p: 2 }); // l'utente passa alla partita 2
    // nella partita 2 il gioco mostra il suo valore, non quello chiesto nella 1
    expect(result.current.valore(g)).toBe(0);
    await act(async () => { risposte[0]({ chiave: 'tetris', progresso: 1 }); });
    // la coda della partita 1 si ferma: nessuna seconda richiesta, e niente applicato alla pagina che ora mostra la partita 2
    expect(invia).toHaveBeenCalledTimes(1);
    expect(invia).toHaveBeenCalledWith(1, 'tetris', 1);
    expect(invia.mock.calls.some((c) => c[0] === 2)).toBe(false);
    expect(applica).not.toHaveBeenCalled();
  });

  it('se una richiesta fallisce il valore torna all\'ultimo confermato e l\'errore si segnala (solo nella partita giusta)', async () => {
    const opz: OpzioniCodaProgresso<Gioco> = { invia: vi.fn(() => Promise.reject(new Error('rete giù'))), applica: vi.fn(), segnalaErrore: vi.fn(), messaggioErrore: 'fallito' };
    const { result } = renderHook(() => useCodaProgresso<Gioco>(1, opz));
    const g = { chiave: 'tetris', progresso: 4 };
    await act(async () => { result.current.accoda(g, 5); });
    expect(result.current.valore(g)).toBe(4);
    expect(opz.segnalaErrore).toHaveBeenCalledWith('rete giù');
  });

  it('N2: ferma la coda, il numero torna a seguire l\'elemento (ritorno alla partita, dati riletti)', async () => {
    const { risposte, opz } = prepara();
    const { result, rerender } = renderHook(({ p }) => useCodaProgresso<Gioco>(p, opz), { initialProps: { p: 1 as number | null } });
    const g = { chiave: 'tetris', progresso: 0 };
    act(() => { result.current.accoda(g, 1); });
    act(() => { result.current.accoda(g, 2); });
    rerender({ p: 2 });
    await act(async () => { risposte[0]({ chiave: 'tetris', progresso: 1 }); });
    rerender({ p: 1 }); // di nuovo nella partita 1: il «2» chiesto non è mai stato salvato
    expect(result.current.valore({ chiave: 'tetris', progresso: 1 })).toBe(1);
    // a coda finita, un elemento riletto con un altro valore (corretto da un'altra pagina) si vede com'è
    act(() => { result.current.accoda({ chiave: 'tetris', progresso: 1 }, 3); });
    await act(async () => { risposte[1]({ chiave: 'tetris', progresso: 3 }); });
    expect(result.current.valore({ chiave: 'tetris', progresso: 0 })).toBe(0);
  });

  it('senza partita non si scrive niente', () => {
    const { invia, opz } = prepara();
    const { result } = renderHook(() => useCodaProgresso<Gioco>(null, opz));
    act(() => { result.current.accoda({ chiave: 'tetris', progresso: 0 }, 1); });
    expect(invia).not.toHaveBeenCalled();
  });
});
