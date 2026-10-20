/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test IngressoQuartiere — la finestra dell'ingresso (L2): si sceglie un'Area del quartiere e il punto della sua planimetria
// predefinita, si salva con «Salva»; «Togli l'ingresso» lo toglie
// ============================================================

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { IngressoQuartiere } from './IngressoQuartiere';
import type { AreaRiassuntoDto, QuartiereDettaglioDto } from '../../types';
import { scegliVoce, vociSelettore } from '../../../test/selettore';

const api = vi.hoisted(() => ({ salvaIngressoQuartiere: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/assetStore', () => ({ useAsset: (k: string | null | undefined) => (k ? `/asset/${k}.png` : null) }));
const notifica = vi.hoisted(() => vi.fn());
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));

/** Un'Area di Shibuya con lo slug, il nome e l'immagine della predefinita dati. */
const area = (slug: string, nome: string, immagineUrl: string | null): AreaRiassuntoDto => ({ chiave: `citta/shibuya/${slug}`, slug, nome, illustrazione: { immagineUrl, asset: null }, numeroPlanimetrie: 1 } as AreaRiassuntoDto);
const quartiere = (ingresso: QuartiereDettaglioDto['ingresso'] = null) => ({ chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', ingresso, luoghi: [],
  aree: [area('central-street', 'Central Street', '/central.png'), area('sottopasso', 'Sottopasso', '/sottopasso.png')] }) as unknown as QuartiereDettaglioDto;

beforeEach(() => {
  api.salvaIngressoQuartiere.mockReset().mockResolvedValue({ mappa: 'x', x: 25, y: 40, zoom: 1, nome: 'Central Street', area: { slug: 'central-street', nome: 'Central Street' } });
  notifica.mockReset();
});

it('si sceglie l’area fra quelle del quartiere, si tocca la sua planimetria e «Salva» manda area, punto e zoom', async () => {
  const onSalvato = vi.fn(async () => {});
  const onChiudi = vi.fn();
  render(<IngressoQuartiere quartiere={quartiere()} aperta onSalvato={onSalvato} onChiudi={onChiudi} />);
  const finestra = within(screen.getByRole('dialog', { name: 'Ingresso di Shibuya' }));
  // l'elenco è delle aree del quartiere, non di tutto l'atlante
  expect(vociSelettore('Area d’ingresso')).toEqual([expect.stringMatching(/Central Street/), expect.stringMatching(/Sottopasso/)]);
  expect(finestra.getByAltText('Planimetria di Central Street')).toHaveAttribute('src', '/central.png');
  const immagine = finestra.getByRole('application');
  Object.defineProperty(immagine, 'getBoundingClientRect', { value: () => ({ left: 0, top: 0, width: 200, height: 100 }) });
  fireEvent.click(immagine, { clientX: 50, clientY: 40 });
  // il tocco non salva più da solo: si salva con «Salva»
  expect(api.salvaIngressoQuartiere).not.toHaveBeenCalled();
  fireEvent.click(finestra.getByRole('button', { name: 'Vicino · 4×' }));
  await act(async () => { fireEvent.click(finestra.getByRole('button', { name: 'Salva' })); });
  await waitFor(() => expect(api.salvaIngressoQuartiere).toHaveBeenCalledWith('shibuya', { area: 'central-street', x: 25, y: 40, zoom: 4 }));
  expect(onSalvato).toHaveBeenCalled();
  expect(onChiudi).toHaveBeenCalled();
});

it('cambiando area il punto torna al centro e l’immagine è la sua; «Avanzate» tiene le coordinate esatte', async () => {
  render(<IngressoQuartiere quartiere={quartiere()} aperta onSalvato={vi.fn(async () => {})} onChiudi={vi.fn()} />);
  scegliVoce('Area d’ingresso', /^Sottopasso/);
  expect(await screen.findByAltText('Planimetria di Sottopasso')).toHaveAttribute('src', '/sottopasso.png');
  fireEvent.change(screen.getByLabelText('Orizzontale (%)'), { target: { value: '10' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Salva' })); });
  await waitFor(() => expect(api.salvaIngressoQuartiere).toHaveBeenLastCalledWith('shibuya', { area: 'sottopasso', x: 10, y: 50, zoom: 1 }));
});

it('con un ingresso salvato riparte da lì, e «Togli l’ingresso» lo toglie', async () => {
  const ingresso = { mappa: 'nativo-001-3-0', nome: 'Central Street', x: 38.29, y: 32.67, zoom: 1, area: { slug: 'central-street', nome: 'Central Street' } };
  render(<IngressoQuartiere quartiere={quartiere(ingresso)} aperta onSalvato={vi.fn(async () => {})} onChiudi={vi.fn()} />);
  expect(screen.getByLabelText('Orizzontale (%)')).toHaveValue(38.29);
  expect(screen.getByText(/Salvato: Central Street, 38.29% da sinistra/)).toBeInTheDocument();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Togli l’ingresso' })); });
  await waitFor(() => expect(api.salvaIngressoQuartiere).toHaveBeenCalledWith('shibuya', null));
});

it('un quartiere senza aree non ha niente da scegliere: lo dice, e «Salva» resta spento', () => {
  render(<IngressoQuartiere quartiere={{ ...quartiere(), aree: [] }} aperta onSalvato={vi.fn(async () => {})} onChiudi={vi.fn()} />);
  expect(screen.getByText(/non ha ancora aree/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Salva' })).toBeDisabled();
});
