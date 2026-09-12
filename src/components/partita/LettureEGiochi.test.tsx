/** @vitest-environment jsdom */
// ============================================================
// Test LettureEGiochi — il gesto dentro la partita: al cinema senza tetto, con la riga bloccata il «+» resta spento
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LettureEGiochi } from './LettureEGiochi';
import type { FilmDto, LibroDto, VideogiocoDto } from '../../types';

const { getLibri, getFilm, getVideogiochi, impostaProgressoFilm, impostaProgressoLibro, impostaProgressoVideogioco } = vi.hoisted(() => ({
  getLibri: vi.fn(), getFilm: vi.fn(), getVideogiochi: vi.fn(), impostaProgressoFilm: vi.fn(), impostaProgressoLibro: vi.fn(), impostaProgressoVideogioco: vi.fn(),
}));
vi.mock('../../services/api/compendio', () => ({ getLibri, getFilm, getVideogiochi }));
vi.mock('../../services/api/partite', () => ({ impostaProgressoFilm, impostaProgressoLibro, impostaProgressoVideogioco }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));

const libro = { chiave: 'l', nome: 'Libro', nomeIt: null, dove: 'Taiheido', progresso: 0, totaleSessioni: 2, fatto: false, disponibilita: { stato: 'bloccato', requisiti: [{ indice: 0, tipo: 'data', stato: 'rosso', testo: 'dal 18 aprile', dettaglio: 'oggi è il 12 aprile', manuale: false, confermato: false }] } } as unknown as LibroDto;
const cinema = { chiave: 'c', nome: 'Film', nomeIt: null, dove: 'cinema', progresso: 1, totaleSessioni: 1, fatto: true, disponibilita: null } as unknown as FilmDto;
const gioco = { chiave: 'g', nome: 'Gioco', luogo: 'Soffitta', sedeNome: 'Leblanc', progresso: 0, totaleRound: 3, fatto: false, disponibilita: null } as unknown as VideogiocoDto;

it('al cinema il «+» resta attivo anche a titolo finito; con il libro bloccato resta spento e lo dice', async () => {
  getLibri.mockResolvedValue({ libri: [libro] });
  getFilm.mockResolvedValue({ film: [cinema] });
  getVideogiochi.mockResolvedValue({ videogiochi: [gioco] });
  impostaProgressoFilm.mockResolvedValue({ ...cinema, progresso: 2 });
  render(<MemoryRouter><LettureEGiochi partitaId={3} /></MemoryRouter>);
  const libri = await screen.findByRole('region', { name: 'Libri' });
  const piuLibro = within(libri).getByRole('button', { name: 'Aggiungi a Libro' });
  expect(piuLibro).toBeDisabled();
  expect(piuLibro).toHaveAttribute('title', 'Non ancora: oggi è il 12 aprile');
  expect(within(libri).getByText('Non ancora')).toBeInTheDocument();

  const film = screen.getByRole('region', { name: 'Film e DVD' });
  fireEvent.click(within(film).getByRole('button', { name: /Mostra i completati/ }));
  const piuFilm = within(film).getByRole('button', { name: 'Aggiungi a Film' });
  expect(piuFilm).toBeEnabled();
  expect(within(film).getByText('1 visioni')).toBeInTheDocument();
  fireEvent.click(piuFilm);
  await waitFor(() => expect(impostaProgressoFilm).toHaveBeenCalledWith(3, 'c', 2));

  const giochi = screen.getByRole('region', { name: 'Videogiochi' });
  expect(within(giochi).getByRole('button', { name: 'Aggiungi a Gioco' })).toBeEnabled();
  expect(within(giochi).getByText('0/3 round')).toBeInTheDocument();
});
