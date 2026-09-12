// @vitest-environment jsdom
// ============================================================
// Test RimossiPage — le righe nascoste di ogni tipo, con il ripristino in un tocco
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RimossiPage } from './RimossiPage';
import { TIPI_CATALOGO } from '../../shared/types';

const { getCatalogo, nascondiElementoCatalogo, getNegozi } = vi.hoisted(() => ({ getCatalogo: vi.fn(), nascondiElementoCatalogo: vi.fn(), getNegozi: vi.fn().mockResolvedValue([{ chiave: 'untouchable', nome: 'Untouchable' }]) }));
vi.mock('../services/api', () => ({ getCatalogo, nascondiElementoCatalogo, getNegozi }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

it('chiede a ogni tipo le sole righe nascoste e rimette una riga negli elenchi', async () => {
  getCatalogo.mockImplementation((tipo: string) => Promise.resolve(tipo === 'articolo'
    ? [{ tipo: 'articolo', chiave: 'untouchable/u-tolto', nome: 'Kogatana nera', origine: 'seed', modificata: false, nascosta: true, aggiornata: null, dati: { negozio_chiave: 'untouchable' } }]
    : []));
  nascondiElementoCatalogo.mockResolvedValue({});
  render(<MemoryRouter><RimossiPage /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Rimossi' })).toBeInTheDocument();
  const blocco = await screen.findByRole('region', { name: 'Articoli dei negozi rimossi' });
  expect(within(blocco).getByText(/Kogatana nera/)).toBeInTheDocument();
  // il negozio col suo nome, non con la chiave
  expect(await within(blocco).findByText(/· Untouchable/)).toBeInTheDocument();
  expect(within(blocco).queryByText(/· untouchable/)).toBeNull();
  // tutti i tipi hanno il loro blocco, anche vuoto
  await waitFor(() => expect(screen.getAllByRole('region')).toHaveLength(TIPI_CATALOGO.length));
  expect(screen.getAllByText('Nessuna riga rimossa.')).toHaveLength(TIPI_CATALOGO.length - 1);
  for (const tipo of TIPI_CATALOGO) expect(getCatalogo).toHaveBeenCalledWith(tipo, { nascosti: true, negozio: undefined });

  fireEvent.click(within(blocco).getByRole('button', { name: /Rimetti negli elenchi/ }));
  await waitFor(() => expect(nascondiElementoCatalogo).toHaveBeenCalledWith('articolo', 'untouchable/u-tolto', false));
});
