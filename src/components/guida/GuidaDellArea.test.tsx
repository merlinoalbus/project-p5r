/** @vitest-environment jsdom */
// ============================================================
// Test GuidaDellArea — voci modificabili, spostabili e collegate ai pin scelti sulla mappa, dentro la voce (2026-10-01)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GuidaDellArea } from './GuidaDellArea';
import type { SceltaPin } from '../mappe/VisoreMappa';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto } from '../../types';

const { collegaPinAlPunto, spostaPunto, creaPunto, eliminaPunto, aggiornaPunto } = vi.hoisted(() => ({
  collegaPinAlPunto: vi.fn(), spostaPunto: vi.fn(), creaPunto: vi.fn(), eliminaPunto: vi.fn(), aggiornaPunto: vi.fn(),
}));
vi.mock('../../services/api', () => ({ collegaPinAlPunto, spostaPunto, creaPunto, eliminaPunto, aggiornaPunto }));
vi.mock('../../stores/notificationStore', () => ({ notifica: vi.fn() }));
/** Il visore vero è provato a parte: qui basta vedere che cosa riceve e poter «toccare» un pin. */
let ultimaScelta: SceltaPin | undefined;
vi.mock('../mappe/MappaIncorporata', () => ({
  MappaIncorporata: ({ chiave, scelta }: { chiave: string; scelta?: SceltaPin }) => { ultimaScelta = scelta; return <div>Mappa di scelta: {chiave} · {scelta?.scelti.size ?? 0} scelti</div>; },
}));

const punto = (extra: Partial<PuntoInteresseDto>): PuntoInteresseDto => ({
  chiave: 'p1', ordine: 0, tipo: 'forziere', nome: 'Forziere della sala', descrizione: 'Dietro la statua.', esauribile: true, dettagli: {}, fonte: '', stato: null, marcatore: null, pin: [], ...extra,
});
const area = (punti: PuntoInteresseDto[]): AreaDungeonDto => ({
  chiave: 'k-02', ordine: 1, nome: 'Sala Centrale', descrizione: '', mappa: true, mappe: [{ chiave: 'm-sala', nome: 'Palazzo di Kamoshida › Sala', n: 0, presi: 0, spilli: [] }], punti, dedalo: null,
});
const planimetrie: DungeonDettaglioDto['planimetrie'] = [
  { chiave: 'm-torre', nome: 'Palazzo di Kamoshida › Torre', ordine: 0, aree: [], n: 0, presi: 0, spilli: [] },
  { chiave: 'm-sala', nome: 'Palazzo di Kamoshida › Sala', ordine: 1, aree: [{ chiave: 'k-02', nome: 'Sala Centrale', ordine: 1 }], n: 0, presi: 0, spilli: [] },
];

function monta(punti: PuntoInteresseDto[]) {
  const onPuntoAggiornato = vi.fn();
  const onRicarica = vi.fn().mockResolvedValue(undefined);
  const cambiaStato = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><GuidaDellArea area={area(punti)} planimetrie={planimetrie} memento={false} partitaId={4} mappaAperta="m-sala" cambiaStato={cambiaStato} onPuntoAggiornato={onPuntoAggiornato} onRicarica={onRicarica} /></MemoryRouter>);
  return { onPuntoAggiornato, onRicarica, cambiaStato };
}

beforeEach(() => { vi.clearAllMocks(); ultimaScelta = undefined; });

it('la riga dice se la voce è collegata («N pin») o da collegare; le descrittive non dicono niente', () => {
  monta([
    punto({}),
    punto({ chiave: 'p2', tipo: 'sicura', nome: 'Stanza sicura', pin: [{ id: 9, nome: 'Sicura', tipo: 'sicura', mappa: 'm-sala', mappaNome: 'Palazzo di Kamoshida › Sala' }] }),
    punto({ chiave: 'p3', tipo: 'persona', nome: 'Negoziazione' }),
  ]);
  expect(screen.getByText(/Guida dell’area · 3 voci · 1 da collegare/)).toBeInTheDocument();
  expect(within(screen.getByRole('button', { name: /Forziere della sala/ })).getByText('da collegare')).toBeInTheDocument();
  expect(within(screen.getByRole('button', { name: /Stanza sicura/ })).getByText('1 pin')).toBeInTheDocument();
  const descrittiva = screen.getByRole('button', { name: /Negoziazione/ });
  expect(within(descrittiva).queryByText('da collegare')).toBeNull();
  expect(within(descrittiva).queryByText(/pin/)).toBeNull();
});

