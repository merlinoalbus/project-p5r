// @vitest-environment jsdom
// ============================================================
// Test ImmagineEntita — iniziali/immagine, ingrandimento, comandi nella finestra, rimozione, versioni
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ImmagineEntita } from './ImmagineEntita';
import { altezzaPerForma } from '../../utils/assetPredefiniti';

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
  it('altezza per forma: quadrata 1:1, carta 1:2, orizzontale 4:3', () => {
    expect(altezzaPerForma('quadrata', 100)).toBe(100);
    expect(altezzaPerForma('carta', 60)).toBe(120);
    expect(altezzaPerForma('orizzontale', 240)).toBe(180);
    expect(altezzaPerForma('tonda', 72)).toBe(72);
  });

  it('senza immagine mostra le iniziali; il tocco apre la finestra senza comandi se non modificabile', async () => {
    getImmagini.mockResolvedValue([]);
    render(<ImmagineEntita ambito="skill" chiave="Agi" etichetta="Agi" />);
    const riquadro = await screen.findByRole('button', { name: 'Immagine di Agi (tocca per ingrandire)' });
    expect(within(riquadro).getByText('A')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    await act(async () => { riquadro.click(); });
    const finestra = screen.getByRole('dialog', { name: 'Agi' });
    expect(within(finestra).getByText('Nessuna immagine: mostrate le iniziali')).toBeInTheDocument();
    expect(within(finestra).queryByRole('button', { name: 'Carica file' })).not.toBeInTheDocument();
    await act(async () => { within(finestra).getAllByRole('button', { name: 'Chiudi' }).find((b) => b.classList.contains('btn-visivo'))!.click(); });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('immagine presente senza ritagli; dalla finestra si rimuove e si importa da URL con versione nuova', async () => {
    getImmagini.mockResolvedValue([{ id: 1, ambito: 'altro', chiave: 'prova', mime: 'image/png', byte: 10, url: '/x', createdAt: '' }]);
    eliminaImmagine.mockResolvedValue(undefined);
    importaImmagineDaUrl.mockResolvedValue({ id: 1, ambito: 'altro', chiave: 'prova', mime: 'image/png', byte: 10, url: '/x', createdAt: '' });
    render(<ImmagineEntita ambito="altro" chiave="prova" etichetta="Prova Entità" modificabile dimensione={120} forma="orizzontale" />);

    const img = await screen.findByRole('img', { name: 'Prova Entità' });
    expect(img).toHaveAttribute('src', '/api/immagini/altro/prova/file?v=x-0&r=0');
    expect(img.className).toContain('object-contain');
    const riquadro = screen.getByRole('button', { name: /Immagine di Prova Entità/ });
    expect(riquadro).toHaveStyle({ width: '120px', height: '90px' });
    // nessun comando nella card
    expect(screen.queryByRole('button', { name: 'Carica file' })).not.toBeInTheDocument();

    await act(async () => { riquadro.click(); });
    const finestra = screen.getByRole('dialog', { name: 'Prova Entità' });
    expect(within(finestra).getByText('Immagine caricata da te')).toBeInTheDocument();
    await act(async () => { within(finestra).getByRole('button', { name: 'Rimuovi' }).click(); });
    expect(eliminaImmagine).toHaveBeenCalledWith('altro', 'prova');
    expect(await within(finestra).findByText('Nessuna immagine: mostrate le iniziali')).toBeInTheDocument();
    expect(within(finestra).queryByRole('button', { name: 'Rimuovi' })).not.toBeInTheDocument();

    await act(async () => { within(finestra).getByRole('button', { name: 'Da URL' }).click(); });
    const campo = within(finestra).getByLabelText("Indirizzo dell'immagine (http/https)");
    await act(async () => { fireEvent.change(campo, { target: { value: 'https://esempio.it/a.png' } }); });
    await act(async () => { within(finestra).getByRole('button', { name: 'Importa' }).click(); });
    expect(importaImmagineDaUrl).toHaveBeenCalledWith('altro', 'prova', 'https://esempio.it/a.png');
    const img2 = await within(finestra).findByRole('img', { name: 'Prova Entità' });
    expect(img2.getAttribute('src')).toMatch(/&r=[1-9]\d*$/);
    // la card fuori dalla finestra mostra la stessa immagine aggiornata
    expect(within(riquadro).getByRole('img').getAttribute('src')).toBe(img2.getAttribute('src'));
  });
});
