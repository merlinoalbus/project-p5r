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
  chiave: 'dvd-prova', nome: 'DVD di prova', nomeIt: null, dove: 'dvd', dote: 'coraggio', note: 2, noteSuccessive: null, prezzo: null,
  dettagli: 'Due sessioni.', effetti: [{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 2 }, testo: 'Coraggio ♪♪' }], effettiTesto: ['Coraggio ♪♪'], verificato: true,
  posizioni: [{ tipo: 'luogo', chiave: 'shibuya/scarlet', etichetta: 'Scarlet', ruolo: 'noleggio' }, { tipo: 'luogo', chiave: 'yongen-jaya/leblanc', etichetta: 'Leblanc', ruolo: 'visione' }],
  totaleSessioni: 2, progresso: 0, iniziato: false, fatto: false, condizioni: null, disponibilita: null,
};
const cinema: FilmDto = { ...base, chiave: 'cinema-prova', nome: 'Film di prova', dove: 'cinema', totaleSessioni: 1, posizioni: [{ tipo: 'quartiere', chiave: 'shibuya', etichetta: 'Cinema di Shibuya', ruolo: 'cinema' }],
  condizioni: [{ tipo: 'data', testo: 'dal 24 aprile' } as unknown as NonNullable<FilmDto['condizioni']>[number]],
  effetti: [{ effetto: { famiglia: 'dote', dote: 'coraggio', note: 3 }, testo: 'Coraggio ♪♪♪' }, { effetto: { famiglia: 'dote', dote: 'coraggio', note: 1 }, ripetuto: true, testo: 'Coraggio ♪, anche alle volte successive' }],
  effettiTesto: ['Coraggio ♪♪♪', 'Coraggio ♪, anche alle volte successive'] };
const dto = (...film: FilmDto[]): FilmDvdDto => ({ film, iniziati: film.filter((f) => f.iniziato).length, completati: film.filter((f) => f.fatto).length, sessioniCompletamentoFatte: film.reduce((n, f) => n + Math.min(f.progresso, f.totaleSessioni), 0), sessioniObiettivo: film.reduce((n, f) => n + f.totaleSessioni, 0), visioniRegistrate: film.reduce((n, f) => n + f.progresso, 0) });

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
    fireEvent.click(await screen.findByRole('button', { name: /Mostra i completati · 1/ }));
    expect(screen.getByText('2 di 2 sessioni')).toBeInTheDocument();
  });

  /** Al cinema le visioni non hanno tetto e la scheda dice quando è in programmazione e quanto rende rivederlo. */
  it('permette rivisioni illimitate al cinema, mostra condizioni ed effetti, e filtra per supporto con i segmenti', async () => {
    getFilm.mockResolvedValue(dto(cinema, base));
    impostaProgressoFilm.mockImplementation(async (_id: number, _chiave: string, valore: number) => ({ ...cinema, progresso: valore, iniziato: valore > 0, fatto: valore > 0 }));
    render(<MemoryRouter><FilmPage /></MemoryRouter>);
    await screen.findByText('Film di prova');
    expect(screen.getByText('Cinema · dal 24 aprile')).toBeInTheDocument();
    expect(screen.getByText('Coraggio ♪, anche alle volte successive')).toBeInTheDocument();
    expect(screen.queryByText('Iniziale')).toBeNull();
    expect(screen.queryByText('fonte')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una visione a Film di prova' }));
    await waitFor(() => expect(impostaProgressoFilm).toHaveBeenCalledWith(7, 'cinema-prova', 1));
    // finito, va nei completati ma il «+» resta attivo: rivedere conta
    fireEvent.click(await screen.findByRole('button', { name: /Mostra i completati · 1/ }));
    expect(screen.getByRole('button', { name: 'Aggiungi una visione a Film di prova' })).toBeEnabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Solo DVD' }));
    expect(screen.queryByText('Film di prova')).toBeNull();
    expect(screen.getByText('DVD di prova')).toBeInTheDocument();
  });

  it('con il titolo bloccato il «+» resta spento e dice perché', async () => {
    getFilm.mockResolvedValue(dto({ ...cinema, disponibilita: { stato: 'bloccato', requisiti: [{ indice: 0, tipo: 'data', stato: 'rosso', testo: 'dal 24 aprile', dettaglio: 'oggi è il 12 aprile', manuale: false, confermato: false }] } }));
    render(<MemoryRouter><FilmPage /></MemoryRouter>);
    await screen.findByText('Film di prova');
    expect(screen.getByRole('button', { name: 'Aggiungi una visione a Film di prova' })).toBeDisabled();
    expect(screen.getByText(/Non ancora in programmazione/)).toHaveTextContent('Non ancora in programmazione: oggi è il 12 aprile');
  });

  it('mostra una sola posizione contestuale e disabilita il tracking senza partita', async () => {
    usePartitaStore.setState({ attiva: null });
    getFilm.mockResolvedValue(dto(base));
    render(<MemoryRouter><FilmPage /></MemoryRouter>);
    await screen.findByText('DVD di prova');
    expect(screen.queryByRole('button', { name: /Aggiungi una sessione/ })).toBeNull();
    expect(screen.getByText('2 per completarlo')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione di DVD di prova' }));
    expect(screen.getByRole('button', { name: 'Noleggio · Scarlet' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Visione · Leblanc' }));
    expect(screen.getByText('Dove: luogo/yongen-jaya/leblanc')).toBeInTheDocument();
    expect(screen.getAllByText(/Dove:/)).toHaveLength(1);
  });
});
