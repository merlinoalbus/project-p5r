/** @vitest-environment jsdom */
// ============================================================
// Test GuidaDellArea — voci modificabili, spostabili e collegate ai pin scelti sulla mappa, dentro la voce (2026-10-01)
// ============================================================

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce, vociSelettore } from '../../../test/selettore';
import { MemoryRouter } from 'react-router-dom';
import { GuidaDellArea } from './GuidaDellArea';
import type { SceltaPin } from '../mappe/VisoreMappa';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto } from '../../types';

const { collegaPinAlPunto, spostaPunto, creaPunto, eliminaPunto, aggiornaPunto } = vi.hoisted(() => ({
  collegaPinAlPunto: vi.fn(), spostaPunto: vi.fn(), creaPunto: vi.fn(), eliminaPunto: vi.fn(), aggiornaPunto: vi.fn(),
}));
vi.mock('../../services/api', (vero) => moduloApi(vero, { collegaPinAlPunto, spostaPunto, creaPunto, eliminaPunto, aggiornaPunto }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero));
/** Il visore vero è provato a parte: qui basta vedere che cosa riceve e poter «toccare» un pin. */
let ultimaScelta: SceltaPin | undefined;
vi.mock('../mappe/MappaIncorporata', () => ({
  MappaIncorporata: ({ chiave, scelta }: { chiave: string; scelta?: SceltaPin }) => { ultimaScelta = scelta; return <div>Mappa di scelta: {chiave} · {scelta?.scelti.size ?? 0} scelti</div>; },
}));

/** Punto d'interesse di prova (un forziere esauribile, non segnato e senza pin) con i campi di `extra` che sovrascrivono i predefiniti. */
const punto = (extra: Partial<PuntoInteresseDto>): PuntoInteresseDto => ({
  chiave: 'p1', ordine: 0, tipo: 'forziere', nome: 'Forziere della sala', descrizione: 'Dietro la statua.', esauribile: true, dettagli: {}, fonte: '', stato: null, marcatore: null, pin: [], contenitore: null, ...extra,
});
/** L'area «Sala Centrale» (k-02) del Palazzo di Kamoshida, con la sua planimetria m-sala e i punti dati. */
const area = (punti: PuntoInteresseDto[]): AreaDungeonDto => ({
  chiave: 'k-02', ordine: 1, nome: 'Sala Centrale', descrizione: '', mappa: true, mappe: [{ chiave: 'm-sala', nome: 'Palazzo di Kamoshida › Sala', n: 0, presi: 0, spilli: [] }], punti, dedalo: null,
});
const planimetrie: DungeonDettaglioDto['planimetrie'] = [
  { chiave: 'm-torre', nome: 'Palazzo di Kamoshida › Torre', ordine: 0, aree: [], n: 0, presi: 0, spilli: [] },
  { chiave: 'm-sala', nome: 'Palazzo di Kamoshida › Sala', ordine: 1, aree: [{ chiave: 'k-02', nome: 'Sala Centrale', ordine: 1 }], n: 0, presi: 0, spilli: [] },
];

/** Disegna la guida dell'area con i punti dati (partita 4, planimetria m-sala aperta) e restituisce i mock di aggiornamento, ricarica e cambio di stato. */
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
    punto({ chiave: 'p3', tipo: 'altro', nome: 'Negoziazione' }),
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
  monta([punto({ chiave: 'p3', tipo: 'altro', nome: 'Negoziazione', stato: null })]);
  expect(screen.getByText(/Guida dell’area · 1 voce$/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Negoziazione/ }));
  expect(screen.getByText('Voce descrittiva: si legge, non si segna e non ha pin.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Ottenuto' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Collega pin' })).toBeNull();
  // si corregge, si sposta e si elimina come le altre
  expect(screen.getByRole('button', { name: /^Modifica: la voce «Negoziazione»/ })).toBeInTheDocument();
});

