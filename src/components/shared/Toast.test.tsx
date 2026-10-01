// @vitest-environment jsdom
// ============================================================
// Test Toast — la coda delle notifiche vive su `body`, fuori dal layout `isolate`
// ============================================================

import { act, render, screen, waitFor } from '@testing-library/react';
import { ToastContainer } from './Toast';
import { notifica, useNotificationStore } from '../../stores/notificationStore';

afterEach(() => useNotificationStore.getState().clearAll());

it('la coda sta in un portale su body, non dentro il layout: lì lo z-index non la teneva sopra al foglio di una mappa', () => {
  const { container } = render(<div className="relative isolate"><ToastContainer /></div>);
  act(() => notifica('success', '«Torre Inferiore» segnato come ottenuto.', 0));
  const messaggio = screen.getByText('«Torre Inferiore» segnato come ottenuto.');
  const coda = messaggio.closest('.coda-notifiche');
  expect(coda).not.toBeNull();
  expect(coda!.parentElement).toBe(document.body);
  expect(container.contains(coda)).toBe(false);
});

it('con un foglio dal basso aperto la coda gli sta sopra, a misura; chiuso il foglio torna al suo posto', async () => {
  const foglio = document.createElement('div');
  foglio.className = 'spillo-popup';
  foglio.style.position = 'fixed';
  const rettangolo = vi.spyOn(foglio, 'getBoundingClientRect').mockReturnValue({ top: 600, bottom: 760, left: 8, right: 367, width: 359, height: 160, x: 8, y: 600, toJSON: () => ({}) } as DOMRect);
  document.body.appendChild(foglio);
  try {
    render(<ToastContainer />);
    act(() => notifica('success', 'Segnato.', 0));
    const coda = screen.getByText('Segnato.').closest('.coda-notifiche') as HTMLElement;
    // window.innerHeight di jsdom è 768: 768 - 600 + 8
    expect(coda.style.bottom).toBe(`${window.innerHeight - 600 + 8}px`);
    foglio.remove();
    await waitFor(() => expect(coda.style.bottom).toBe(''));
  } finally { rettangolo.mockRestore(); foglio.remove(); }
});
