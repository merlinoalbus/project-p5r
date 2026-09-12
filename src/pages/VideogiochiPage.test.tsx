/** @vitest-environment jsdom */

// ============================================================
// VideogiochiPage — i tocchi rapidi non si perdono, la posizione è una sola, la scheda dice dove si compra e che cosa alza
// ============================================================

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
  chiave: 'tycoon', nome: 'Tycoon dello spazio', luogo: 'Soffitta di Leblanc', sedeChiave: 'yongen-jaya/leblanc', sedeNome: 'Leblanc', totaleRound: 5, progresso: 0,
  iniziato: false, fatto: false, doti: [], costo: 4800, sblocco: null, premi: null, fonte: '', condizioni: null, disponibilita: null,
  effetti: [{ effetto: { famiglia: 'dote', dote: 'conoscenza', note: 1 }, testo: 'Conoscenza ♪' }], effettiTesto: ['Conoscenza ♪'],
  negozi: [{ articolo: 'super-baron/tycoon', negozio: 'super-baron', negozioNome: 'Super Baron', prezzo: 4800 }], dettagli: 'Si gioca in soffitta.',
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
    expect(impostaProgressoVideogioco).toHaveBeenCalledTimes(1);
    expect(impostaProgressoVideogioco).toHaveBeenCalledWith(3, 'tycoon', 1);
    expect(screen.getByText('3 di 5 round')).toBeInTheDocument();

    await act(async () => sblocca({ ...gioco, progresso: 1, iniziato: true }));
    await waitFor(() => expect(impostaProgressoVideogioco).toHaveBeenLastCalledWith(3, 'tycoon', 3));
    await waitFor(() => expect(screen.getByText('3 di 5 round')).toBeInTheDocument());
  });

  it('mostra dove si compra, che cosa alza e la sede; niente fonte', async () => {
    render(<MemoryRouter><VideogiochiPage /></MemoryRouter>);
    await screen.findByText('Tycoon dello spazio');
    expect(screen.getByRole('link', { name: 'Super Baron · 4800 ¥' })).toHaveAttribute('href', '/guida/negozi/super-baron');
    expect(screen.getByText('Conoscenza ♪')).toBeInTheDocument();
    expect(screen.getByText('Leblanc')).toBeInTheDocument();
    expect(screen.getByText('Si gioca in soffitta.')).toBeInTheDocument();
    expect(screen.queryByText('fonte')).toBeNull();
  });

  it('con il gioco bloccato il «+» resta spento e dice perché', async () => {
    getVideogiochi.mockResolvedValue(dto({ ...gioco, disponibilita: { stato: 'bloccato', requisiti: [{ indice: 0, tipo: 'data', stato: 'rosso', testo: 'dal 1 settembre', dettaglio: 'oggi è il 12 aprile', manuale: false, confermato: false }] } }));
    render(<MemoryRouter><VideogiochiPage /></MemoryRouter>);
    await screen.findByText('Tycoon dello spazio');
    expect(screen.getByRole('button', { name: 'Aggiungi un round a Tycoon dello spazio' })).toBeDisabled();
    expect(screen.getByText(/Non ancora giocabile/)).toHaveTextContent('Non ancora giocabile: oggi è il 12 aprile');
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
    expect(screen.getByRole('button', { name: 'Mostra posizione di Tycoon dello spazio' })).toBeInTheDocument();
  });
});
