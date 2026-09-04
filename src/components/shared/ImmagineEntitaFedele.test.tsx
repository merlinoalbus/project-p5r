// @vitest-environment jsdom
// ============================================================
// Test ImmagineEntita — Confidenti: ritratto fedele di default, versione stilizzata al passaggio del mouse e con il pulsante nella finestra
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ImmagineEntita } from './ImmagineEntita';
import { useAssetStore } from '../../stores/assetStore';

const { getImmagini } = vi.hoisted(() => ({ getImmagini: vi.fn() }));
vi.mock('../../services/api', () => ({
  getImmagini,
  eliminaImmagine: vi.fn(),
  importaImmagineDaUrl: vi.fn(),
  caricaImmagine: vi.fn(),
  urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`,
}));

describe('ImmagineEntita — Confidenti fedele/stilizzata', () => {
  beforeEach(() => {
    getImmagini.mockResolvedValue([]);
    useAssetStore.setState({ manifest: { generato: '', totale: 2, file: { 'confidenti/igor-fedele': '/asset/confidenti/igor-fedele.png', 'confidenti/igor': '/asset/confidenti/igor.png', 'confidenti/sae': '/asset/confidenti/sae.png' } }, caricato: true, mancanti: {} });
  });

  it('mostra il ritratto fedele, la versione stilizzata al passaggio del mouse e la fissa dal pulsante nella finestra', async () => {
    render(<ImmagineEntita ambito="confidente" chiave="igor" etichetta="Igor" />);
    const img = await screen.findByRole('img', { name: 'Igor' });
    expect(img).toHaveAttribute('src', '/asset/confidenti/igor-fedele.png');
    const riquadro = screen.getByRole('button', { name: /Immagine di Igor/ });
    fireEvent.mouseEnter(riquadro);
    expect(screen.getByRole('img', { name: 'Igor' })).toHaveAttribute('src', '/asset/confidenti/igor.png');
    fireEvent.mouseLeave(riquadro);
    expect(screen.getByRole('img', { name: 'Igor' })).toHaveAttribute('src', '/asset/confidenti/igor-fedele.png');
    await act(async () => { riquadro.click(); });
    const finestra = screen.getByRole('dialog', { name: 'Igor' });
    expect(within(finestra).getByText(/ritratto fedele/)).toBeInTheDocument();
    await act(async () => { within(finestra).getByRole('button', { name: 'Versione stilizzata' }).click(); });
    expect(within(finestra).getByRole('img', { name: 'Igor' })).toHaveAttribute('src', '/asset/confidenti/igor.png');
    expect(within(finestra).getByText(/versione stilizzata/)).toBeInTheDocument();
    expect(within(finestra).getByRole('button', { name: 'Ritratto fedele' })).toBeInTheDocument();
  });

  it('con una sola versione disponibile la usa senza alternativa al passaggio del mouse', async () => {
    render(<ImmagineEntita ambito="confidente" chiave="sae" etichetta="Sae Niijima" />);
    const img = await screen.findByRole('img', { name: 'Sae Niijima' });
    expect(img).toHaveAttribute('src', '/asset/confidenti/sae.png');
    fireEvent.mouseEnter(screen.getByRole('button', { name: /Immagine di Sae Niijima/ }));
    expect(screen.getByRole('img', { name: 'Sae Niijima' })).toHaveAttribute('src', '/asset/confidenti/sae.png');
    await act(async () => { screen.getByRole('button', { name: /Immagine di Sae Niijima/ }).click(); });
    expect(within(screen.getByRole('dialog', { name: 'Sae Niijima' })).queryByRole('button', { name: 'Versione stilizzata' })).not.toBeInTheDocument();
  });
});
