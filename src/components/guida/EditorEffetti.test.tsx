/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test EditorEffetti — le voci hanno chiavi stabili: togliendone una, le altre tengono il loro stato (A3, verifica 2026-10-03)
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { EditorEffetti } from './EditorEffetti';
import type { VoceEffetto } from '../../../shared/effettiCatalogo';

vi.mock('./CondizioniEditor', () => ({ CondizioniEditor: () => <div>editor delle condizioni</div> }));
vi.mock('./EditorEffetto', () => ({ EditorEffetto: () => null }));

function Prova({ iniziali }: { iniziali: VoceEffetto[] }) {
  const [voci, setVoci] = useState(iniziali);
  return <EditorEffetti voci={voci} onCambia={setVoci} />;
}

describe('EditorEffetti', () => {
  it('togliendo la prima voce, la seconda tiene aperte le sue condizioni', () => {
    render(<Prova iniziali={[{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 1 } }, { effetto: { famiglia: 'dote', dote: 'fascino', note: 2 } }]} />);
    // si aprono le condizioni della seconda voce (Fascino)
    const bottoni = screen.getAllByRole('button', { name: /^Condizioni/ });
    fireEvent.click(bottoni[1]);
    expect(screen.getAllByText('editor delle condizioni')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: "Togli l'effetto 1" }));
    // resta la voce Fascino, con le condizioni ancora aperte
    expect(screen.getByText(/Fascino/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nascondi le condizioni' })).toBeInTheDocument();
    expect(screen.getAllByText('editor delle condizioni')).toHaveLength(1);
  });

  it('una voce aggiunta parte con le condizioni chiuse', () => {
    render(<Prova iniziali={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi un effetto/ }));
    expect(screen.getByRole('button', { name: /^Condizioni/ })).toHaveAttribute('aria-expanded', 'false');
  });
});
