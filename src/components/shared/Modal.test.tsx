// @vitest-environment jsdom
// ============================================================
// Test Modal — portal su body, Esc, clic esterno, blocco dello scroll
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('è renderizzata come figlia diretta di body anche se aperta dentro un contenitore con opacity', () => {
    const onChiudi = vi.fn();
    render(
      <ul>
        <li style={{ opacity: 0.75 }}>
          <Modal titolo="Importa immagine — Igor" aperta onChiudi={onChiudi}>contenuto</Modal>
        </li>
        <li>card successiva</li>
      </ul>,
    );
    const overlay = document.querySelector('.modal-overlay');
    expect(overlay?.parentElement).toBe(document.body);
    expect(screen.getByRole('dialog', { name: 'Importa immagine — Igor' })).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('chiude con Esc, con il clic sull\'overlay e con il pulsante, ripristinando lo scroll', () => {
    const onChiudi = vi.fn();
    const { rerender } = render(<Modal titolo="Prova" aperta onChiudi={onChiudi}>corpo</Modal>);
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }); });
    expect(onChiudi).toHaveBeenCalledTimes(1);
    act(() => { fireEvent.click(document.querySelector('.modal-overlay')!); });
    expect(onChiudi).toHaveBeenCalledTimes(2);
    // il clic dentro la finestra non chiude
    act(() => { fireEvent.click(screen.getByRole('dialog')); });
    expect(onChiudi).toHaveBeenCalledTimes(2);
    act(() => { screen.getByRole('button', { name: 'Chiudi' }).click(); });
    expect(onChiudi).toHaveBeenCalledTimes(3);

    rerender(<Modal titolo="Prova" aperta={false} onChiudi={onChiudi}>corpo</Modal>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('');
  });
});
