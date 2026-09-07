/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InventariPage } from './InventariPage';
import { usePartitaStore } from '../stores/partitaStore';
const { ricercaArticoli, getOggettiGuida } = vi.hoisted(() => ({ ricercaArticoli: vi.fn(), getOggettiGuida: vi.fn() }));
vi.mock('../services/api', () => ({ ricercaArticoli, getOggettiGuida }));
vi.mock('../components/guida/ArticoliTabella', () => ({ ArticoliTabella: () => <div>Tabella inventario</div> }));
vi.mock('../components/mappe/DoveSiTrova', () => ({ DoveSiTrova: ({ titolo }: { titolo: string }) => <div>Mappa {titolo}</div> }));

describe('InventariPage', () => {
  beforeEach(() => { usePartitaStore.setState({ attiva: null }); getOggettiGuida.mockResolvedValue({ consumabili: [], chiaveEMateriali: [], abiti: { elenco: [] } }); ricercaArticoli.mockResolvedValue({ totale: 2, articoli: [] }); });
  it('espone categorie, ricerca e stato vuoto', async () => {
    render(<MemoryRouter><InventariPage /></MemoryRouter>);
    expect(await screen.findByRole('tab', { name: 'Armi da mischia' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Cibo' }));
    expect(ricercaArticoli).toHaveBeenCalledWith({ categoria: 'cibo', q: undefined }, undefined);
    await screen.findByText('0 articoli trovati.');
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'riso' } });
    expect(await screen.findByDisplayValue('riso')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Carte abilità' }));
    await screen.findByText(/Nessuna carta abilità/);
    expect(ricercaArticoli).toHaveBeenLastCalledWith({ categoria: undefined, q: undefined }, undefined);
  });
});
