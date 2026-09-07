/** @vitest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LibriPage } from './LibriPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { LibriDto, LibroDto, PartitaDto } from '../types';

const { getLibri, impostaProgressoLibro } = vi.hoisted(() => ({ getLibri: vi.fn(), impostaProgressoLibro: vi.fn() }));
vi.mock('../services/api', () => ({ getLibri, impostaProgressoLibro }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/mappe/DoveSiTrova', () => ({ DoveSiTrova: ({ tipo, chiave }: { tipo: string; chiave: string }) => <div>Dove: {tipo}/{chiave}</div> }));

const base: LibroDto = {
  chiave: 'prova', nome: 'Libro di prova', nomeIt: null, dove: 'Libreria Taiheido', prezzo: 700,
  disponibileDal: '18 aprile', dote: 'conoscenza', note: 3, sblocca: 'Sblocca un luogo', sessioni: 2,
  dettagli: null, fonte: 'https://www.allgamestaff.it/persona-5-royal/libri/', verificato: true,
  posizioni: [{ tipo: 'negozio', chiave: 'libreria-taiheido', etichetta: 'Libreria Taiheido' }],
  totaleSessioni: 2, progresso: 0, fatto: false, condizioni: null, disponibilita: null,
};
const dto = (libro: LibroDto): LibriDto => ({ libri: [libro], completati: Number(libro.fatto), sessioniFatte: libro.progresso, sessioniTotali: 2 });

describe('LibriPage', () => {
  beforeEach(() => { vi.clearAllMocks(); usePartitaStore.setState({ attiva: { id: 7, nome: 'Royal' } as PartitaDto }); });

  it('serializza pressioni rapide e conserva nel refresh lo stato finale più recente', async () => {
    let persistito = 0;
    getLibri.mockImplementation(async () => dto({ ...base, progresso: persistito, fatto: persistito === 2 }));
    let risolviPrima!: (x: LibroDto) => void;
    let risolviSeconda!: (x: LibroDto) => void;
    impostaProgressoLibro
      .mockImplementationOnce((_id: number, _chiave: string, valore: number) => new Promise<LibroDto>((resolve) => { risolviPrima = (x) => { persistito = valore; resolve(x); }; }))
      .mockImplementationOnce((_id: number, _chiave: string, valore: number) => new Promise<LibroDto>((resolve) => { risolviSeconda = (x) => { persistito = valore; resolve(x); }; }));

    const vista = render(<MemoryRouter><LibriPage /></MemoryRouter>);
    expect(await screen.findByText('Libro di prova')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una sessione a Libro di prova' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una sessione a Libro di prova' }));
    expect(impostaProgressoLibro).toHaveBeenCalledTimes(1);

    await act(async () => risolviPrima({ ...base, progresso: 1 }));
    await waitFor(() => expect(impostaProgressoLibro).toHaveBeenCalledTimes(2));
    await act(async () => risolviSeconda({ ...base, progresso: 2, fatto: true }));
    // Finito, il libro esce dai «da leggere» e va nel gruppo dei completati, che è chiuso.
    fireEvent.click(await screen.findByRole('button', { name: /Mostra i completati/ }));
    expect(screen.getByText('Completato')).toBeInTheDocument();
    expect(screen.getByText('2 di 2 sessioni')).toBeInTheDocument();

    vista.unmount();
    render(<MemoryRouter><LibriPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Mostra i completati/ }));
    expect(screen.getByText('2 di 2 sessioni')).toBeInTheDocument();
    expect(persistito).toBe(2);
  });

  it('mostra una sola posizione contestuale e disabilita il tracking senza partita', async () => {
    usePartitaStore.setState({ attiva: null });
    getLibri.mockResolvedValue(dto(base));
    render(<MemoryRouter><LibriPage /></MemoryRouter>);
    expect(await screen.findByText('Libro di prova')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Aggiungi una sessione/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione' }));
    expect(await screen.findByText('Dove: negozio/libreria-taiheido')).toBeInTheDocument();
    expect(screen.getAllByText(/Dove:/)).toHaveLength(1);
  });

  it('gestisce senza invenzioni libri con zero o più provenienze', async () => {
    usePartitaStore.setState({ attiva: null });
    getLibri.mockResolvedValue(dto({ ...base, posizioni: [] }));
    const vista = render(<MemoryRouter><LibriPage /></MemoryRouter>);
    await screen.findByText('Libro di prova');
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione' }));
    expect(screen.getByText('Posizione non disponibile')).toBeInTheDocument();
    vista.unmount();

    getLibri.mockResolvedValue(dto({ ...base, posizioni: [
      { tipo: 'luogo', chiave: 'yongen-jaya/leblanc', etichetta: 'Leblanc' },
      { tipo: 'negozio', chiave: 'libreria-taiheido', etichetta: 'Taiheido' },
    ] }));
    render(<MemoryRouter><LibriPage /></MemoryRouter>);
    await screen.findByText('Libro di prova');
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione' }));
    expect(screen.getByRole('button', { name: 'Leblanc' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Taiheido' }));
    expect(screen.getByText('Dove: negozio/libreria-taiheido')).toBeInTheDocument();
  });
});
