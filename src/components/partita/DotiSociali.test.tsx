// @vitest-environment jsdom
// ============================================================
// Test DotiSociali — note, modificatori, rango e punti mancanti
// ============================================================

import { act, render, screen } from '@testing-library/react';
import { DotiSociali } from './DotiSociali';
import type { DoteSocialePartitaDto, ModificaDote } from '../../types';

const { getDoti, aggiornaDote } = vi.hoisted(() => ({ getDoti: vi.fn(), aggiornaDote: vi.fn() }));
vi.mock('../../services/api', () => ({ getDoti, aggiornaDote }));

const ranghiFascino = [
  { rango: 1, nome: 'Indifferente', soglia: 0 },
  { rango: 2, nome: 'Interessante', soglia: 6 },
  { rango: 3, nome: 'Affascinante', soglia: 52 },
  { rango: 4, nome: 'Carismatico', soglia: 92 },
  { rango: 5, nome: 'Irresistibile', soglia: 132 },
];

function dote(punti: number, rango: number, nomeRango: string, sogliaProssima: number | null): DoteSocialePartitaDto {
  return { chiave: 'fascino', nome: 'Fascino', ordine: 1, punti, rango, nomeRango, sogliaProssima, mancanti: sogliaProssima === null ? null : sogliaProssima - punti, ranghi: ranghiFascino, updatedAt: null };
}

beforeEach(() => {
  getDoti.mockReset();
  aggiornaDote.mockReset();
});

describe('DotiSociali', () => {
  it('mostra rango, punti mancanti e invia le note al backend con i modificatori', async () => {
    getDoti.mockResolvedValue([dote(0, 1, 'Indifferente', 6)]);
    aggiornaDote.mockResolvedValue(dote(7, 2, 'Interessante', 52));
    render(<DotiSociali partitaId={1} />);

    expect(await screen.findByText('Rango 1 · Indifferente')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Stella delle Doti sociali: Fascino: 12%/ })).toBeInTheDocument();
    expect(screen.getByText(/Mancano/)).toHaveTextContent('Mancano 6 punti al rango 2 · Interessante (6)');
    // anteprime senza modificatori: 2 / 3 / 5
    expect(screen.getByLabelText('Fascino: aggiungi 1 nota (2 punti)')).toBeInTheDocument();
    expect(screen.getByLabelText('Fascino: aggiungi 3 note (5 punti)')).toBeInTheDocument();

    // fortuna ×1,5 per difetto: 3 / 4 / 7; libro: 3 note = 7 (con fortuna 10)
    await act(async () => { screen.getByRole('button', { name: 'Fortuna ×1,5: lettura della fortuna di Chihaya' }).click(); });
    expect(screen.getByLabelText('Fascino: aggiungi 2 note (4 punti)')).toBeInTheDocument();
    await act(async () => { screen.getByRole('button', { name: 'Libro: 3 note valgono 7 punti' }).click(); });
    expect(screen.getByLabelText('Fascino: aggiungi 3 note (10 punti)')).toBeInTheDocument();

    await act(async () => { screen.getByLabelText('Fascino: aggiungi 3 note (10 punti)').click(); });
    expect(aggiornaDote).toHaveBeenCalledWith(1, 'fascino', { note: 3, libro: true, fortuna: true, cinema: false } satisfies ModificaDote);
    expect(await screen.findByText('Rango 2 · Interessante')).toBeInTheDocument();
    expect(screen.getByText(/Mancano/)).toHaveTextContent('Mancano 45 punti al rango 3 · Affascinante (52)');
  });

  it('«Anima da cineasta» alza di uno scalino l’anteprima e viene inviato al backend', async () => {
    getDoti.mockResolvedValue([dote(0, 1, 'Indifferente', 6)]);
    aggiornaDote.mockResolvedValue(dote(3, 1, 'Indifferente', 6));
    render(<DotiSociali partitaId={1} />);
    await screen.findByText('Rango 1 · Indifferente');
    await act(async () => { screen.getByRole('button', { name: /Anima da cineasta/ }).click(); });
    // 2→3, 3→5, 5→7
    expect(screen.getByLabelText('Fascino: aggiungi 1 nota (3 punti)')).toBeInTheDocument();
    expect(screen.getByLabelText('Fascino: aggiungi 2 note (5 punti)')).toBeInTheDocument();
    expect(screen.getByLabelText('Fascino: aggiungi 3 note (7 punti)')).toBeInTheDocument();
    // con la fortuna, dopo il cinema: 3→4, 5→7, 7→10
    await act(async () => { screen.getByRole('button', { name: 'Fortuna ×1,5: lettura della fortuna di Chihaya' }).click(); });
    expect(screen.getByLabelText('Fascino: aggiungi 3 note (10 punti)')).toBeInTheDocument();
    await act(async () => { screen.getByLabelText('Fascino: aggiungi 1 nota (4 punti)').click(); });
    expect(aggiornaDote).toHaveBeenCalledWith(1, 'fascino', { note: 1, libro: false, fortuna: true, cinema: true } satisfies ModificaDote);
  });

  it('al rango massimo non mostra soglie e disabilita il −1 a zero punti', async () => {
    getDoti.mockResolvedValue([{ ...dote(140, 5, 'Irresistibile', null), punti: 0 }]);
    render(<DotiSociali partitaId={1} />);
    expect(await screen.findByText('Rango massimo raggiunto.')).toBeInTheDocument();
    expect(screen.getByLabelText('Fascino: togli un punto')).toBeDisabled();
  });

  it('mostra l\'errore del backend senza alterare i dati', async () => {
    getDoti.mockResolvedValue([dote(3, 1, 'Indifferente', 6)]);
    aggiornaDote.mockRejectedValue(new Error('Partita non trovata'));
    render(<DotiSociali partitaId={1} />);
    await screen.findByText('Rango 1 · Indifferente');
    await act(async () => { screen.getByLabelText('Fascino: aggiungi un punto').click(); });
    expect(screen.getByText(/Mancano/)).toHaveTextContent('Mancano 3 punti');
  });
});
