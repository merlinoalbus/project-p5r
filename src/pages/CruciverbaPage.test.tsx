/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CruciverbaPage — mesi, prossimo cruciverba evidenziato, risposta a richiesta, spunta per partita, ricerca e segmenti
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CruciverbaPage } from './CruciverbaPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { CruciverbaTuttiDto, PartitaDto } from '../types';

const { getCruciverba, impostaCruciverba } = vi.hoisted(() => ({ getCruciverba: vi.fn(), impostaCruciverba: vi.fn() }));
vi.mock('../services/api', () => ({ getCruciverba, impostaCruciverba }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const dati: CruciverbaTuttiDto = {
  dataGioco: '04-11',
  cruciverba: [
    { giorno: '04-18', chiave: '04-18-0', indizio: 'Gli anni scolastici sono suddivisi in…?', risposta: 'Semestri', rispostaEn: 'Semesters', fatto: false },
    { giorno: '05-02', chiave: '05-02-1', indizio: 'Un dolce tradizionale', risposta: 'Mochi', rispostaEn: 'Mochi', fatto: false },
  ],
  prossimo: null, risolti: 0, totale: 2,
};
dati.prossimo = dati.cruciverba[0];

describe('CruciverbaPage', () => {
  it('raggruppa per mese, evidenzia il prossimo, rivela la risposta, segna risolto, cerca e filtra', async () => {
    usePartitaStore.setState({ attiva: { id: 3, nome: 'Prova' } as PartitaDto });
    getCruciverba.mockResolvedValue(dati);
    impostaCruciverba.mockResolvedValue({ ...dati.cruciverba[0], fatto: true });
    render(<MemoryRouter><CruciverbaPage /></MemoryRouter>);
    expect(await screen.findByText('Gli anni scolastici sono suddivisi in…?')).toBeInTheDocument();
    expect(getCruciverba).toHaveBeenCalledWith(3);
    expect(screen.getByRole('heading', { name: 'Aprile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Maggio' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Prossimo cruciverba: 18 aprile');
    expect(screen.getByText('Prossimo')).toBeInTheDocument();
    expect(screen.queryByText('Semestri')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Mostra la risposta' })[0]);
    expect(screen.getByText('Semestri')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: /18 aprile/ })); });
    expect(impostaCruciverba).toHaveBeenCalledWith(3, '04-18', true);
    expect(await screen.findByText(/1 risolti/)).toBeInTheDocument();
    // risolto il primo, il prossimo passa al secondo
    expect(screen.getByRole('status')).toHaveTextContent('Prossimo cruciverba: 2 maggio');
    fireEvent.click(screen.getByRole('radio', { name: 'Da fare' }));
    expect(screen.queryByText('Gli anni scolastici sono suddivisi in…?')).toBeNull();
    expect(screen.getByText('Un dolce tradizionale')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Tutti' }));
    // la ricerca trova per risposta
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'mochi' } });
    expect(screen.queryByText('Gli anni scolastici sono suddivisi in…?')).toBeNull();
    expect(screen.getByText('Un dolce tradizionale')).toBeInTheDocument();
  });
});
