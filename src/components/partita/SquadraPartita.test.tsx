// @vitest-environment jsdom
// ============================================================
// Test SquadraPartita — l'impaginazione della scheda, oltre ai gesti
// ============================================================
//
// La scheda era una riga sola con sei elementi e `flex-wrap`: sul tablet mezza riga vuota e
// «Livello» scritto due volte, sotto i 640 px il nome andava a capo una lettera per riga. Qui si
// fissa la forma nuova: un'etichetta per campo, i due comandi del livello distinti, e l'interruttore
// «In squadra» come pulsante (la casella da 20 px non era toccabile col dito).
// ============================================================

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SquadraPartita } from './SquadraPartita';
import type { SquadraPartitaDto } from '../../types';

const api = vi.hoisted(() => ({ getSquadra: vi.fn(), impostaMembroSquadra: vi.fn(), impostaYen: vi.fn() }));
vi.mock('../../services/api/partite', () => api);

const squadra: SquadraPartitaDto = {
  yen: 12500,
  membri: [
    { chiave: 'joker', nome: 'Protagonista', livello: 5, esperienza: 1200, inSquadra: true, segnato: true, updatedAt: '' },
    { chiave: 'ryuji', nome: 'Ryuji Sakamoto', livello: 1, esperienza: 0, inSquadra: false, segnato: false, updatedAt: '' },
  ],
};

beforeEach(() => {
  for (const f of Object.values(api)) f.mockReset();
  api.getSquadra.mockResolvedValue(squadra);
  api.impostaMembroSquadra.mockResolvedValue(squadra);
  api.impostaYen.mockResolvedValue(squadra);
});

const scheda = async (nome: string) => {
  const voce = (await screen.findAllByRole('listitem')).find((li) => within(li).queryByTitle(nome));
  if (!voce) throw new Error(`scheda di ${nome} non trovata`);
  return within(voce);
};

it('ogni campo ha la sua etichetta, scritta una volta sola', async () => {
  render(<SquadraPartita partitaId={1} />);
  const ryuji = await scheda('Ryuji Sakamoto');
  expect(ryuji.getAllByText('Livello')).toHaveLength(1);
  expect(ryuji.getAllByText('Esperienza')).toHaveLength(1);
  // i due comandi non ripetono l'etichetta: dicono di quanto spostano
  expect(ryuji.getByRole('button', { name: 'Togli un livello a Ryuji Sakamoto' })).toHaveTextContent('−1');
  expect(ryuji.getByRole('button', { name: 'Sali di livello: Ryuji Sakamoto al livello 2' })).toHaveTextContent('+1');
});

it('il livello non segnato si distingue da un livello 1 confermato', async () => {
  render(<SquadraPartita partitaId={1} />);
  const ryuji = await scheda('Ryuji Sakamoto');
  expect(ryuji.getByText('Non ancora segnato')).toBeInTheDocument();
  const joker = await scheda('Protagonista');
  // il separatore delle migliaia lo mette `toLocaleString`, che in jsdom può non averlo
  expect(joker.getByText(/Livello 5 · 1\.?200 punti esperienza/)).toBeInTheDocument();
});

it('«In squadra» è un pulsante che dichiara il suo stato, non una casella minuscola', async () => {
  render(<SquadraPartita partitaId={1} />);
  const ryuji = await scheda('Ryuji Sakamoto');
  const interruttore = ryuji.getByRole('button', { name: 'Ryuji Sakamoto in squadra' });
  expect(interruttore).toHaveAttribute('aria-pressed', 'false');
  await userEvent.click(interruttore);
  await waitFor(() => expect(api.impostaMembroSquadra).toHaveBeenCalledWith(1, 'ryuji', { inSquadra: true }));
});

it('il protagonista non ha l’interruttore: nel gruppo c’è sempre', async () => {
  render(<SquadraPartita partitaId={1} />);
  const joker = await scheda('Protagonista');
  expect(joker.queryByRole('button', { name: /in squadra$/i })).toBeNull();
  expect(joker.getByText('Sempre in squadra')).toBeInTheDocument();
});

it('il livello si alza di un tocco e l’esperienza si scrive nel campo', async () => {
  render(<SquadraPartita partitaId={1} />);
  const ryuji = await scheda('Ryuji Sakamoto');
  await userEvent.click(ryuji.getByRole('button', { name: 'Sali di livello: Ryuji Sakamoto al livello 2' }));
  await waitFor(() => expect(api.impostaMembroSquadra).toHaveBeenCalledWith(1, 'ryuji', { deltaLivello: 1 }));
  const campo = ryuji.getByLabelText('Esperienza di Ryuji Sakamoto');
  await userEvent.clear(campo);
  await userEvent.type(campo, '340');
  await userEvent.tab();
  await waitFor(() => expect(api.impostaMembroSquadra).toHaveBeenCalledWith(1, 'ryuji', { esperienza: 340 }));
});

it('il denaro si muove per differenza, e il movimento ha un campo solo', async () => {
  render(<SquadraPartita partitaId={1} />);
  expect(await screen.findByText('12.500 ¥')).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Quanti yen sono entrati o usciti'), '1500');
  await userEvent.click(screen.getByRole('button', { name: 'Togli questi yen al gruppo' }));
  await waitFor(() => expect(api.impostaYen).toHaveBeenCalledWith(1, { delta: -1500 }));
});
