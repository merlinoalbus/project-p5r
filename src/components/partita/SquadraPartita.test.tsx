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
  await userEvent.type(screen.getByLabelText('Importo in yen'), '1500');
  await userEvent.click(screen.getByRole('button', { name: 'Togli questi yen al gruppo' }));
  await waitFor(() => expect(api.impostaYen).toHaveBeenCalledWith(1, { delta: -1500 }));
});

it('«Imposta» riscrive il saldo col numero del campo, anche zero', async () => {
  api.impostaYen.mockResolvedValueOnce({ ...squadra, yen: 98765 });
  render(<SquadraPartita partitaId={1} />);
  const imposta = await screen.findByRole('button', { name: 'Imposta il denaro del gruppo a questo importo' });
  expect(imposta).toBeDisabled();
  await userEvent.type(screen.getByLabelText('Importo in yen'), '98765');
  await userEvent.click(imposta);
  await waitFor(() => expect(api.impostaYen).toHaveBeenCalledWith(1, { yen: 98765 }));
  expect(await screen.findByText(/98\.?765 ¥/)).toBeInTheDocument();
  expect(screen.getByLabelText('Importo in yen')).toHaveValue('');
  // lo zero è un saldo vero: si imposta, mentre Incassa/Spendi con zero non farebbero nulla
  await userEvent.type(screen.getByLabelText('Importo in yen'), '0');
  await userEvent.click(imposta);
  await waitFor(() => expect(api.impostaYen).toHaveBeenLastCalledWith(1, { yen: 0 }));
});

it('l’importo scritto col punto delle migliaia vale per intero: «123.450» è 123.450 ¥', async () => {
  render(<SquadraPartita partitaId={1} />);
  await userEvent.type(await screen.findByLabelText('Importo in yen'), '123.450');
  await userEvent.click(screen.getByRole('button', { name: 'Imposta il denaro del gruppo a questo importo' }));
  await waitFor(() => expect(api.impostaYen).toHaveBeenCalledWith(1, { yen: 123450 }));
});

it('anche Incassa e Spendi leggono il punto delle migliaia; senza cifre i tre pulsanti restano spenti', async () => {
  render(<SquadraPartita partitaId={1} />);
  const campo = await screen.findByLabelText('Importo in yen');
  await userEvent.type(campo, 'abc');
  for (const nome of ['Aggiungi questi yen al gruppo', 'Togli questi yen al gruppo', 'Imposta il denaro del gruppo a questo importo']) {
    expect(screen.getByRole('button', { name: nome })).toBeDisabled();
  }
  await userEvent.clear(campo);
  await userEvent.type(campo, '1.500');
  await userEvent.click(screen.getByRole('button', { name: 'Aggiungi questi yen al gruppo' }));
  await waitFor(() => expect(api.impostaYen).toHaveBeenCalledWith(1, { delta: 1500 }));
});

it('l’importo oltre il tetto del server si ferma al massimo accettato', async () => {
  render(<SquadraPartita partitaId={1} />);
  await userEvent.type(await screen.findByLabelText('Importo in yen'), '123456789');
  await userEvent.click(screen.getByRole('button', { name: 'Imposta il denaro del gruppo a questo importo' }));
  await waitFor(() => expect(api.impostaYen).toHaveBeenCalledWith(1, { yen: 9_999_999 }));
});
