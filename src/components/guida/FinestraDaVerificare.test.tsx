/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test FinestraDaVerificare — i due gesti che chiudono una divergenza conservata (L4, §4.1, R4-14b)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { FinestraDaVerificare } from './FinestraDaVerificare';

const api = vi.hoisted(() => ({ impostaStatoPunto: vi.fn(), togliFattoAlPin: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

/** Il pin 583 di Kamoshida p1 (Seme della Bramosia), fatto, con la sua voce non fatta. */
const divergenza = { spilloUid: 'u583', spilloNome: 'Seme della Bramosia', mappaNome: 'Vecchio Castello 1P', voce: 'k-03/7', voceNome: 'Seme della Bramosia del cortile', infiltrazioneNome: '3. Cortile' };

beforeEach(() => vi.resetAllMocks());

it('dice che cosa vuol dire, senza gergo, con il pin fatto e la voce non fatta', () => {
  render(<FinestraDaVerificare divergenza={divergenza} partitaId={1} onChiudi={() => {}} onRisolta={() => {}} />);
  const f = within(screen.getByRole('dialog', { name: 'Da verificare' }));
  expect(f.getByText('Il pin risulta fatto ma la voce no: era così prima dell’aggiornamento.')).toBeInTheDocument();
  expect(f.getByText('Vecchio Castello 1P', { exact: false })).toBeInTheDocument();
  expect(f.getByText('3. Cortile', { exact: false })).toBeInTheDocument();
});

it('«Segna la voce» segna la voce, poi rilegge e si chiude', async () => {
  api.impostaStatoPunto.mockResolvedValue({});
  const onRisolta = vi.fn(); const onChiudi = vi.fn();
  render(<FinestraDaVerificare divergenza={divergenza} partitaId={1} onChiudi={onChiudi} onRisolta={onRisolta} />);
  fireEvent.click(screen.getByRole('button', { name: 'Segna la voce' }));
  await waitFor(() => expect(api.impostaStatoPunto).toHaveBeenCalledWith(1, 'k-03/7', 'ottenuto'));
  await waitFor(() => expect(onChiudi).toHaveBeenCalled());
  expect(onRisolta).toHaveBeenCalled();
  expect(api.togliFattoAlPin).not.toHaveBeenCalled();
});

it('«Togli il fatto al pin» toglie il fatto al pin (per uid) e lascia la voce', async () => {
  api.togliFattoAlPin.mockResolvedValue(undefined);
  const onChiudi = vi.fn();
  render(<FinestraDaVerificare divergenza={divergenza} partitaId={1} onChiudi={onChiudi} onRisolta={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Togli il fatto al pin' }));
  await waitFor(() => expect(api.togliFattoAlPin).toHaveBeenCalledWith(1, 'u583'));
  await waitFor(() => expect(onChiudi).toHaveBeenCalled());
  expect(api.impostaStatoPunto).not.toHaveBeenCalled();
});

it('se il gesto non riesce la finestra resta aperta', async () => {
  api.togliFattoAlPin.mockRejectedValue(new Error('Rete assente'));
  const onChiudi = vi.fn();
  render(<FinestraDaVerificare divergenza={divergenza} partitaId={1} onChiudi={onChiudi} onRisolta={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Togli il fatto al pin' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Togli il fatto al pin' })).toBeEnabled());
  expect(onChiudi).not.toHaveBeenCalled();
});
