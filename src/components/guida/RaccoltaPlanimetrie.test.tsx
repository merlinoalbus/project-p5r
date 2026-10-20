/** @vitest-environment jsdom */
// ============================================================
// Test RaccoltaPlanimetrie — la spunta di ogni collezionabile dice la parola del suo tipo (2026-10-03)
// ============================================================

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RaccoltaPlanimetrie } from './RaccoltaPlanimetrie';

const { impostaSpilloRaccolto } = vi.hoisted(() => ({ impostaSpilloRaccolto: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, { impostaSpilloRaccolto }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Spillo collezionabile non ancora raccolto, con uid `u<id>`, tipo e nome dati. */
const spillo = (id: number, tipo: string, nome: string) => ({ id, uid: `u${id}`, tipo, nome, colore: '#eab308', raccolto: false });

it('ogni collezionabile si segna con la parola del suo tipo: boss «Sconfitto», forziere «Aperto», tesoro «Rubato», seme «Raccolto» (scelte dell’utente)', () => {
  render(
    <MemoryRouter>
      <RaccoltaPlanimetrie partitaId={7} onRaccolto={vi.fn()} planimetrie={[{ chiave: 'm-trono', nome: 'Palazzo di Kamoshida › Trono', n: 5, presi: 0, spilli: [spillo(1, 'boss', 'Asmodeus'), spillo(2, 'miniboss', 'Guardia'), spillo(3, 'forziere', 'Forziere'), spillo(4, 'tesoro-palazzo', 'Corona'), spillo(5, 'seme-bramosia', 'Seme')] }]} />
    </MemoryRouter>,
  );
  expect(screen.getByRole('checkbox', { name: 'Asmodeus 1 di Trono sconfitto' }).closest('label')).toHaveTextContent('Sconfitto');
  expect(screen.getByRole('checkbox', { name: 'Guardia 1 di Trono sconfitto' }).closest('label')).toHaveTextContent('Sconfitto');
  expect(screen.getByRole('checkbox', { name: 'Forziere 1 di Trono aperto' }).closest('label')).toHaveTextContent('Aperto');
  expect(screen.getByRole('checkbox', { name: 'Corona 1 di Trono rubato' }).closest('label')).toHaveTextContent('Rubato');
  expect(screen.getByRole('checkbox', { name: 'Seme 1 di Trono raccolto' }).closest('label')).toHaveTextContent('Raccolto');
});

// L4 §8.6: togliere il segno a un pin può riaprire un Enigma risolto; la pagina chiede conferma prima (`primaDiTogliere`). Segnare non chiede
describe('§8.6: prima di togliere il segno a un pin si chiede alla pagina', () => {
  const montaRaccolto = (primaDiTogliere: (id: number) => Promise<boolean>) => {
    const onRaccolto = vi.fn();
    render(<MemoryRouter><RaccoltaPlanimetrie partitaId={7} onRaccolto={onRaccolto} primaDiTogliere={primaDiTogliere}
      planimetrie={[{ chiave: 'm-bib', nome: 'Palazzo di Kamoshida › Biblioteca', n: 2, presi: 1, spilli: [{ ...spillo(1, 'forziere', 'Teca'), raccolto: true }, spillo(2, 'forziere', 'Scaffale')] }]} /></MemoryRouter>);
    return { onRaccolto };
  };
  beforeEach(() => { impostaSpilloRaccolto.mockReset().mockResolvedValue({}); });

  it('«Annulla» (la pagina risponde no): niente chiamata, la spunta resta', async () => {
    const primaDiTogliere = vi.fn().mockResolvedValue(false);
    const { onRaccolto } = montaRaccolto(primaDiTogliere);
    fireEvent.click(screen.getByRole('button', { name: /Anche i raccolti/ }));
    const teca = screen.getByRole('checkbox', { name: 'Teca 1 di Biblioteca aperto' });
    fireEvent.click(teca);
    await waitFor(() => expect(primaDiTogliere).toHaveBeenCalledWith(1));
    expect(impostaSpilloRaccolto).not.toHaveBeenCalled();
    expect(onRaccolto).not.toHaveBeenCalled();
    expect(teca).toBeChecked();
  });

  it('confermato si toglie il segno; segnare non chiede niente', async () => {
    const primaDiTogliere = vi.fn().mockResolvedValue(true);
    montaRaccolto(primaDiTogliere);
    fireEvent.click(screen.getByRole('button', { name: /Anche i raccolti/ }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Teca 1 di Biblioteca aperto' }));
    await waitFor(() => expect(impostaSpilloRaccolto).toHaveBeenCalledWith(7, 1, false));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Scaffale 1 di Biblioteca aperto' }));
    await waitFor(() => expect(impostaSpilloRaccolto).toHaveBeenCalledWith(7, 2, true));
    expect(primaDiTogliere).toHaveBeenCalledTimes(1);
  });
});
