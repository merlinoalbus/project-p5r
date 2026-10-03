// @vitest-environment jsdom
// ============================================================
// Test useCarica — caricamento, errore, ricarica, cambio dipendenze
// ============================================================

import { act, render, screen } from '@testing-library/react';
import { useCarica } from './useCarica';

function Prova({ id, carica }: { id: number; carica: (id: number) => Promise<string> }) {
  const { dati, caricamento, errore, ricarica } = useCarica(() => carica(id), [id]);
  return (
    <div>
      <span data-testid="stato">{caricamento ? 'caricamento' : errore ? `errore: ${errore}` : `dati: ${dati}`}</span>
      <button type="button" onClick={() => void ricarica()}>ricarica</button>
    </div>
  );
}

/** Espone lo stato del hook al test a ogni render (per i casi che lo pilotano direttamente). */
function Sonda<T>({ carica, suStato }: { carica: () => Promise<T>; suStato: (s: ReturnType<typeof useCarica<T>>) => void }) {
  suStato(useCarica(carica, []));
  return null;
}

describe('useCarica', () => {
  it('carica i dati, poi ricarica e reagisce al cambio delle dipendenze', async () => {
    let chiamate = 0;
    const carica = async (id: number) => {
      chiamate++;
      return `valore-${id}-${chiamate}`;
    };
    const { rerender } = render(<Prova id={1} carica={carica} />);
    expect(screen.getByTestId('stato')).toHaveTextContent('caricamento');
    expect(await screen.findByText('dati: valore-1-1')).toBeInTheDocument();

    await act(async () => {
      screen.getByText('ricarica').click();
    });
    expect(await screen.findByText('dati: valore-1-2')).toBeInTheDocument();

    rerender(<Prova id={2} carica={carica} />);
    expect(await screen.findByText('dati: valore-2-3')).toBeInTheDocument();
  });

  it('espone il messaggio di errore', async () => {
    render(<Prova id={1} carica={async () => { throw new Error('rete assente'); }} />);
    expect(await screen.findByText('errore: rete assente')).toBeInTheDocument();
  });

  // ---- verifica completa 2026-10-03 ----

  it('B6": ricarica() si risolve quando la rilettura è arrivata (anche se fallisce), non prima', async () => {
    const rilettura: { risolvi: ((v: string) => void) | null; rifiuta: ((e: Error) => void) | null } = { risolvi: null, rifiuta: null };
    let n = 0;
    const carica = () => (++n === 1 ? Promise.resolve('primo') : new Promise<string>((ok, ko) => { rilettura.risolvi = ok; rilettura.rifiuta = ko; }));
    let stato: ReturnType<typeof useCarica<string>> | null = null;
    render(<Sonda carica={carica} suStato={(s) => { stato = s; }} />);
    await act(async () => {});
    let finita = false;
    let p!: Promise<void>;
    act(() => { p = stato!.ricarica().then(() => { finita = true; }); });
    await act(async () => {});
    expect(finita).toBe(false); // la rilettura non è ancora arrivata
    await act(async () => { rilettura.risolvi!('secondo'); await p; });
    expect(finita).toBe(true);
    expect(stato!.dati).toBe('secondo');
    // una rilettura fallita risolve lo stesso: chi aspetta non resta appeso
    let seconda = false;
    act(() => { p = stato!.ricarica().then(() => { seconda = true; }); });
    await act(async () => { rilettura.rifiuta!(new Error('giù')); await p; });
    expect(seconda).toBe(true);
  });

  it('B6": una ricarica() chiesta a componente smontato si risolve subito', async () => {
    let stato: ReturnType<typeof useCarica<string>> | null = null;
    const { unmount } = render(<Sonda carica={() => Promise.resolve('x')} suStato={(s) => { stato = s; }} />);
    await act(async () => {});
    unmount();
    await expect(stato!.ricarica()).resolves.toBeUndefined();
  });

  it('B3": imposta con una funzione parte dai dati correnti: due aggiornamenti ravvicinati si sommano', async () => {
    let stato: ReturnType<typeof useCarica<{ a: number; b: number }>> | null = null;
    render(<Sonda carica={() => Promise.resolve({ a: 0, b: 0 })} suStato={(s) => { stato = s; }} />);
    await act(async () => {});
    // due gesti che partono dallo stesso render: con i valori catturati il secondo cancellava il primo
    act(() => {
      stato!.imposta((d) => ({ ...d, a: 1 }));
      stato!.imposta((d) => ({ ...d, b: 1 }));
    });
    expect(stato!.dati).toEqual({ a: 1, b: 1 });
  });
});
