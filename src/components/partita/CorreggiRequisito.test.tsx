/** @vitest-environment jsdom */
// ============================================================
// Test CorreggiRequisito — un requisito rimasto su una Richiesta che non c'è più: un'altra Richiesta al suo posto, o lo si toglie
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce } from '../../../test/selettore';
import { CorreggiRequisito } from './CorreggiRequisito';

const api = vi.hoisted(() => ({ getRichieste: vi.fn(), correggiRequisitoRichiesta: vi.fn(), togliRequisitoRichiesta: vi.fn() }));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));

const requisito = { indice: 0, tipo: 'richiesta', testo: 'Completare la richiesta «Un fidanzato violento»', stato: 'grigio' as const, dettaglio: 'La Richiesta «Un fidanzato violento» non c’è più: correggi quel che la cita', manuale: false, confermato: false };

/** Monta la finestra per Chihaya, rango 1, e restituisce i richiami. */
function monta() {
  const onChiudi = vi.fn();
  const onCorretto = vi.fn().mockResolvedValue(undefined);
  render(<CorreggiRequisito confidente={{ chiave: 'chihaya', nome: 'Chihaya Mifune' }} rango={1} requisito={requisito} onChiudi={onChiudi} onCorretto={onCorretto} />);
  return { onChiudi, onCorretto };
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getRichieste.mockResolvedValue({ richieste: [{ chiave: 'lo-zio-ingordo', nome: 'Lo zio ingordo', areaNome: 'Dedalo di Adyeshach' }], jose: null, dedali: [], completate: 0, totale: 1, collocazioni: [] });
});

it('mostra il requisito; «Salva» si accende dopo aver scelto la Richiesta e la manda', async () => {
  const { onChiudi, onCorretto } = monta();
  const finestra = await screen.findByRole('dialog', { name: 'Correggi il requisito · Chihaya Mifune, rango 1' });
  expect(within(finestra).getByText(/non c’è più/)).toBeInTheDocument();
  expect(within(finestra).getByRole('button', { name: /^Salva/ })).toBeDisabled();
  // in linea: in una finestra così breve la tendina sovrapposta restava tagliata dal corpo scorrevole
  expect(within(finestra).getByRole('combobox', { name: 'Richiesta da citare al suo posto' }).closest('.selettore')).toHaveClass('selettore--in-linea');
  scegliVoce('Richiesta da citare al suo posto', /^Lo zio ingordo/);
  api.correggiRequisitoRichiesta.mockResolvedValue(undefined);
  fireEvent.click(within(finestra).getByRole('button', { name: /^Salva/ }));
  await waitFor(() => expect(api.correggiRequisitoRichiesta).toHaveBeenCalledWith('chihaya', 1, 0, 'lo-zio-ingordo'));
  await waitFor(() => expect(onCorretto).toHaveBeenCalled());
  expect(onChiudi).toHaveBeenCalled();
});

it('«Togli il requisito» chiede conferma; «No» torna indietro, «Confermo» lo toglie', async () => {
  const { onCorretto } = monta();
  await screen.findByRole('dialog');
  fireEvent.click(screen.getByRole('button', { name: 'Togli il requisito' }));
  const conferma = screen.getByRole('region', { name: 'Conferma: togliere il requisito' });
  expect(conferma).toHaveTextContent('il rango 1 di Chihaya Mifune non lo chiederà più');
  fireEvent.click(within(conferma).getByRole('button', { name: 'No' }));
  expect(api.togliRequisitoRichiesta).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Togli il requisito' }));
  api.togliRequisitoRichiesta.mockResolvedValue(undefined);
  fireEvent.click(within(screen.getByRole('region', { name: 'Conferma: togliere il requisito' })).getByRole('button', { name: 'Confermo' }));
  await waitFor(() => expect(api.togliRequisitoRichiesta).toHaveBeenCalledWith('chihaya', 1, 0));
  await waitFor(() => expect(onCorretto).toHaveBeenCalled());
});
