// @vitest-environment jsdom
// ============================================================
// Test HomePage — la mappa a scomparsa: «Nascondi la mappa», linguetta, «Tieni aperta», «Sulla mappa» la riapre
// ============================================================
//
// Guida e mappa del giorno sono sostituite da finti: qui si prova solo chi le apre e le chiude, e la preferenza.
// ============================================================

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';
import { usePartitaStore } from '../stores/partitaStore';
import { usePreferenzeStore } from '../stores/preferenzeStore';
import type { Oggi } from '../hooks/useOggi';
import type { PartitaDto } from '../types';

const api = vi.hoisted(() => ({ getDoti: vi.fn(), getPossedute: vi.fn() }));
vi.mock('../services/api', () => api);
const sullaMappa = vi.hoisted(() => vi.fn());
vi.mock('../hooks/useOggi', () => ({
  useOggi: (): Partial<Oggi> => ({ indice: { giorni: [], dataCorrente: '04-12', totaleGiorni: 1, giorniCoperti: 1 } as unknown as Oggi['indice'], giorno: {} as Oggi['giorno'], caricamento: false, errore: null, sullaMappa }),
}));
vi.mock('../components/partita/OggiGuida', () => ({
  OggiGuida: ({ oggi }: { oggi: Oggi }) => <button type="button" onClick={() => oggi.sullaMappa({ chiave: 'citta-shibuya', spilloId: 7 }, 0)}>Sulla mappa: prova</button>,
}));
vi.mock('../components/partita/OggiMappa', () => ({ OggiMappa: () => <div data-testid="mappa">mappa</div> }));

beforeEach(() => {
  localStorage.clear();
  sullaMappa.mockReset();
  api.getDoti.mockResolvedValue([]);
  api.getPossedute.mockResolvedValue([]);
  usePreferenzeStore.setState({ mappaHomeChiusa: false });
  usePartitaStore.setState({ attiva: { id: 4, nome: 'Prova', livelloProtagonista: 1, allarmeAttivo: false } as PartitaDto });
});

const disegna = () => render(<MemoryRouter><HomePage /></MemoryRouter>);

it('«Nascondi la mappa» la chiude in una linguetta e lo ricorda; la linguetta la riapre', async () => {
  const { container } = disegna();
  const griglia = container.querySelector('.home-griglia')!;
  expect(griglia.className).not.toContain('home-griglia--mappa-chiusa');
  expect(screen.queryByRole('button', { name: 'Mostra la mappa' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Nascondi la mappa' }));
  expect(griglia.className).toContain('home-griglia--mappa-chiusa');
  expect(container.querySelector('.home-mappa')!.className).toContain('home-mappa--a-scomparsa');
  // la mappa resta montata (esce al passaggio del mouse senza ricaricarsi)
  expect(screen.getByTestId('mappa')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem('p5r-preferenze')!).mappaHomeChiusa).toBe(true);
  await userEvent.click(screen.getByRole('button', { name: 'Mostra la mappa' }));
  expect(griglia.className).not.toContain('home-griglia--mappa-chiusa');
  expect(usePreferenzeStore.getState().mappaHomeChiusa).toBe(false);
});

it('uscita al passaggio del mouse, «Tieni aperta» la rimette al suo posto', async () => {
  usePreferenzeStore.setState({ mappaHomeChiusa: true });
  disegna();
  await userEvent.click(screen.getByRole('button', { name: 'Tieni aperta' }));
  expect(usePreferenzeStore.getState().mappaHomeChiusa).toBe(false);
  expect(screen.getByRole('button', { name: 'Nascondi la mappa' })).toBeInTheDocument();
});

it('«Sulla mappa» di un’azione riapre la mappa chiusa e ci porta l’azione', async () => {
  usePreferenzeStore.setState({ mappaHomeChiusa: true });
  disegna();
  await userEvent.click(screen.getByRole('button', { name: 'Sulla mappa: prova' }));
  expect(usePreferenzeStore.getState().mappaHomeChiusa).toBe(false);
  expect(sullaMappa).toHaveBeenCalledWith({ chiave: 'citta-shibuya', spilloId: 7 }, 0);
});
