/** @vitest-environment jsdom */
// ============================================================
// Test GuidaDellArea — voci modificabili, spostabili e collegate ai pin scelti sulla mappa, dentro la voce (2026-10-01)
// ============================================================

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce, vociSelettore } from '../../../test/selettore';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { GuidaDellArea } from './GuidaDellArea';
import type { SceltaPin } from '../mappe/VisoreMappa';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto } from '../../types';

const { collegaPinAlPunto, spostaPunto, creaPunto, eliminaPunto, aggiornaPunto, spostaPuntiInArea, notifica } = vi.hoisted(() => ({
  collegaPinAlPunto: vi.fn(), spostaPunto: vi.fn(), creaPunto: vi.fn(), eliminaPunto: vi.fn(), aggiornaPunto: vi.fn(), spostaPuntiInArea: vi.fn(), notifica: vi.fn(),
}));
vi.mock('../../services/api', (vero) => moduloApi(vero, { collegaPinAlPunto, spostaPunto, creaPunto, eliminaPunto, aggiornaPunto, spostaPuntiInArea }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));
/** Il visore vero è provato a parte: qui basta vedere che cosa riceve e poter «toccare» un pin. */
let ultimaScelta: SceltaPin | undefined;
vi.mock('../mappe/MappaIncorporata', () => ({
  MappaIncorporata: ({ chiave, scelta }: { chiave: string; scelta?: SceltaPin }) => { ultimaScelta = scelta; return <div>Mappa di scelta: {chiave} · {scelta?.scelti.size ?? 0} scelti</div>; },
}));

