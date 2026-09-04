/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CruciverbaPage — elenco per data, risposta nascosta finché non richiesta, spunta per partita, filtro «solo da fare»
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
  cruciverba: [
    { giorno: '04-18', indizio: 'Gli anni scolastici sono suddivisi in…?', risposta: 'Semestri', rispostaEn: 'Semesters', fonte: 'https://www.allgamestaff.it/persona-5-royal/cruciverba/', fatto: false },
    { giorno: '04-27', indizio: 'Un dolce tradizionale', risposta: 'Mochi', rispostaEn: 'Mochi', fonte: 'https://www.allgamestaff.it/persona-5-royal/cruciverba/', fatto: false },
  ],
  risolti: 0, totale: 2,
};

describe('CruciverbaPage', () => {
  it('mostra le date, rivela la risposta a richiesta, segna risolto e filtra i da fare', async () => {
    usePartitaStore.setState({ attiva: { id: 3, nome: 'Prova' } as PartitaDto });
    getCruciverba.mockResolvedValue(dati);
    impostaCruciverba.mockResolvedValue({ ...dati.cruciverba[0], fatto: true });
    render(<MemoryRouter><CruciverbaPage /></MemoryRouter>);
    expect(await screen.findByText('Gli anni scolastici sono suddivisi in…?')).toBeInTheDocument();
    expect(getCruciverba).toHaveBeenCalledWith(3);
    expect(screen.queryByText('Semestri')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Mostra la risposta' })[0]);
    expect(screen.getByText('Semestri')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: /18 aprile/ })); });
    expect(impostaCruciverba).toHaveBeenCalledWith(3, '04-18', true);
    expect(await screen.findByText(/1 risolti/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo da fare' }));
    expect(screen.queryByText('Gli anni scolastici sono suddivisi in…?')).toBeNull();
    expect(screen.getByText('Un dolce tradizionale')).toBeInTheDocument();
  });
});
