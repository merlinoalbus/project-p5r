/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test AttivitaPage — schede, filtro per Dote, spunta libro letto per partita
// ============================================================

import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AttivitaPage } from './AttivitaPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { AttivitaDto, AttivitaTutteDto, LibroDto, PartitaDto } from '../types';

const { getAttivita, impostaLettura } = vi.hoisted(() => ({ getAttivita: vi.fn(), impostaLettura: vi.fn() }));
vi.mock('../services/api', () => ({ getAttivita, impostaLettura }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));

const att = (chiave: string, nome: string, tipo: AttivitaDto['tipo'], dote: AttivitaDto['doti'][number]['dote']): AttivitaDto => ({ chiave, nome, tipo, luogo: 'Kichijoji, Penguin Sniper', luogoChiave: 'kichijoji', fascia: 'sera', costo: 800, sblocco: '5 giugno', doti: [{ dote, note: 1, condizione: 'una nota a sessione' }], altriEffetti: null, regole: 'Regole.', premi: null, paga: null, fonte: 'https://www.allgamestaff.it/x', verificato: true });
const libro = (chiave: string, nome: string, dote: LibroDto['dote']): LibroDto => ({ chiave, nome, nomeIt: nome, dove: 'Libreria Taiheido', prezzo: 700, disponibileDal: '18 aprile', dote, note: 3, sblocca: null, sessioni: 2, dettagli: null, fonte: 'https://www.allgamestaff.it/libri', verificato: true, fatto: false });
const dati: AttivitaTutteDto = {
  attivita: [att('freccette', 'Freccette', 'mini-gioco', 'perizia'), att('bagno', 'Bagno pubblico', 'altro', 'fascino')],
  lavori: [att('triple-seven', 'Commesso al Triple Seven', 'lavoro', 'fascino')],
  libri: [libro('il-magnifico-ladro', 'Il magnifico ladro', 'conoscenza'), libro('zorro', 'Zorro il vendicatore', 'coraggio')],
  film: [{ chiave: 'cinema-le-sedici-domande', nome: 'Le sedici domande', nomeIt: 'Le sedici domande', dove: 'cinema', periodo: 'dal 24 aprile', dote: 'coraggio', note: null, prezzo: 1500, dettagli: null, fonte: 'https://www.allgamestaff.it/f', verificato: true, fatto: false }],
  libriLetti: 0, filmVisti: 0,
};

describe('AttivitaPage', () => {
  it('mostra le attività, filtra per Dote, apre i libri e segna un libro letto', async () => {
    usePartitaStore.setState({ attiva: { id: 5, nome: 'Prova' } as PartitaDto });
    getAttivita.mockResolvedValue(dati);
    impostaLettura.mockResolvedValue({ ...dati.libri[0], fatto: true });
    render(<MemoryRouter><AttivitaPage /></MemoryRouter>);
    expect(await screen.findByText('Freccette')).toBeInTheDocument();
    expect(getAttivita).toHaveBeenCalledWith(5);
    expect(screen.getAllByRole('link', { name: 'Kichijoji, Penguin Sniper' })[0]).toHaveAttribute('href', '/guida/citta/kichijoji');
    fireEvent.change(screen.getByRole('combobox', { name: 'Dote' }), { target: { value: 'fascino' } });
    expect(screen.queryByText('Freccette')).toBeNull();
    expect(screen.getByText('Bagno pubblico')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Dote' }), { target: { value: '' } });
    fireEvent.click(screen.getByRole('tab', { name: 'Lavori' }));
    expect(screen.getByText('Commesso al Triple Seven')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Libri' }));
    expect(screen.getByText('Il magnifico ladro')).toBeInTheDocument();
    await act(async () => { fireEvent.click(screen.getByRole('checkbox', { name: 'Il magnifico ladro letto' })); });
    expect(impostaLettura).toHaveBeenCalledWith(5, 'libro', 'il-magnifico-ladro', true);
    expect(await screen.findByText(/1 libri letti/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Film e DVD' }));
    expect(screen.getByText('Le sedici domande')).toBeInTheDocument();
  });
});
