/** @vitest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FilmPage } from './FilmPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { FilmDto, FilmDvdDto, PartitaDto } from '../types';

const { getFilm, impostaProgressoFilm } = vi.hoisted(() => ({ getFilm: vi.fn(), impostaProgressoFilm: vi.fn() }));
vi.mock('../services/api', () => ({ getFilm, impostaProgressoFilm }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/mappe/DoveSiTrova', () => ({ DoveSiTrova: ({ tipo, chiave }: { tipo: string; chiave: string }) => <div>Dove: {tipo}/{chiave}</div> }));

const base: FilmDto = {
  chiave: 'dvd-prova', nome: 'DVD di prova', nomeIt: null, dove: 'dvd', periodo: 'Iniziale', dote: 'coraggio', note: 2, prezzo: null,
  dettagli: 'Due sessioni.', fonte: 'https://www.allgamestaff.it/persona-5-royal/dvd-a-noleggio/', verificato: true,
  posizioni: [{ tipo: 'luogo', chiave: 'shibuya/scarlet', etichetta: 'Scarlet', ruolo: 'noleggio' }, { tipo: 'luogo', chiave: 'yongen-jaya/leblanc', etichetta: 'Leblanc', ruolo: 'visione' }],
  totaleSessioni: 2, progresso: 0, iniziato: false, fatto: false,
};
const dto = (film: FilmDto): FilmDvdDto => ({ film: [film], iniziati: Number(film.iniziato), completati: Number(film.fatto), sessioniCompletamentoFatte: Math.min(film.progresso, film.totaleSessioni), sessioniObiettivo: film.totaleSessioni, visioniRegistrate: film.progresso });

describe('FilmPage', () => {
  beforeEach(() => { vi.clearAllMocks(); usePartitaStore.setState({ attiva: { id: 7, nome: 'Royal' } as PartitaDto }); });

  it('serializza pressioni rapide sul DVD e conserva lo stato finale', async () => {
    let persistito = 0;
    getFilm.mockImplementation(async () => dto({ ...base, progresso: persistito, iniziato: persistito > 0, fatto: persistito === 2 }));
    let prima!: (x: FilmDto) => void; let seconda!: (x: FilmDto) => void;
    impostaProgressoFilm
      .mockImplementationOnce((_id: number, _chiave: string, valore: number) => new Promise<FilmDto>((resolve) => { prima = (x) => { persistito = valore; resolve(x); }; }))
      .mockImplementationOnce((_id: number, _chiave: string, valore: number) => new Promise<FilmDto>((resolve) => { seconda = (x) => { persistito = valore; resolve(x); }; }));
    render(<MemoryRouter><FilmPage /></MemoryRouter>);
    await screen.findByText('DVD di prova');
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una sessione a DVD di prova' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una sessione a DVD di prova' }));
    expect(impostaProgressoFilm).toHaveBeenCalledTimes(1);
    await act(async () => prima({ ...base, progresso: 1, iniziato: true }));
    await waitFor(() => expect(impostaProgressoFilm).toHaveBeenCalledTimes(2));
    await act(async () => seconda({ ...base, progresso: 2, iniziato: true, fatto: true }));
    // Finito, il DVD esce dai «da vedere» e sta nel gruppo dei completati, che è chiuso.
    fireEvent.click(await screen.findByRole('button', { name: /Mostra i completati · 1/ }));
    expect(screen.getByText('2 di 2 sessioni')).toBeInTheDocument();
  });

  it('permette rivisioni illimitate al cinema e filtra per supporto', async () => {
    const cinema = { ...base, chiave: 'cinema-prova', nome: 'Film di prova', dove: 'cinema' as const, totaleSessioni: 1, posizioni: [{ tipo: 'quartiere' as const, chiave: 'shibuya', etichetta: 'Cinema di Shibuya', ruolo: 'cinema' as const }] };
    getFilm.mockResolvedValue({ ...dto(cinema), film: [cinema, base], sessioniObiettivo: 3 });
    impostaProgressoFilm.mockImplementation(async (_id: number, _chiave: string, valore: number) => ({ ...cinema, progresso: valore, iniziato: valore > 0, fatto: valore > 0 }));
    render(<MemoryRouter><FilmPage /></MemoryRouter>);
    await screen.findByText('Film di prova');
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una visione a Film di prova' }));
    await waitFor(() => expect(impostaProgressoFilm).toHaveBeenCalledWith(7, 'cinema-prova', 1));
    fireEvent.change(screen.getByRole('combobox', { name: 'Supporto' }), { target: { value: 'dvd' } });
    expect(screen.queryByText('Film di prova')).toBeNull();
    expect(screen.getByText('DVD di prova')).toBeInTheDocument();
  });

  it('mostra una sola posizione contestuale e disabilita il tracking senza partita', async () => {
    usePartitaStore.setState({ attiva: null });
    getFilm.mockResolvedValue(dto(base));
    render(<MemoryRouter><FilmPage /></MemoryRouter>);
    await screen.findByText('DVD di prova');
    expect(screen.queryByRole('button', { name: /Aggiungi una sessione/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione di DVD di prova' }));
    expect(screen.getByRole('button', { name: 'Noleggio · Scarlet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visione · Leblanc' }));
    expect(screen.getByText('Dove: luogo/yongen-jaya/leblanc')).toBeInTheDocument();
    expect(screen.getAllByText(/Dove:/)).toHaveLength(1);
  });
});
