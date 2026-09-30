// @vitest-environment jsdom
// ============================================================
// Test MeteoAlCambioGiorno — cambiato il giorno della partita, la scelta del meteo del giorno nuovo
// ============================================================

import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MeteoAlCambioGiorno } from './MeteoAlCambioGiorno';
import { usePartitaStore } from '../../stores/partitaStore';
import { useMeteoStore } from '../../stores/meteoStore';
import { seGiornoAvanzato } from '../../utils/giornoAvanzato';
import type { MeteoGiornoDto, PartitaDto } from '../../types';

const api = vi.hoisted(() => ({ getMeteoGiorno: vi.fn(), impostaMeteoGiorno: vi.fn() }));
vi.mock('../../services/api', () => api);
const notifica = vi.hoisted(() => vi.fn());
vi.mock('../../stores/notificationStore', () => ({ notifica }));
vi.mock('../../stores/suggerimentiStore', () => ({ useSuggerimentiStore: { getState: () => ({ invalida: vi.fn() }) } }));

const partita = (dataGioco: string, id = 4) => ({ id, nome: 'Prova', dataGioco, fasciaGioco: 'giorno', meteoOra: null } as unknown as PartitaDto);
const meteo: MeteoGiornoDto = {
  dataGioco: '04-13', testoGuida: 'Nuvoloso',
  giorno: { meteo: 'nuvoloso', origine: 'guida', guida: 'nuvoloso', allerte: [] },
  sera: { meteo: 'nuvoloso', origine: 'guida', guida: 'nuvoloso', allerte: [{ chiave: 'allerta-polline', nome: 'Allerta polline', effetti: ['I nemici possono comparire addormentati.'] }] },
};

beforeEach(() => {
  api.getMeteoGiorno.mockReset().mockResolvedValue(meteo);
  api.impostaMeteoGiorno.mockReset();
  notifica.mockReset();
  useMeteoStore.setState({ richiesta: null, versione: 0 });
  usePartitaStore.setState({ partite: [partita('04-12')], attiva: partita('04-12') });
});

it('al primo caricamento non chiede niente; cambiato il giorno, chiede il meteo del giorno nuovo con le allerte', async () => {
  render(<MeteoAlCambioGiorno />);
  expect(screen.queryByRole('dialog')).toBeNull();
  act(() => usePartitaStore.getState().aggiornaLocale(partita('04-13')));
  const finestra = await screen.findByRole('dialog', { name: 'Che tempo fa il 13 aprile?' });
  expect(api.getMeteoGiorno).toHaveBeenCalledWith(4, '04-13');
  expect(await within(finestra).findByText(/La guida dice «Nuvoloso»/)).toBeInTheDocument();
  expect(within(finestra).getByText('Allerta polline')).toBeInTheDocument();
  expect(within(finestra).getByRole('group', { name: 'Di giorno: nuvoloso, dalla guida' })).toBeInTheDocument();
});

it('un tocco segna il meteo: la partita dello store e la versione del meteo si aggiornano; «Fatto» chiude', async () => {
  const segnato = { ...meteo, giorno: { ...meteo.giorno, meteo: 'pioggia' as const, origine: 'partita' as const } };
  api.impostaMeteoGiorno.mockResolvedValue({ meteo: segnato, partita: { ...partita('04-13'), meteoOra: 'pioggia' } });
  render(<MeteoAlCambioGiorno />);
  act(() => usePartitaStore.getState().aggiornaLocale(partita('04-13')));
  const finestra = await screen.findByRole('dialog', { name: 'Che tempo fa il 13 aprile?' });
  await userEvent.click(await within(finestra).findByRole('button', { name: 'Di giorno: Pioggia' }));
  await waitFor(() => expect(api.impostaMeteoGiorno).toHaveBeenCalledWith(4, '04-13', { giorno: 'pioggia' }));
  await waitFor(() => expect(usePartitaStore.getState().attiva?.meteoOra).toBe('pioggia'));
  expect(useMeteoStore.getState().versione).toBe(1);
  expect(within(finestra).getByRole('button', { name: 'Di giorno: Pioggia (segnato: tocca per tornare alla guida)' })).toHaveAttribute('aria-pressed', 'true');
  await userEvent.click(within(finestra).getByRole('button', { name: 'Fatto' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('passando a un’altra partita non chiede niente', async () => {
  render(<MeteoAlCambioGiorno />);
  act(() => usePartitaStore.setState({ attiva: partita('06-01', 9) }));
  await new Promise((r) => setTimeout(r, 20));
  expect(screen.queryByRole('dialog')).toBeNull();
});

it('il giorno avanzato da una spunta allinea lo store, lo dice, e fa chiedere il meteo', async () => {
  render(<MeteoAlCambioGiorno />);
  act(() => seGiornoAvanzato({ giornoAvanzato: { da: '04-12', a: '04-13', partita: partita('04-13') } }));
  expect(usePartitaStore.getState().attiva?.dataGioco).toBe('04-13');
  expect(notifica).toHaveBeenCalledWith('success', 'Giornata del 12 aprile completata: la partita passa al 13 aprile, di giorno.', 6000);
  expect(await screen.findByRole('dialog', { name: 'Che tempo fa il 13 aprile?' })).toBeInTheDocument();
  // senza passaggio non fa niente
  notifica.mockReset();
  seGiornoAvanzato({});
  expect(notifica).not.toHaveBeenCalled();
});
