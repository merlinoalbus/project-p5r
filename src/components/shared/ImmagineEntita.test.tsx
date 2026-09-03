// @vitest-environment jsdom
// ============================================================
// Test ImmagineEntita — iniziali/immagine, modalità modificabile, rimozione, versioni
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { ImmagineEntita } from './ImmagineEntita';

const { getImmagini, eliminaImmagine, importaImmagineDaUrl } = vi.hoisted(() => ({
  getImmagini: vi.fn(),
  eliminaImmagine: vi.fn(),
  importaImmagineDaUrl: vi.fn(),
}));
vi.mock('../../services/api', () => ({
  getImmagini,
  eliminaImmagine,
  importaImmagineDaUrl,
  caricaImmagine: vi.fn(),
  urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${chiave}/file`,
}));

beforeEach(() => {
  getImmagini.mockReset();
  eliminaImmagine.mockReset();
  importaImmagineDaUrl.mockReset();
});

describe('ImmagineEntita', () => {
  it('mostra le iniziali quando manca l\'immagine e nessun comando se non modificabile', async () => {
    getImmagini.mockResolvedValue([]);
    render(<ImmagineEntita ambito="skill" chiave="Agi" etichetta="Agi" />);
    expect(await screen.findByText('A')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Carica' })).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('mostra l\'immagine presente, la rimuove e aggiorna la versione dopo un import', async () => {
    getImmagini.mockResolvedValue([{ id: 1, ambito: 'altro', chiave: 'prova', mime: 'image/png', byte: 10, url: '/x', createdAt: '' }]);
    eliminaImmagine.mockResolvedValue(undefined);
    importaImmagineDaUrl.mockResolvedValue({ id: 1, ambito: 'altro', chiave: 'prova', mime: 'image/png', byte: 10, url: '/x', createdAt: '' });
    render(<ImmagineEntita ambito="altro" chiave="prova" etichetta="Prova Entità" modificabile />);

    const img = await screen.findByRole('img', { name: 'Prova Entità' });
    expect(img).toHaveAttribute('src', '/api/immagini/altro/prova/file?v=0');
    expect(screen.getByRole('button', { name: 'Rimuovi' })).toBeInTheDocument();

    await act(async () => { screen.getByRole('button', { name: 'Rimuovi' }).click(); });
    expect(eliminaImmagine).toHaveBeenCalledWith('altro', 'prova');
    expect(await screen.findByText('PE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rimuovi' })).not.toBeInTheDocument();

    // import da URL: la finestra è nel portal, l'immagine torna con una versione nuova (cache invalidata)
    await act(async () => { screen.getByRole('button', { name: 'Da URL' }).click(); });
    const campo = screen.getByLabelText("Indirizzo dell'immagine (http/https)");
    await act(async () => { fireEvent.change(campo, { target: { value: 'https://esempio.it/a.png' } }); });
    await act(async () => { screen.getByRole('button', { name: 'Importa' }).click(); });
    expect(importaImmagineDaUrl).toHaveBeenCalledWith('altro', 'prova', 'https://esempio.it/a.png');
    const img2 = await screen.findByRole('img', { name: 'Prova Entità' });
    expect(img2.getAttribute('src')).toMatch(/\?v=[1-9]\d*$/);
  });
});
