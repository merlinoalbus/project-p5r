// @vitest-environment jsdom
// ============================================================
// Test ImmaginiCaricate — la rimozione per ambito chiede conferma quando toglierebbe l'immagine a mappe con pezzi (L1, F5)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ImmaginiCaricate } from './ImmaginiCaricate';
import { ApiError } from '../../services/api/_helpers';
import type { ImmagineDto } from '../../types';

const api = vi.hoisted(() => ({ getImmagini: vi.fn(), eliminaImmagini: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
const { notifica } = vi.hoisted(() => ({ notifica: vi.fn() }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));

beforeEach(() => {
  vi.resetAllMocks();
  api.getImmagini.mockResolvedValue([{ ambito: 'mappa', chiave: 'citta-shibuya' }, { ambito: 'mappa', chiave: 'citta-ueno' }] as ImmagineDto[]);
});

describe('ImmaginiCaricate', () => {
  it('rimuovere le mappe con dei pezzi: il 409 non è un errore, la finestra resta e chiede «Rimuovi anche i pezzi», che rimanda con la conferma', async () => {
    api.eliminaImmagini.mockRejectedValueOnce(new ApiError(409, 'mappa-con-pezzi', 'Una mappa ha 2 pezzi ritagliati da queste immagini.', { mappe: 1, pezzi: 2, copie: 3 }))
      .mockResolvedValue({ eliminate: 2 });
    render(<ImmaginiCaricate />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rimuovi le immagini caricate per Mappe scaricate' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Conferma rimozione' }));
    fireEvent.click(finestra.getByRole('button', { name: 'Rimuovi' }));
    await waitFor(() => expect(api.eliminaImmagini).toHaveBeenCalledWith('mappa', { eliminaPezzi: false }));
    expect(await finestra.findByText(/Una mappa ha 2 pezzi ritagliati da queste immagini\./)).toBeInTheDocument();
    expect(notifica).not.toHaveBeenCalledWith('error', expect.anything());
    fireEvent.click(finestra.getByRole('button', { name: 'Rimuovi anche i pezzi' }));
    await waitFor(() => expect(api.eliminaImmagini).toHaveBeenLastCalledWith('mappa', { eliminaPezzi: true }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Conferma rimozione' })).toBeNull());
    expect(notifica).toHaveBeenCalledWith('success', 'Rimosse 2 immagini.');
  });

  it('annullare dopo il 409 dimentica la richiesta: la prossima rimozione riparte senza conferma dei pezzi', async () => {
    api.eliminaImmagini.mockRejectedValueOnce(new ApiError(409, 'mappa-con-pezzi', 'Una mappa ha 1 pezzo.', { mappe: 1, pezzi: 1, copie: 1 }));
    render(<ImmaginiCaricate />);
    fireEvent.click(await screen.findByRole('button', { name: 'Rimuovi le immagini caricate per Mappe scaricate' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Conferma rimozione' })).getByRole('button', { name: 'Rimuovi' }));
    await screen.findByText(/Una mappa ha 1 pezzo\./);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Conferma rimozione' })).getByRole('button', { name: 'Annulla' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Conferma rimozione' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Rimuovi le immagini caricate per Mappe scaricate' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Conferma rimozione' }));
    expect(finestra.queryByRole('button', { name: 'Rimuovi anche i pezzi' })).toBeNull();
    expect(finestra.getByRole('button', { name: 'Rimuovi' })).toBeInTheDocument();
  });
});