it('«Collega pin» apre dentro la voce la planimetria dell’area in modalità scelta: un tocco collega, un altro scollega', async () => {
  const { onPuntoAggiornato, onRicarica } = monta([punto({})]);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  const scelta = within(screen.getByLabelText('Scelta dei pin per Forziere della sala'));
  // parte dalla planimetria aperta dell'area; si può cambiare (prima quelle dell'area)
  expect(scelta.getByText('Mappa di scelta: m-sala · 0 scelti')).toBeInTheDocument();
  expect(ultimaScelta?.titolo).toBe('Forziere della sala');
  const collegato = punto({ pin: [{ id: 7, nome: 'Forziere', tipo: 'forziere', mappa: 'm-sala', mappaNome: 'Palazzo di Kamoshida › Sala' }] });
  collegaPinAlPunto.mockResolvedValue(collegato);
  ultimaScelta!.onScegli({ id: 7, nome: 'Forziere' } as Parameters<SceltaPin['onScegli']>[0]);
  await waitFor(() => expect(collegaPinAlPunto).toHaveBeenCalledWith('p1', 7, true));
  // la risposta non porta lo stato della partita (che il collegamento può cambiare): si rilegge la scheda subito, non solo a «Fatto»
  await waitFor(() => expect(onRicarica).toHaveBeenCalledTimes(1));
  expect(onPuntoAggiornato).not.toHaveBeenCalled();
  // la ricerca della voce arriva alla mappa
  fireEvent.change(scelta.getByRole('searchbox', { name: 'Cerca un pin sulla mappa' }), { target: { value: 'forz' } });
  expect(ultimaScelta?.ricerca).toBe('forz');
  // «Fatto» chiude la mappa e rilegge la scheda (gli stati delle partite si sono uniti)
  fireEvent.click(scelta.getByRole('button', { name: 'Fatto' }));
  await waitFor(() => expect(onRicarica).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByLabelText('Scelta dei pin per Forziere della sala')).toBeNull());
});

it('dalla voce si scollega un pin, e il tocco su un pin già collegato lo scollega', async () => {
  const conPin = punto({ pin: [{ id: 7, nome: 'Forziere', tipo: 'forziere', mappa: 'm-torre', mappaNome: 'Palazzo di Kamoshida › Torre' }] });
  monta([conPin]);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  expect(within(screen.getByRole('list', { name: 'Pin collegati a Forziere della sala' })).getByText('· Torre')).toBeInTheDocument();
  collegaPinAlPunto.mockResolvedValue(punto({}));
  fireEvent.click(screen.getByRole('button', { name: 'Scollega Forziere da Forziere della sala' }));
  await waitFor(() => expect(collegaPinAlPunto).toHaveBeenCalledWith('p1', 7, false));
  // la mappa di scelta parte da dove sta il suo pin (la Torre), non dalla planimetria aperta
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  expect(screen.getByText('Mappa di scelta: m-torre · 1 scelti')).toBeInTheDocument();
  ultimaScelta!.onScegli({ id: 7, nome: 'Forziere' } as Parameters<SceltaPin['onScegli']>[0]);
  await waitFor(() => expect(collegaPinAlPunto).toHaveBeenLastCalledWith('p1', 7, false));
});

it('Su e Giù spostano la voce e rileggono la scheda; ai capi sono spenti', async () => {
  const { onRicarica } = monta([punto({}), punto({ chiave: 'p2', nome: 'Seconda voce' })]);
  spostaPunto.mockResolvedValue(punto({}));
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  expect(screen.getByRole('button', { name: 'Sposta su: Forziere della sala' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Sposta giù: Forziere della sala' }));
  await waitFor(() => expect(spostaPunto).toHaveBeenCalledWith('p1', 1));
  await waitFor(() => expect(onRicarica).toHaveBeenCalled());
});

it('si aggiunge una voce in fondo all’area, e si apre per sistemarla', async () => {
  const { onRicarica } = monta([]);
  expect(screen.getByText('La guida non ha voci per quest’area: aggiungile qui sotto.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una voce' }));
  fireEvent.change(screen.getByLabelText('Nuova voce'), { target: { value: 'Forziere nascosto' } });
  creaPunto.mockResolvedValue(punto({ chiave: 'nuova', nome: 'Forziere nascosto' }));
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }));
  await waitFor(() => expect(creaPunto).toHaveBeenCalledWith('k-02', { nome: 'Forziere nascosto', tipo: 'altro' }));
  await waitFor(() => expect(onRicarica).toHaveBeenCalled());
});

it('una voce descrittiva si legge e basta: niente Ottenuto, niente «Collega pin», e non conta fra le segnate', () => {
  monta([punto({ chiave: 'p3', tipo: 'persona', nome: 'Negoziazione', stato: null })]);
  expect(screen.getByText(/Guida dell’area · 1 voce$/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Negoziazione/ }));
  expect(screen.getByText('Voce descrittiva: si legge, non si segna e non ha pin.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ottenuto' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Collega pin' })).toBeNull();
  // si corregge, si sposta e si elimina come le altre
  expect(screen.getByRole('button', { name: /^Modifica: la voce «Negoziazione»/ })).toBeInTheDocument();
});
