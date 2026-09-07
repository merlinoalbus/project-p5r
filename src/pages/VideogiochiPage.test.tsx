/** @vitest-environment jsdom */

// ============================================================
// VideogiochiPage — i tocchi rapidi non si perdono, e la posizione è una sola
// ============================================================
//
// Il round si segna col tablet in mano mentre si gioca, e cinque tocchi di fila sul «+» sono la
// norma. Con una richiesta per volta e i pulsanti disabilitati durante l'attesa, i tocchi che
// cadevano nel mezzo sparivano: restava l'ultimo valore confermato, non quello chiesto. Il difetto
// l'ha trovato Codex (`candidato/lotto-b-v5`) sui DVD prima e qui poi.

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VideogiochiPage } from './VideogiochiPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { PartitaDto, VideogiocoDto } from '../types';

const { getVideogiochi, impostaProgressoVideogioco } = vi.hoisted(() => ({ getVideogiochi: vi.fn(), impostaProgressoVideogioco: vi.fn() }));
vi.mock('../services/api/compendio', () => ({ getVideogiochi }));
vi.mock('../services/api/partite', () => ({ impostaProgressoVideogioco }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../components/mappe/DoveSiTrova', () => ({ DoveSiTrova: ({ chiave }: { chiave: string }) => <div>Dove: {chiave}</div> }));

const gioco: VideogiocoDto = {
  chiave: 'tycoon', nome: 'Tycoon dello spazio', luogo: 'Soffitta di Leblanc', totaleRound: 5, progresso: 0,
  iniziato: false, fatto: false, doti: [{ dote: 'conoscenza', note: 1, condizione: null }], costo: null,
  sblocco: null, premi: null, fonte: '', condizioni: null, disponibilita: null,
} as unknown as VideogiocoDto;

const dto = (g: VideogiocoDto) => ({ videogiochi: [g], iniziati: Number(g.iniziato), completati: Number(g.fatto), roundFatti: g.progresso, roundObiettivo: g.totaleRound });

beforeEach(() => {
  vi.clearAllMocks();
  usePartitaStore.setState({ attiva: { id: 3, nome: 'Royal' } as PartitaDto });
  getVideogiochi.mockResolvedValue(dto(gioco));
});

describe('VideogiochiPage', () => {
  it('tre tocchi rapidi sul «+» arrivano tutti: una richiesta per volta, l’ultima al valore chiesto', async () => {
    let sblocca!: (g: VideogiocoDto) => void;
    impostaProgressoVideogioco.mockImplementationOnce(() => new Promise<VideogiocoDto>((res) => { sblocca = res; }))
      .mockImplementation(async (_id: number, _chiave: string, valore: number) => ({ ...gioco, progresso: valore, iniziato: true }));

    render(<MemoryRouter><VideogiochiPage /></MemoryRouter>);
    const piu = await screen.findByRole('button', { name: 'Aggiungi un round a Tycoon dello spazio' });
    fireEvent.click(piu);
    fireEvent.click(piu);
    fireEvent.click(piu);

    // La prima richiesta è ancora in volo: ne è partita una sola, ma la pagina mostra già 3.
    expect(impostaProgressoVideogioco).toHaveBeenCalledTimes(1);
    expect(impostaProgressoVideogioco).toHaveBeenCalledWith(3, 'tycoon', 1);
    expect(screen.getByText('3 di 5 round')).toBeInTheDocument();

    await act(async () => sblocca({ ...gioco, progresso: 1, iniziato: true }));
    // Sbloccata la prima, la coda insegue il valore chiesto senza passare per i valori di mezzo.
    await waitFor(() => expect(impostaProgressoVideogioco).toHaveBeenLastCalledWith(3, 'tycoon', 3));
    await waitFor(() => expect(screen.getByText('3 di 5 round')).toBeInTheDocument());
  });

  it('mostra la posizione del gioco scelto, una sola alla volta', async () => {
    render(<MemoryRouter><VideogiochiPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mostra posizione di Tycoon dello spazio' }));
    expect(screen.getByText('Dove: tycoon')).toBeInTheDocument();
    expect(screen.getAllByText(/^Dove: /)).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
    expect(screen.queryByText('Dove: tycoon')).toBeNull();
  });

  it('senza partita non offre i comandi dell’avanzamento', async () => {
    usePartitaStore.setState({ attiva: null });
    render(<MemoryRouter><VideogiochiPage /></MemoryRouter>);
    await screen.findByText('Tycoon dello spazio');
    expect(screen.queryByRole('button', { name: /Aggiungi un round/ })).toBeNull();
    // ma la posizione si guarda lo stesso: non dipende dalla partita
    expect(screen.getByRole('button', { name: 'Mostra posizione di Tycoon dello spazio' })).toBeInTheDocument();
  });
});
