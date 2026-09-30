/** @vitest-environment jsdom */
// ============================================================
// Test ProgressiPartita — calcolati dalla partita (sola lettura, tre stati) e da segnare (eventi, attività, punti)
// ============================================================

import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProgressiPartita } from './ProgressiPartita';
import type { ProgressiPartitaDto } from '../../types';

const { getProgressiPartita, impostaEventoStoria, impostaAttivitaSvolta, impostaPuntiNegozio } = vi.hoisted(() => ({
  getProgressiPartita: vi.fn(), impostaEventoStoria: vi.fn(), impostaAttivitaSvolta: vi.fn(), impostaPuntiNegozio: vi.fn(),
}));
vi.mock('../../services/api/condizioni', () => ({ getProgressiPartita, impostaEventoStoria, impostaAttivitaSvolta, impostaPuntiNegozio }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../../stores/suggerimentiStore', () => ({ useSuggerimentiStore: { getState: () => ({ invalida: vi.fn() }) } }));

const dati: ProgressiPartitaDto = {
  eventi: [
    { chiave: 'mansarda-pulita', nome: 'Mansarda del Leblanc pulita', origine: 'manuale', avvenuto: false },
    { chiave: 'evento-makoto', nome: 'Evento con Makoto (entra in squadra)', origine: 'calcolato', avvenuto: true, membro: 'makoto', membroNome: 'Makoto Niijima' },
    { chiave: 'evento-futaba', nome: 'Evento con Futaba (entra in squadra)', origine: 'calcolato', avvenuto: false, membro: 'futaba', membroNome: 'Futaba Sakura' },
    { chiave: 'evento-haru', nome: 'Evento con Haru (entra in squadra)', origine: 'calcolato', avvenuto: null, membro: 'haru', membroNome: 'Haru Okumura' },
  ],
  attivita: [
    { chiave: 'biliardo', nome: 'Biliardo', tipo: 'mini-gioco', volte: 1, effettiTurno: [] },
    { chiave: 'lavoro-rafflesia', nome: 'Fioraio Rafflesia', tipo: 'lavoro', volte: 0, effettiTurno: ['1° turno: Gentilezza, 2 note', 'Dal 2° turno: Gentilezza, 2 note'] },
  ],
  puntiNegozio: [{ negozio: 'vestiti-usati-kichijoji', nome: 'Vestiti usati', programma: 'Punti del negozio', unita: 'punti', punti: 20 }],
  rangoCliente: [{ negozio: 'tanaka-affari-loschi', nome: 'Affari loschi di Tanaka', programma: 'Grado cliente', spesa: 12000, rango: { chiave: 'nero', nome: 'Nero' }, prossimo: { chiave: 'oscuro', nome: 'Oscuro', spesa: 50000 } }],
  contatori: [{ chiave: 'libri-letti', nome: 'Libri letti', valore: 3 }],
};

beforeEach(() => { vi.clearAllMocks(); getProgressiPartita.mockResolvedValue(dati); });

it('separa i calcolati (sola lettura, tre stati) da quel che si segna a mano', async () => {
  render(<MemoryRouter><ProgressiPartita partitaId={1} /></MemoryRouter>);
  const squadra = await screen.findByRole('region', { name: 'Eventi «entra in squadra»' });
  // tre stati, nessuna spunta
  expect(within(squadra).getByRole('img', { name: 'sì' })).toBeInTheDocument();
  expect(within(squadra).getByRole('img', { name: 'no' })).toBeInTheDocument();
  expect(within(squadra).getByRole('img', { name: 'non segnato' })).toBeInTheDocument();
  expect(within(squadra).queryByRole('checkbox')).toBeNull();
  expect(within(squadra).getByRole('link', { name: 'Makoto Niijima in squadra' })).toHaveAttribute('href', '/partita?scheda=squadra');
  expect(within(squadra).getByText('Haru Okumura: non segnato')).toBeInTheDocument();
  // il grado cliente con spesa e prossima soglia; i contatori
  const rango = screen.getByRole('region', { name: 'Grado cliente' });
  expect(within(rango).getByText('Nero')).toBeInTheDocument();
  expect(within(rango).getByText(/spesi 12.000 ¥ · Oscuro da 50.000 ¥/)).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Contatori' })).getByText('3')).toBeInTheDocument();
  // da segnare: solo l'evento manuale ha la spunta
  const eventi = screen.getByRole('region', { name: 'Eventi di storia' });
  expect(within(eventi).getAllByRole('checkbox')).toHaveLength(1);
  expect(within(eventi).queryByText(/Makoto/)).toBeNull();
  impostaEventoStoria.mockResolvedValue({ ...dati, eventi: dati.eventi.map((e) => (e.chiave === 'mansarda-pulita' ? { ...e, avvenuto: true } : e)) });
  await act(async () => { fireEvent.click(within(eventi).getByRole('checkbox')); });
  expect(impostaEventoStoria).toHaveBeenCalledWith(1, 'mansarda-pulita', true);
  expect(await within(eventi).findByText('avvenuto')).toBeInTheDocument();
  // attività per volte e punti del negozio con programma manuale
  impostaAttivitaSvolta.mockResolvedValue(dati);
  fireEvent.click(screen.getByRole('button', { name: 'Biliardo: una volta in più' }));
  expect(impostaAttivitaSvolta).toHaveBeenCalledWith(1, 'biliardo', 2);
  expect(screen.getByText('Punti del negozio · punti')).toBeInTheDocument();
  impostaPuntiNegozio.mockResolvedValue(dati);
  fireEvent.click(screen.getByRole('button', { name: 'Vestiti usati: dieci punti in più' }));
  expect(impostaPuntiNegozio).toHaveBeenCalledWith(1, 'vestiti-usati-kichijoji', 30);
});

it('un lavoro dice che cosa dà ogni turno, e il + ricorda le Doti da segnare a mano (in meno se si toglie)', async () => {
  const { notifica } = await import('../../stores/notificationStore');
  render(<MemoryRouter><ProgressiPartita partitaId={1} /></MemoryRouter>);
  const attivita = await screen.findByRole('region', { name: 'Attività svolte' });
  expect(within(attivita).getByText('1° turno: Gentilezza, 2 note · Dal 2° turno: Gentilezza, 2 note')).toBeInTheDocument();
  expect(within(attivita).getByText(/ti ricorda le Doti che dà, da segnare tu nella scheda Doti/)).toBeInTheDocument();
  impostaAttivitaSvolta.mockResolvedValue({ ...dati, daSegnare: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: 3 }] });
  await act(async () => { fireEvent.click(within(attivita).getByRole('button', { name: 'Fioraio Rafflesia: una volta in più' })); });
  expect(impostaAttivitaSvolta).toHaveBeenCalledWith(1, 'lavoro-rafflesia', 1);
  expect(notifica).toHaveBeenCalledWith('info', 'Da segnare nelle Doti: Gentilezza +3', 7000);
  impostaAttivitaSvolta.mockResolvedValue({ ...dati, daSegnare: [{ chiave: 'gentilezza', nome: 'Gentilezza', delta: -3 }] });
  await act(async () => { fireEvent.click(within(attivita).getByRole('button', { name: 'Fioraio Rafflesia: una volta in più' })); });
  expect(notifica).toHaveBeenLastCalledWith('info', 'Da segnare nelle Doti: Gentilezza −3', 7000);
});

it('un evento chiesto da un Confidente dice quale rango sblocca', async () => {
  getProgressiPartita.mockResolvedValue({ ...dati, eventi: [...dati.eventi, { chiave: 'caffe-leblanc', nome: 'Caffè preparato al Leblanc', origine: 'manuale', avvenuto: false, serveA: ['Sojiro Sakura, rango 3'] }] });
  render(<MemoryRouter><ProgressiPartita partitaId={1} /></MemoryRouter>);
  const eventi = await screen.findByRole('region', { name: 'Eventi di storia' });
  const riga = within(eventi).getByRole('checkbox', { name: /Caffè preparato al Leblanc/ });
  expect(riga).toHaveAccessibleName(/Sblocca: Sojiro Sakura, rango 3/);
  // la mansarda non la chiede nessun Confidente: niente riga «Sblocca»
  expect(within(eventi).getAllByText(/^Sblocca:/)).toHaveLength(1);
  impostaEventoStoria.mockResolvedValue(dati);
  await act(async () => { fireEvent.click(riga); });
  expect(impostaEventoStoria).toHaveBeenCalledWith(1, 'caffe-leblanc', true);
});
