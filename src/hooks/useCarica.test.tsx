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
});