/** Punto d'interesse di prova (un forziere esauribile, non segnato e senza pin) con i campi di `extra` che sovrascrivono i predefiniti. */
const punto = (extra: Partial<PuntoInteresseDto>): PuntoInteresseDto => ({
  chiave: 'p1', ordine: 0, tipo: 'forziere', nome: 'Forziere della sala', descrizione: 'Dietro la statua.', esauribile: true, dettagli: {}, fonte: '', stato: null, marcatore: null, pin: [], contenitore: null, areaDedalo: null, persona: null, areeDedalo: [], ...extra,
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
  const cambiaStato = vi.fn().mockResolvedValue(true);
  render(<MemoryRouter><GuidaDellArea area={area(punti)} planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={cambiaStato} onPuntoAggiornato={onPuntoAggiornato} onRicarica={onRicarica} /></MemoryRouter>);
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

it('in un Palazzo il tipo non propone Trama, che è solo dei Memento (2026-10-11)', () => {
  monta([punto({})]);
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una voce' }));
  expect(vociSelettore('Tipo')).toContain('Storia');
  expect(vociSelettore('Tipo')).not.toContain('Trama');
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

describe('«Ottenuto» ed «Esaurito» chiudono la voce, la nascondono e aprono la successiva (2026-10-04)', () => {
  /** La guida con gli stati tenuti come nella pagina vera: il segno salvato rende la voce «segnata». `esito` decide se il salvataggio riesce. */
  function Pagina({ punti, esito = true, cambia }: { punti: PuntoInteresseDto[]; esito?: boolean; cambia: (p: PuntoInteresseDto, s: unknown) => void }) {
    const [elenco, setElenco] = useState(punti);
    /** Salva lo stato come la pagina: lo applica alla voce (e ai passi di un Enigma), se il salvataggio riesce. */
    const cambiaStato = async (p: PuntoInteresseDto, stato: PuntoInteresseDto['stato']) => {
      cambia(p, stato);
      if (!esito) return false;
      setElenco((xs) => xs.map((x) => (x.chiave === p.chiave || x.contenitore === p.chiave ? { ...x, stato } : x)));
      return true;
    };
    return <MemoryRouter><GuidaDellArea area={area(elenco)} planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={cambiaStato} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn().mockResolvedValue(undefined)} /></MemoryRouter>;
  }
  // jsdom non ha scrollIntoView: un test lo mette, e dopo si rimette com'era
  const scrollIntoViewDiPrima = HTMLElement.prototype.scrollIntoView;
  afterEach(() => { HTMLElement.prototype.scrollIntoView = scrollIntoViewDiPrima; });
  /** Vero se la voce col nome dato è nell'elenco e aperta. */
  const aperta = (nome: RegExp) => screen.getByRole('button', { name: nome }).getAttribute('aria-expanded') === 'true';
  const voci = [
    punto({ chiave: 'a', nome: 'Forziere A' }),
    punto({ chiave: 'b', tipo: 'altro', nome: 'Nota descrittiva', esauribile: false }),
    punto({ chiave: 'c', tipo: 'sicura', nome: 'Stanza sicura già segnata', esauribile: false, stato: 'ottenuto' }),
    punto({ chiave: 'd', nome: 'Forziere D' }),
    punto({ chiave: 'e', tipo: 'boss', nome: 'Boss E', esauribile: false }),
  ];

  it('Ottenuto: la voce si chiude e sparisce, si apre la prossima da segnare (saltate la descrittiva e la già segnata) e la si porta in vista', async () => {
    const scorri = vi.fn();
    HTMLElement.prototype.scrollIntoView = scorri;
    const cambia = vi.fn();
    render(<Pagina punti={voci} cambia={cambia} />);
    fireEvent.click(screen.getByRole('button', { name: /^Forziere A/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(aperta(/^Forziere D/)).toBe(true));
    expect(cambia).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'a' }), 'ottenuto');
    expect(screen.queryByRole('button', { name: /^Forziere A/ })).toBeNull();
    expect(scorri).toHaveBeenCalledWith({ block: 'nearest', behavior: 'smooth' });
    expect(scorri.mock.contexts[0]).toHaveAttribute('data-voce', 'd');
  });

  it('Esaurito fa lo stesso; con «Anche le segnate» la voce resta in elenco, chiusa', async () => {
    render(<Pagina punti={voci} cambia={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Forziere A/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Esaurito' }));
    await waitFor(() => expect(aperta(/^Forziere D/)).toBe(true));
    expect(aperta(/^Forziere A/)).toBe(false);
  });

  it('se il salvataggio non riesce la voce resta aperta; all’ultima voce non si apre niente', async () => {
    const { unmount } = render(<Pagina punti={voci} esito={false} cambia={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Forziere A/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ottenuto' })).toBeInTheDocument());
    expect(aperta(/^Forziere A/)).toBe(true);
    unmount();
    render(<Pagina punti={voci} cambia={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Boss E/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Boss E/ })).toBeNull());
    expect(screen.queryByRole('button', { expanded: true })).toBeNull();
  });

  it('con un filtro per tipo la successiva è la prossima che il filtro mostra', async () => {
    // fra i due forzieri c'è una leva da segnare: col filtro «Forziere» non si vede, e non è lei la successiva
    const conLeva = [punto({ chiave: 'a', nome: 'Forziere A' }), punto({ chiave: 'm', tipo: 'meccanismo', nome: 'Leva in mezzo', esauribile: false }), punto({ chiave: 'd', nome: 'Forziere D' })];
    render(<Pagina punti={conLeva} cambia={vi.fn()} />);
    fireEvent.click(within(screen.getByRole('group', { name: 'Filtri per tipo' })).getByRole('button', { name: /^Forziere normale/ }));
    expect(screen.queryByRole('button', { name: /^Leva in mezzo/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Forziere A/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(aperta(/^Forziere D/)).toBe(true));
    expect(screen.queryByRole('button', { name: /^Leva in mezzo/ })).toBeNull();
  });

  it('un passo segnato apre il passo dopo; l’Enigma segnato salta i suoi passi e apre la voce che lo segue', async () => {
    const enigma = punto({ chiave: 'e1', tipo: 'puzzle', nome: 'La porta della torre', esauribile: false });
    const leva = punto({ chiave: 'e1-a', ordine: 0, tipo: 'meccanismo', nome: 'Tira la leva', esauribile: false, contenitore: 'e1' });
    const porta = punto({ chiave: 'e1-b', ordine: 1, tipo: 'porta', nome: 'Apri la porta', esauribile: false, contenitore: 'e1' });
    const dopo = punto({ chiave: 'z', nome: 'Forziere dopo l’Enigma' });
    const { unmount } = render(<Pagina punti={[enigma, leva, porta, dopo]} cambia={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^Tira la leva/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(aperta(/^Apri la porta/)).toBe(true));
    unmount();
    render(<Pagina punti={[enigma, leva, porta, dopo]} cambia={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /^La porta della torre/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(aperta(/^Forziere dopo l’Enigma/)).toBe(true));
    expect(screen.queryByRole('button', { name: /^Tira la leva/ })).toBeNull();
  });
});

describe('in un\'area di un dedalo dei Memento (099)', () => {
  const dedalo = { chiave: 'q-1', nome: 'Banchina', altre: [{ chiave: 'q-2', nome: 'Treno' }] };
  /** La guida dell'area del dedalo «Banchina», con un'altra area «Treno» nello stesso dedalo. */
  const montaDedalo = (punti: PuntoInteresseDto[]) => {
    const onRicarica = vi.fn().mockResolvedValue(undefined);
    const cambiaStato = vi.fn().mockResolvedValue(true);
    render(<MemoryRouter><GuidaDellArea area={{ ...area(punti), chiave: 'mementos-01-qimranut', nome: 'Dedalo di Qimranut', mappe: [] }} planimetrie={[]} partitaId={4} mappaAperta={null} cambiaStato={cambiaStato} onPuntoAggiornato={vi.fn()} onRicarica={onRicarica} areaDedalo={dedalo} /></MemoryRouter>);
    return { onRicarica, cambiaStato };
  };

  /** Una voce di Trama dell'area «Banchina» (q-1). */
  const trama = (extra: Partial<PuntoInteresseDto> = {}) => punto({ chiave: 'n1', tipo: 'trama', nome: 'Nota della banchina', esauribile: false, areaDedalo: 'q-1', ...extra });

  it('le voci di Trama si segnano e la guida lo dice; l\'elenco si chiama «Trama» (2026-10-11)', async () => {
    const { cambiaStato } = montaDedalo([trama()]);
    expect(screen.getByText('Trama · 1 voce')).toBeInTheDocument();
    expect(screen.getByText(/Le voci di Trama si segnano e sono elementi dell’area/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Guida di Banchina' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Nota della banchina/ }));
    expect(screen.queryByText(/Voce descrittiva/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'n1' }), 'ottenuto'));
  });

  it('Trama è l\'unico tipo: niente scelta del tipo né filtri per tipo, niente «Collega pin» (2026-10-11)', () => {
    montaDedalo([trama()]);
    expect(screen.queryByRole('group', { name: 'Filtri per tipo' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una voce di Trama in Banchina' }));
    expect(screen.getByRole('textbox', { name: 'Nuova voce di Trama' })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Tipo' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Annulla/ }));
    fireEvent.click(screen.getByRole('button', { name: /Nota della banchina/ }));
    expect(screen.queryByRole('button', { name: /Collega pin/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Nota della banchina»/ }));
    expect(screen.queryByRole('combobox', { name: 'Tipo' })).toBeNull();
  });

  it('la voce nuova nasce Trama nell\'area del dedalo; dalla modifica passa in un\'altra area dello stesso dedalo', async () => {
    const { onRicarica } = montaDedalo([trama()]);
    fireEvent.click(screen.getByRole('button', { name: 'Aggiungi una voce di Trama in Banchina' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nuova voce di Trama' }), { target: { value: 'Jose alla banchina' } });
    creaPunto.mockResolvedValue(trama({ chiave: 'nuova', nome: 'Jose alla banchina' }));
    fireEvent.click(screen.getByRole('button', { name: /^Aggiungi$/ }));
    await waitFor(() => expect(creaPunto).toHaveBeenCalledWith('mementos-01-qimranut', { nome: 'Jose alla banchina', tipo: 'trama', areaDedalo: 'q-1' }));
    fireEvent.click(screen.getByRole('button', { name: /Nota della banchina/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Nota della banchina»/ }));
    expect(vociSelettore('Area del dedalo')).toEqual(['Banchina', 'Treno']);
    scegliVoce('Area del dedalo', 'Treno');
    aggiornaPunto.mockResolvedValue(trama({ areaDedalo: 'q-2' }));
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalledWith('n1', expect.objectContaining({ areaDedalo: 'q-2', tipo: 'trama' })));
    await waitFor(() => expect(onRicarica).toHaveBeenCalled());
  });

  it('senza un cambio d\'area la modifica non la manda', async () => {
    montaDedalo([trama()]);
    fireEvent.click(screen.getByRole('button', { name: /Nota della banchina/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Nota della banchina»/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Nota rinominata' } });
    aggiornaPunto.mockResolvedValue(trama({ nome: 'Nota rinominata' }));
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalled());
    expect(aggiornaPunto.mock.calls[0][1]).not.toHaveProperty('areaDedalo');
  });
});

describe('«Area del Palazzo»: una voce passa in un\'altra area dello stesso Palazzo (2026-10-12)', () => {
  const aree = [{ chiave: 'k-02', nome: 'Sala Centrale', ordine: 1 }, { chiave: 'k-01', nome: 'Ingresso', ordine: 0 }, { chiave: 'k-03', nome: 'Torre', ordine: 2 }];
  /** La guida dell'area «Sala Centrale» con le aree del Palazzo; restituisce `onRicarica`. */
  const montaPalazzo = (punti: PuntoInteresseDto[]) => {
    const onRicarica = vi.fn().mockResolvedValue(undefined);
    render(<MemoryRouter><GuidaDellArea area={area(punti)} planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={vi.fn().mockResolvedValue(true)} onPuntoAggiornato={vi.fn()} onRicarica={onRicarica} areePalazzo={aree} /></MemoryRouter>);
    return onRicarica;
  };

  it('le aree in ordine di guida, questa compresa; scelta un\'altra, la voce vi si sposta e lo si dice', async () => {
    const onRicarica = montaPalazzo([punto({})]);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    expect(vociSelettore('Area del Palazzo')).toEqual(['1. Ingresso', '2. Sala Centrale', '3. Torre']);
    scegliVoce('Area del Palazzo', /^3\. Torre/);
    aggiornaPunto.mockResolvedValue(punto({}));
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalledWith('p1', expect.objectContaining({ area: 'k-03' })));
    await waitFor(() => expect(onRicarica).toHaveBeenCalled());
  });

  it('senza cambiarla `area` non parte; un passo non la offre (si sposta il suo Enigma); un Palazzo di un\'area sola nemmeno', async () => {
    montaPalazzo([punto({})]);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Forziere rinominato' } });
    aggiornaPunto.mockResolvedValue(punto({}));
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalled());
    expect(aggiornaPunto.mock.calls[0][1]).not.toHaveProperty('area');
    cleanup();
    montaPalazzo([punto({ chiave: 'e1', tipo: 'puzzle', nome: 'La porta della torre' }), punto({ chiave: 'l1', tipo: 'meccanismo', nome: 'Leva', contenitore: 'e1' })]);
    fireEvent.click(screen.getByRole('button', { name: /^Leva/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Leva»/ }));
    expect(screen.queryByRole('combobox', { name: 'Area del Palazzo' })).toBeNull();
    cleanup();
    render(<MemoryRouter><GuidaDellArea area={area([punto({})])} planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={vi.fn()} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn()} areePalazzo={[aree[0]]} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    expect(screen.queryByRole('combobox', { name: 'Area del Palazzo' })).toBeNull();
  });
});

describe('«Sposta voci in un’altra area»: più voci insieme in un\'altra area del Palazzo (2026-10-14)', () => {
  const aree = [{ chiave: 'k-02', nome: 'Sala Centrale', ordine: 1 }, { chiave: 'k-01', nome: 'Ingresso', ordine: 0 }, { chiave: 'k-03', nome: 'Torre', ordine: 2 }];
  const voci = () => [
    punto({}),
    punto({ chiave: 'e1', ordine: 1, tipo: 'puzzle', nome: 'La porta della torre' }),
    punto({ chiave: 'l1', ordine: 0, tipo: 'meccanismo', nome: 'Leva', contenitore: 'e1' }),
    punto({ chiave: 'p3', ordine: 2, tipo: 'storia', nome: 'Il re e la regina', esauribile: false }),
  ];
  /** La guida della «Sala Centrale» con le aree del Palazzo; restituisce `onRicarica`. */
  const montaPalazzo = (punti: PuntoInteresseDto[], conAree = aree) => {
    const onRicarica = vi.fn().mockResolvedValue(undefined);
    render(<MemoryRouter><GuidaDellArea area={area(punti)} planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={vi.fn().mockResolvedValue(true)} onPuntoAggiornato={vi.fn()} onRicarica={onRicarica} areePalazzo={conAree} /></MemoryRouter>);
    return onRicarica;
  };
  const apriScelta = () => fireEvent.click(screen.getByRole('button', { name: 'Scegli voci da spostare in un’altra area del Palazzo' }));
  const barra = () => screen.getByRole('region', { name: 'Sposta voci in un’altra area' });

  it('nella scelta le voci dell\'area sono righe da spuntare (i passi seguono il loro Enigma); scelte due, vanno nell\'area scelta, nell\'ordine della guida', async () => {
    const onRicarica = montaPalazzo(voci());
    apriScelta();
    const elenco = screen.getByRole('list', { name: 'Voci di Sala Centrale da scegliere' });
    expect(within(elenco).getAllByRole('checkbox').map((c) => c.closest('label')!.textContent)).toEqual([
      'Forziere della sala · Forziere normale', 'La porta della torre · Enigma · con 1 passo', 'Il re e la regina · Storia',
    ]);
    // niente schede né gesti della voce mentre si sceglie, e niente «Aggiungi una voce»
    expect(screen.queryByRole('button', { name: /Forziere della sala/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Aggiungi una voce/ })).toBeNull();
    expect(within(barra()).getByRole('button', { name: /Sposta in…/ })).toBeDisabled();
    // scelte in disordine: la finestra le riceve nell'ordine della guida
    fireEvent.click(within(elenco).getByRole('checkbox', { name: /Il re e la regina/ }));
    fireEvent.click(within(elenco).getByRole('checkbox', { name: /La porta della torre/ }));
    expect(within(barra()).getByText('2 voci scelte')).toBeInTheDocument();
    fireEvent.click(within(barra()).getByRole('button', { name: /Sposta in…/ }));
    const finestra = screen.getByRole('dialog', { name: 'Sposta 2 voci in un’altra area' });
    expect(within(finestra).getByText(/2 voci di 2\. Sala Centrale, con 1 passo di Enigma\./)).toBeInTheDocument();
    // le altre aree, in ordine di guida; parte dall'area dopo questa
    expect(vociSelettore('Area di destinazione', finestra)).toEqual(['1. Ingresso', '3. Torre']);
    expect(within(finestra).getByRole('button', { name: /^Sposta in 3\. Torre/ })).toBeInTheDocument();
    scegliVoce('Area di destinazione', /^1\. Ingresso/, finestra);
    spostaPuntiInArea.mockResolvedValue({ area: 'k-01', spostate: ['e1', 'p3'] });
    fireEvent.click(within(finestra).getByRole('button', { name: /^Sposta in 1\. Ingresso/ }));
    await waitFor(() => expect(spostaPuntiInArea).toHaveBeenCalledWith({ chiavi: ['e1', 'p3'], area: 'k-01' }));
    await waitFor(() => expect(onRicarica).toHaveBeenCalled());
    expect(notifica).toHaveBeenCalledWith('success', '2 voci spostate in 1. Ingresso, con 1 passo di Enigma, in fondo: per tutte le partite.');
    // fatto: finestra chiusa e fuori dalla scelta
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('region', { name: 'Sposta voci in un’altra area' })).toBeNull();
    expect(screen.getByRole('button', { name: /Forziere della sala/ })).toBeInTheDocument();
  });

  it('«Tutte» e «Nessuna» sulle voci in elenco; un errore resta in notifica con la finestra aperta; «Fine» esce dalla scelta', async () => {
    montaPalazzo(voci());
    apriScelta();
    fireEvent.click(within(barra()).getByRole('button', { name: 'Scegli tutte le voci in elenco' }));
    expect(within(barra()).getByText('3 voci scelte')).toBeInTheDocument();
    fireEvent.click(within(barra()).getByRole('button', { name: 'Togli dalla scelta tutte le voci in elenco' }));
    expect(within(barra()).getByText('Scegli le voci')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Forziere della sala/ }));
    fireEvent.click(within(barra()).getByRole('button', { name: /Sposta in…/ }));
    spostaPuntiInArea.mockRejectedValue(new Error('«Leva» è un passo: sta nell’area del suo Enigma.'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Sposta in 3\. Torre/ }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', '«Leva» è un passo: sta nell’area del suo Enigma.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Annulla/ }));
    expect(within(barra()).getByText('1 voce scelta')).toBeInTheDocument();
    fireEvent.click(within(barra()).getByRole('button', { name: 'Esci dalla scelta' }));
    expect(screen.queryByRole('region', { name: 'Sposta voci in un’altra area' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Scegli voci da spostare in un’altra area del Palazzo' })).toBeInTheDocument();
  });

  it('il comando non c\'è con un\'area sola, senza voci, né nei dedali dei Memento', () => {
    montaPalazzo(voci(), [aree[0]]);
    expect(screen.queryByRole('button', { name: 'Scegli voci da spostare in un’altra area del Palazzo' })).toBeNull();
    cleanup();
    montaPalazzo([]);
    expect(screen.queryByRole('button', { name: 'Scegli voci da spostare in un’altra area del Palazzo' })).toBeNull();
    cleanup();
    render(<MemoryRouter><GuidaDellArea area={area([punto({ tipo: 'trama', nome: 'Trama' })])} planimetrie={[]} partitaId={4} mappaAperta={null} cambiaStato={vi.fn()} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn()}
      areaDedalo={{ chiave: 'd1', nome: 'Area 1', altre: [{ chiave: 'd2', nome: 'Area 2' }] }} areePalazzo={aree} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Scegli voci da spostare in un’altra area del Palazzo' })).toBeNull();
  });
});
