/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test IngressoQuartiere — un elenco con ricerca per la mappa, un tocco sull'immagine che salva subito
// ============================================================

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IngressoQuartiere } from './IngressoQuartiere';
import type { QuartiereDettaglioDto } from '../../types';
import { scegliVoce, vociSelettore } from '../../../test/selettore';

const api = vi.hoisted(() => ({ getAlberoMappe: vi.fn(), getMappa: vi.fn(), salvaIngressoQuartiere: vi.fn() }));
vi.mock('../../services/api', () => api);
vi.mock('../../stores/assetStore', () => ({ useAsset: (k: string | null | undefined) => (k ? `/asset/${k}.png` : null) }));
const notifica = vi.hoisted(() => vi.fn());
vi.mock('../../stores/notificationStore', () => ({ notifica }));

const quartiere = { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', ingresso: null, luoghi: [] } as unknown as QuartiereDettaglioDto;

beforeEach(() => {
  api.getAlberoMappe.mockResolvedValue([
    { chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', genitoreNome: 'Tokyo' },
    { chiave: 'shibuya-vicoli', nome: 'Vicoli', tipo: 'luogo', genitore: 'citta-shibuya', genitoreNome: 'Shibuya' },
  ]);
  api.getMappa.mockResolvedValue({ chiave: 'citta-shibuya', nome: 'Shibuya', asset: 'mappe/shibuya', assetOriginale: null, immagineUrl: null });
  api.salvaIngressoQuartiere.mockResolvedValue({ mappa: 'citta-shibuya', x: 25, y: 40, zoom: 2.5, nome: 'Shibuya' });
  notifica.mockReset();
});

it('la mappa si sceglie da un elenco con ricerca e il tocco sull’immagine salva subito il punto', async () => {
  const onSalvato = vi.fn(async () => {});
  render(<IngressoQuartiere quartiere={quartiere} onSalvato={onSalvato} onChiudi={vi.fn()} />);
  const immagine = await screen.findByRole('application');
  expect(vociSelettore('Mappa iniziale').length).toBeGreaterThanOrEqual(2);
  Object.defineProperty(immagine, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 200, height: 100 }) });
  await act(async () => { fireEvent.click(immagine, { clientX: 50, clientY: 40 }); });
  await waitFor(() => expect(api.salvaIngressoQuartiere).toHaveBeenCalledWith('shibuya', { mappa: 'citta-shibuya', x: 25, y: 40, zoom: 2.5 }));
  expect(onSalvato).toHaveBeenCalled();
  expect(notifica).toHaveBeenCalledWith('success', 'Ingresso del quartiere salvato.');
});

it('le pastiglie dell’ingrandimento salvano anch’esse, e cambiare mappa riporta il punto al centro', async () => {
  render(<IngressoQuartiere quartiere={quartiere} onSalvato={vi.fn(async () => {})} onChiudi={vi.fn()} />);
  await screen.findByRole('application');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Vicino · 4×' })); });
  await waitFor(() => expect(api.salvaIngressoQuartiere).toHaveBeenLastCalledWith('shibuya', expect.objectContaining({ zoom: 4 })));
  scegliVoce('Mappa iniziale', /^Vicoli/);
  await waitFor(() => expect(api.getMappa).toHaveBeenLastCalledWith('shibuya-vicoli'));
  expect(screen.getByRole('button', { name: 'Vicino · 4×' })).toHaveAttribute('aria-pressed', 'true');
});

it('«Avanzate» tiene le coordinate esatte, e non c’è più un pulsante «Salva ingresso» in prima fila', async () => {
  render(<IngressoQuartiere quartiere={quartiere} onSalvato={vi.fn(async () => {})} onChiudi={vi.fn()} />);
  await screen.findByRole('application');
  expect(screen.queryByRole('button', { name: 'Salva ingresso' })).toBeNull();
  expect(screen.getByText('Avanzate: coordinate esatte')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Orizzontale (%)'), { target: { value: '10' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salva coordinate' })); });
  await waitFor(() => expect(api.salvaIngressoQuartiere).toHaveBeenLastCalledWith('shibuya', expect.objectContaining({ x: 10, y: 50 })));
});