it('i tipi si chiamano come li vuole l’utente, e Persona e Storia si collegano e si segnano senza dirsi «da collegare»', () => {
  monta([
    punto({ chiave: 'a', tipo: 'sicura', nome: 'Safe Room' }),
    punto({ chiave: 'b', tipo: 'volonta', nome: 'Seme rosso' }),
    punto({ chiave: 'c', tipo: 'forziere-chiuso', nome: 'Forziere chiuso a chiave' }),
    punto({ chiave: 'd', tipo: 'forziere', nome: 'Forziere comune' }),
    punto({ chiave: 'e', tipo: 'ombra-sciagura', nome: 'Furia nera' }),
    punto({ chiave: 'f', tipo: 'porta', nome: 'Porta del caveau' }),
    punto({ chiave: 'g', tipo: 'persona', nome: 'Leanan Sidhe' }),
    punto({ chiave: 'h', tipo: 'storia', nome: 'Si apre la torre' }),
  ]);
  /** Il pulsante della riga di voce il cui nome accessibile comincia con `nome`. */
  const riga = (nome: string) => screen.getByRole('button', { name: new RegExp(`^${nome}`) });
  expect(riga('Safe Room')).toHaveTextContent('Stanze sicure');
  expect(riga('Seme rosso')).toHaveTextContent('Semi della bramosia');
  expect(riga('Forziere chiuso a chiave')).toHaveTextContent('Forziere raro');
  expect(riga('Forziere comune')).toHaveTextContent('Forziere normale');
  expect(riga('Furia nera')).toHaveTextContent('Nemico');
  // una porta senza pin è «da collegare»; Persona e Storia no (il pin non gli manca)
  expect(riga('Porta del caveau')).toHaveTextContent('da collegare');
  expect(riga('Leanan Sidhe')).not.toHaveTextContent('da collegare');
  expect(riga('Si apre la torre')).not.toHaveTextContent('da collegare');
  // ma si segnano e si collegano
  fireEvent.click(riga('Si apre la torre'));
  expect(screen.getByRole('button', { name: 'Ottenuto' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Collega pin' })).toBeInTheDocument();
});

describe('l’Enigma contiene i suoi passi (095)', () => {
  const enigma = punto({ chiave: 'e1', tipo: 'puzzle', nome: 'La porta della torre', esauribile: false });
  const leva = punto({ chiave: 'e1-a', ordine: 0, tipo: 'meccanismo', nome: 'Tira la leva', esauribile: false, contenitore: 'e1', stato: 'ottenuto' });
  const porta = punto({ chiave: 'e1-b', ordine: 1, tipo: 'porta', nome: 'Apri la porta', esauribile: false, contenitore: 'e1' });
  const nota = punto({ chiave: 'e1-c', ordine: 2, tipo: 'altro', nome: 'Come si fa', esauribile: false, contenitore: 'e1' });

  it('i passi stanno dentro l’Enigma, non fra le voci dell’area; la riga dice quanti sono fatti e niente «da collegare»', () => {
    monta([punto({}), enigma, leva, porta, nota]);
    const voci = within(screen.getByRole('list', { name: 'Voci della guida di Sala Centrale' }));
    /** Riletto a ogni uso: il sotto-elenco dei passi dell'Enigma «La porta della torre». */
    const passi = () => within(screen.getByRole('list', { name: 'Passi di La porta della torre' }));
    expect(passi().getByRole('button', { name: /Apri la porta/ })).toBeInTheDocument();
    // un passo segnato si nasconde come ogni voce segnata, finché non si chiedono anche le segnate
    expect(passi().queryByRole('button', { name: /Tira la leva/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    expect(passi().getByRole('button', { name: /Tira la leva/ })).toBeInTheDocument();
    // le righe dirette dell'elenco dell'area: il forziere e l'Enigma (i passi stanno nel sotto-elenco)
    const dirette = [...screen.getByRole('list', { name: 'Voci della guida di Sala Centrale' }).children].map((li) => li.querySelector('button')?.textContent ?? '');
    expect(dirette).toHaveLength(2);
    const rigaEnigma = voci.getByRole('button', { name: /La porta della torre/ });
    // la voce descrittiva non conta: 1 fatto su 2 da segnare
    expect(rigaEnigma).toHaveTextContent('1/2 passi');
    expect(within(rigaEnigma).queryByText('da collegare')).toBeNull();
  });

  it('aperto, l’Enigma coi passi non collega pin e offre «Aggiungi un passo»; il passo nasce dentro di lui', async () => {
    const { onRicarica } = monta([enigma, leva, porta]);
    fireEvent.click(screen.getByRole('button', { name: /La porta della torre/ }));
    expect(screen.queryByRole('button', { name: 'Collega pin' })).toBeNull();
    expect(screen.getByText(/Risolto quando i suoi passi sono fatti/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi un passo a La porta della torre' }));
    fireEvent.change(screen.getByLabelText('Nuovo passo'), { target: { value: 'Prendi la chiave' } });
    creaPunto.mockResolvedValue(punto({ chiave: 'e1-d', nome: 'Prendi la chiave', contenitore: 'e1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi' }));
    await waitFor(() => expect(creaPunto).toHaveBeenCalledWith('k-02', { nome: 'Prendi la chiave', tipo: 'meccanismo', contenitore: 'e1' }));
    await waitFor(() => expect(onRicarica).toHaveBeenCalled());
  });

  it('Su e Giù di un passo si muovono fra i passi', () => {
    monta([punto({}), enigma, leva, porta]);
    fireEvent.click(screen.getByRole('button', { name: /Apri la porta/ }));
    // ultimo dei passi: Giù spento anche se l'area ha altre voci
    expect(screen.getByRole('button', { name: 'Sposta giù: Apri la porta' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sposta su: Apri la porta' })).not.toBeDisabled();
  });

  it('un Enigma risolto si nasconde con le segnate anche se fra i passi ha una nota (le descrittive non hanno stato)', () => {
    monta([punto({}), { ...enigma, stato: 'ottenuto' }, { ...leva, stato: 'ottenuto' }, { ...porta, stato: 'ottenuto' }, nota]);
    expect(screen.queryByRole('button', { name: /La porta della torre/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    expect(screen.getByRole('button', { name: /La porta della torre/ })).toBeInTheDocument();
  });

  it('«Passo di» non propone un Enigma con pin (il server lo rifiuta)', () => {
    const conPin = punto({ chiave: 'e2', tipo: 'puzzle', nome: 'Enigma col pin', pin: [{ id: 9, nome: 'Leva', tipo: 'meccanismo', mappa: 'm-sala', mappaNome: 'Palazzo di Kamoshida › Sala' }] });
    monta([punto({}), enigma, conPin]);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    expect(vociSelettore('Passo di')).toEqual(['— nessun Enigma (voce dell’area) —', 'La porta della torre']);
  });

  it('dalla modifica una voce diventa un passo di un Enigma dell’area; un Enigma coi passi resta un Enigma', async () => {
    const { onRicarica } = monta([punto({}), enigma, leva]);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    expect(vociSelettore('Passo di')).toEqual(['— nessun Enigma (voce dell’area) —', 'La porta della torre']);
    scegliVoce('Passo di', 'La porta della torre');
    aggiornaPunto.mockResolvedValue(punto({ contenitore: 'e1' }));
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalledWith('p1', expect.objectContaining({ contenitore: 'e1' })));
    await waitFor(() => expect(onRicarica).toHaveBeenCalled());
    cleanup();
    monta([enigma, leva]);
    fireEvent.click(screen.getByRole('button', { name: /La porta della torre/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «La porta della torre»/ }));
    expect(vociSelettore('Tipo')).toEqual(['Enigma']);
    expect(screen.queryByRole('combobox', { name: 'Passo di' })).toBeNull();
  });
});
