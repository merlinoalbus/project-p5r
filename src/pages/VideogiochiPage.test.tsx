/** @vitest-environment jsdom */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VideogiochiPage } from './VideogiochiPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { PartitaDto, VideogiocoDto, VideogiochiDto } from '../types';

const { getVideogiochi, impostaProgressoVideogioco } = vi.hoisted(() => ({ getVideogiochi: vi.fn(), impostaProgressoVideogioco: vi.fn() }));
vi.mock('../services/api/compendio', () => ({ getVideogiochi }));
vi.mock('../services/api/partite', () => ({ impostaProgressoVideogioco }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/mappe/DoveSiTrova', () => ({ DoveSiTrova: ({ tipo, chiave }: { tipo: string; chiave: string }) => <div>Dove: {tipo}/{chiave}</div> }));

const base = { chiave: 'game-prova', nome: 'Gioco di prova', tipo: 'videogioco', luogo: 'Sala giochi', luogoChiave: 'shibuya/arcade', fascia: null, costo: null, sblocco: null, sessioni: 2, doti: [], altriEffetti: null, regole: '', premi: null, paga: null, fonte: 'https://example.test', verificato: true, totaleRound: 2, progresso: 0, iniziato: false, fatto: false } as VideogiocoDto;
const dto = (g: VideogiocoDto): VideogiochiDto => ({ videogiochi: [g], iniziati: Number(g.iniziato), completati: Number(g.fatto), roundFatti: g.progresso, roundObiettivo: g.totaleRound });

describe('VideogiochiPage', () => {
  beforeEach(() => { vi.clearAllMocks(); usePartitaStore.setState({ attiva: { id: 7, nome: 'Royal' } as PartitaDto }); });

  it('serializza i round premuti rapidamente e conserva il completamento', async () => {
    getVideogiochi.mockResolvedValue(dto(base));
    let prima!: (x: VideogiocoDto) => void; let seconda!: (x: VideogiocoDto) => void;
    impostaProgressoVideogioco
      .mockImplementationOnce((_id: number, _chiave: string, valore: number) => new Promise<VideogiocoDto>((resolve) => { prima = (x) => resolve({ ...x, progresso: valore, iniziato: true }); }))
      .mockImplementationOnce((_id: number, _chiave: string, valore: number) => new Promise<VideogiocoDto>((resolve) => { seconda = (x) => resolve({ ...x, progresso: valore, iniziato: true, fatto: true }); }));
    render(<MemoryRouter><VideogiochiPage /></MemoryRouter>);
    await screen.findByText('Gioco di prova');
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi un round a Gioco di prova' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi un round a Gioco di prova' }));
    expect(impostaProgressoVideogioco).toHaveBeenCalledTimes(1);
    await act(async () => prima({ ...base, progresso: 1, iniziato: true }));
    await waitFor(() => expect(impostaProgressoVideogioco).toHaveBeenCalledTimes(2));
    await act(async () => seconda({ ...base, progresso: 2, iniziato: true, fatto: true }));
    expect(await screen.findByText('Completato')).toBeInTheDocument();
  });

  it('mostra la posizione contestuale del gioco', async () => {
    getVideogiochi.mockResolvedValue(dto(base));
    render(<MemoryRouter><VideogiochiPage /></MemoryRouter>);
    await screen.findByText('Gioco di prova');
    fireEvent.click(screen.getByRole('button', { name: 'Mostra posizione di Gioco di prova' }));
    expect(screen.getByText('Dove: attivita/game-prova')).toBeInTheDocument();
  });
});
