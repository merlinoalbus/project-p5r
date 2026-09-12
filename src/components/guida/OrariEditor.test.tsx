// @vitest-environment jsdom
// ============================================================
// Test OrariEditor — giorni e fasce come chip, pioggia come levetta, nota, e la frase che ne discende
// ============================================================

import { fireEvent, render, screen } from '@testing-library/react';
import { OrariEditor } from './OrariEditor';
import { ORARI_SEMPRE, descriviOrari, type OrariNegozio } from '../../../shared/orariNegozio';

it('accende i giorni e le fasce, la pioggia e la nota, e mostra la frase', () => {
  const onCambia = vi.fn();
  const { rerender } = render(<OrariEditor valore={ORARI_SEMPRE} onCambia={onCambia} />);
  expect(screen.getByRole('button', { name: 'domenica' })).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(screen.getByRole('button', { name: 'domenica' }));
  expect(onCambia).toHaveBeenLastCalledWith({ ...ORARI_SEMPRE, giorni: ['domenica'] });

  const conDomenica: OrariNegozio = { ...ORARI_SEMPRE, giorni: ['domenica'] };
  rerender(<OrariEditor valore={conDomenica} onCambia={onCambia} />);
  fireEvent.click(screen.getByRole('button', { name: 'di sera' }));
  expect(onCambia).toHaveBeenLastCalledWith({ ...conDomenica, fasce: ['sera'] });
  fireEvent.click(screen.getByRole('checkbox', { name: /Chiuso nei giorni di pioggia/ }));
  expect(onCambia).toHaveBeenLastCalledWith({ ...conDomenica, chiusoConPioggia: true });
  fireEvent.change(screen.getByLabelText(/Nota/), { target: { value: 'solo con Iwai' } });
  expect(onCambia).toHaveBeenLastCalledWith({ ...conDomenica, nota: 'solo con Iwai' });

  const completo: OrariNegozio = { giorni: ['domenica'], fasce: ['sera'], chiusoConPioggia: true, nota: null };
  rerender(<OrariEditor valore={completo} onCambia={onCambia} />);
  expect(screen.getByRole('status')).toHaveTextContent(descriviOrari(completo));
  // un secondo clic spegne il chip
  fireEvent.click(screen.getByRole('button', { name: 'domenica' }));
  expect(onCambia).toHaveBeenLastCalledWith({ ...completo, giorni: [] });
});
