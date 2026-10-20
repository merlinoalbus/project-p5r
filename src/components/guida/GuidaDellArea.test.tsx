/** @vitest-environment jsdom */
// ============================================================
// Test GuidaDellArea — voci modificabili, spostabili e collegate ai pin scelti sulla mappa, dentro la voce (2026-10-01)
// ============================================================

import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce, vociSelettore } from '../../../test/selettore';
import { MemoryRouter } from 'react-router-dom';
import { useState } from 'react';
import { GuidaDellArea, type CollegamentoPin } from './GuidaDellArea';
import type { AreaDungeonDto, DungeonDettaglioDto, PuntoInteresseDto } from '../../types';

const { collegaPinAlPunto, spostaPunto, creaPunto, eliminaPunto, aggiornaPunto, spostaPuntiInArea, copiaPuntiInArea, notifica } = vi.hoisted(() => ({
  collegaPinAlPunto: vi.fn(), spostaPunto: vi.fn(), creaPunto: vi.fn(), eliminaPunto: vi.fn(), aggiornaPunto: vi.fn(), spostaPuntiInArea: vi.fn(), copiaPuntiInArea: vi.fn(), notifica: vi.fn(),
}));
vi.mock('../../services/api', (vero) => moduloApi(vero, { collegaPinAlPunto, spostaPunto, creaPunto, eliminaPunto, aggiornaPunto, spostaPuntiInArea, copiaPuntiInArea }));
vi.mock('../../stores/notificationStore', (vero) => moduloNotifiche(vero, { notifica }));
/** I pin si scelgono sulla mappa della pagina (2026-10-18): qui si guarda che cosa la guida le comunica e si «tocca» un pin da lì. */
const onCollegamento = vi.fn<(c: CollegamentoPin | null) => void>();
/** L'ultimo collegamento comunicato alla pagina. */
const ultimoCollegamento = () => onCollegamento.mock.calls.at(-1)?.[0] ?? null;

/** Punto d'interesse di prova (un forziere esauribile, non segnato e senza pin) con i campi di `extra` che sovrascrivono i predefiniti. */
const punto = (extra: Partial<PuntoInteresseDto>): PuntoInteresseDto => ({
  chiave: 'p1', ordine: 0, tipo: 'forziere', nome: 'Forziere della sala', descrizione: 'Dietro la statua.', esauribile: true, dettagli: {}, fonte: '', stato: null, marcatore: null, pin: [], contenitore: null, areaDedalo: null, persona: null, areeDedalo: [], ...extra,
});
/** L'area «Sala Centrale» (k-02) del Palazzo di Kamoshida, con la sua planimetria m-sala e i punti dati. */
const area = (punti: PuntoInteresseDto[]): AreaDungeonDto => ({
  chiave: 'k-02', ordine: 1, nome: 'Sala Centrale', descrizione: '', mappe: [{ chiave: 'm-sala', nome: 'Palazzo di Kamoshida › Sala', n: 0, presi: 0, spilli: [] }], punti, dedalo: null,
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
  const vista = render(<MemoryRouter><GuidaDellArea area={area(punti)} planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={cambiaStato} onPuntoAggiornato={onPuntoAggiornato} onRicarica={onRicarica} onCollegamento={onCollegamento} /></MemoryRouter>);
  return { onPuntoAggiornato, onRicarica, cambiaStato, vista };
}

beforeEach(() => { vi.clearAllMocks(); });

it('i filtri per tipo sono una riga sola che si apre: i tipi con il conto, quanti sono scelti, «Tutti» li toglie (2026-10-18)', () => {
  monta([punto({}), punto({ chiave: 'p2', tipo: 'sicura', nome: 'Stanza sicura' }), punto({ chiave: 'p3', nome: 'Altro forziere' })]);
  const filtri = screen.getByRole('group', { name: 'Filtri per tipo' });
  const apri = within(filtri).getByRole('button', { name: /^Filtra per tipo/ });
  // chiusi: nessun tipo a schermo
  expect(apri).toHaveAttribute('aria-expanded', 'false');
  expect(within(filtri).queryByRole('button', { name: /^Forziere normale/ })).toBeNull();
  fireEvent.click(apri);
  expect(apri).toHaveAttribute('aria-expanded', 'true');
  expect(within(filtri).getByRole('button', { name: /^Forziere normale/ })).toHaveTextContent(/Forziere normale\s*2/);
  fireEvent.click(within(filtri).getByRole('button', { name: /^Stanze sicure/ }));
  expect(screen.queryByRole('button', { name: /^Forziere della sala/ })).toBeNull();
  // chiusi di nuovo, il filtro resta e la riga lo dice
  fireEvent.click(apri);
  expect(apri).toHaveTextContent('Filtra per tipo · 1 scelto');
  expect(screen.queryByRole('button', { name: /^Forziere della sala/ })).toBeNull();
  fireEvent.click(within(filtri).getByRole('button', { name: 'Tutti' }));
  expect(apri).toHaveTextContent(/^Filtra per tipo ▾$/);
  expect(screen.getByRole('button', { name: /^Forziere della sala/ })).toBeInTheDocument();
});

it('la riga dice se la voce è collegata («N pin») o da collegare; le descrittive non dicono niente', () => {
  monta([
    punto({}),
    punto({ chiave: 'p2', tipo: 'sicura', nome: 'Stanza sicura', pin: [{ id: 9, nome: 'Sicura', tipo: 'sicura', mappa: 'm-sala', mappaNome: 'Palazzo di Kamoshida › Sala' }] }),
    punto({ chiave: 'p3', tipo: 'altro', nome: 'Negoziazione' }),
  ]);
  expect(screen.getByText(/Guida dell’infiltrazione · 3 voci · 1 da collegare/)).toBeInTheDocument();
  expect(within(screen.getByRole('button', { name: /Forziere della sala/ })).getByText('da collegare')).toBeInTheDocument();
  expect(within(screen.getByRole('button', { name: /Stanza sicura/ })).getByText('1 pin')).toBeInTheDocument();
  const descrittiva = screen.getByRole('button', { name: /Negoziazione/ });
  expect(within(descrittiva).queryByText('da collegare')).toBeNull();
  expect(within(descrittiva).queryByText(/pin/)).toBeNull();
});

it('una voce si elimina dalla sua modifica, dopo una conferma che dice che cosa si perde e che finisce nel cestino (2026-10-16)', async () => {
  const { onRicarica } = monta([punto({})]);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Elimina' }));
  expect(screen.getByText(/I pin collegati restano sulla mappa, col loro «raccolto»\. Finisce nel cestino \(Impostazioni → Cestino\): da lì la rimetti com’era\./)).toBeInTheDocument();
  eliminaPunto.mockResolvedValue(undefined);
  fireEvent.click(screen.getByRole('button', { name: 'Confermo' }));
  await waitFor(() => expect(eliminaPunto).toHaveBeenCalledWith('p1'));
  await waitFor(() => expect(onRicarica).toHaveBeenCalled());
});

it('«Collega pin» apre il collegamento sulla mappa della pagina (niente mappa nella voce): un tocco collega, «Fatto» chiude (2026-10-18)', async () => {
  const { onPuntoAggiornato, onRicarica } = monta([punto({})]);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  expect(ultimoCollegamento()).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  // nella voce solo la riga del conto; la mappa è quella della pagina
  expect(screen.getByLabelText('Scelta dei pin per Forziere della sala')).toHaveTextContent('Tocca i pin sulla mappa del Palazzo per collegarli o scollegarli; quelli grigi sono già raccolti o non ancora disponibili · 0 collegati');
  expect(screen.queryByRole('searchbox')).toBeNull();
  // parte dalla planimetria aperta dell'area; le planimetrie del Palazzo, prima quelle dell'area
  const c = ultimoCollegamento()!;
  expect(c).toMatchObject({ voce: 'p1', nome: 'Forziere della sala', mappaIniziale: 'm-sala', occupato: false });
  expect(c.opzioniMappa.map((o) => [o.chiave, o.dettaglio])).toEqual([['m-sala', 'di quest’infiltrazione'], ['m-torre', undefined]]);
  expect([...c.scelti]).toEqual([]);
  const collegato = punto({ pin: [{ id: 7, nome: 'Forziere', tipo: 'forziere', mappa: 'm-sala', mappaNome: 'Palazzo di Kamoshida › Sala' }] });
  let rispondi: (v: PuntoInteresseDto) => void = () => {};
  collegaPinAlPunto.mockReturnValue(new Promise<PuntoInteresseDto>((r) => { rispondi = r; }));
  c.onScegli({ id: 7, nome: 'Forziere' });
  await waitFor(() => expect(collegaPinAlPunto).toHaveBeenCalledWith('p1', 7, true));
  // durante il salvataggio la pagina lo sa (i pin non rispondono); poi torna libero
  await waitFor(() => expect(ultimoCollegamento()?.occupato).toBe(true));
  rispondi(collegato);
  // la risposta non porta lo stato della partita (che il collegamento può cambiare): si rilegge la scheda subito, non solo a «Fatto»
  await waitFor(() => expect(onRicarica).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(ultimoCollegamento()?.occupato).toBe(false));
  expect(onPuntoAggiornato).not.toHaveBeenCalled();
  // «Fatto» chiude il collegamento e rilegge la scheda (gli stati delle partite si sono uniti)
  fireEvent.click(screen.getByRole('button', { name: 'Fatto' }));
  await waitFor(() => expect(onRicarica).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(ultimoCollegamento()).toBeNull());
  expect(screen.queryByLabelText('Scelta dei pin per Forziere della sala')).toBeNull();
});

it('senza la mappa della pagina «Collega pin» non c\'è; senza planimetria dell\'area a schermo c\'è lo stesso (la pagina mostra una del Palazzo), spento solo senza planimetrie; chiusa la guida il collegamento si chiude', () => {
  render(<MemoryRouter><GuidaDellArea area={area([punto({})])} planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={vi.fn()} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn()} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  expect(screen.queryByRole('button', { name: 'Collega pin' })).toBeNull();
  cleanup();
  // un'area senza planimetria propria a schermo: si collega lo stesso, partendo dalla prima planimetria del Palazzo
  render(<MemoryRouter><GuidaDellArea area={{ ...area([punto({})]), mappe: [] }} planimetrie={planimetrie} partitaId={4} mappaAperta={null} cambiaStato={vi.fn()} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn()} onCollegamento={onCollegamento} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  expect(screen.getByRole('button', { name: 'Collega pin' })).not.toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  expect(ultimoCollegamento()).toMatchObject({ voce: 'p1', mappaIniziale: 'm-torre' });
  cleanup();
  // senza nessuna planimetria del Palazzo non c'è dove scegliere
  render(<MemoryRouter><GuidaDellArea area={{ ...area([punto({})]), mappe: [] }} planimetrie={[]} partitaId={4} mappaAperta={null} cambiaStato={vi.fn()} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn()} onCollegamento={onCollegamento} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  expect(screen.getByRole('button', { name: 'Collega pin' })).toBeDisabled();
  cleanup();
  const { vista } = monta([punto({})]);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  expect(ultimoCollegamento()).not.toBeNull();
  vista.unmount();
  expect(ultimoCollegamento()).toBeNull();
});

it('dalla voce si scollega un pin, e il tocco su un pin già collegato lo scollega', async () => {
  const conPin = punto({ pin: [{ id: 7, nome: 'Forziere', tipo: 'forziere', mappa: 'm-torre', mappaNome: 'Palazzo di Kamoshida › Torre' }] });
  monta([conPin]);
  fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
  expect(within(screen.getByRole('list', { name: 'Pin collegati a Forziere della sala' })).getByText('· Torre')).toBeInTheDocument();
  collegaPinAlPunto.mockResolvedValue(punto({}));
  fireEvent.click(screen.getByRole('button', { name: 'Scollega Forziere da Forziere della sala' }));
  await waitFor(() => expect(collegaPinAlPunto).toHaveBeenCalledWith('p1', 7, false));
  // la mappa del collegamento parte da dove sta il suo pin (la Torre), non dalla planimetria aperta
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  expect(ultimoCollegamento()).toMatchObject({ voce: 'p1', mappaIniziale: 'm-torre' });
  expect([...ultimoCollegamento()!.scelti]).toEqual([7]);
  ultimoCollegamento()!.onScegli({ id: 7, nome: 'Forziere' });
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
  expect(screen.getByText('La guida non ha voci per quest’infiltrazione: aggiungile qui sotto.')).toBeInTheDocument();
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
  expect(screen.getByText(/Guida dell’infiltrazione · 1 voce$/)).toBeInTheDocument();
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
    expect(vociSelettore('Passo di')).toEqual(['— nessun Enigma (voce dell’infiltrazione) —', 'La porta della torre']);
  });

  it('dalla modifica una voce diventa un passo di un Enigma dell’area; un Enigma coi passi resta un Enigma', async () => {
    const { onRicarica } = monta([punto({}), enigma, leva]);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    expect(vociSelettore('Passo di')).toEqual(['— nessun Enigma (voce dell’infiltrazione) —', 'La porta della torre']);
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
    fireEvent.click(within(screen.getByRole('group', { name: 'Filtri per tipo' })).getByRole('button', { name: /^Filtra per tipo/ }));
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
    expect(vociSelettore('Infiltrazione')).toEqual(['1. Ingresso', '2. Sala Centrale', '3. Torre']);
    scegliVoce('Infiltrazione', /^3\. Torre/);
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
    expect(screen.queryByRole('combobox', { name: 'Infiltrazione' })).toBeNull();
    cleanup();
    render(<MemoryRouter><GuidaDellArea area={area([punto({})])} planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={vi.fn()} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn()} areePalazzo={[aree[0]]} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    expect(screen.queryByRole('combobox', { name: 'Infiltrazione' })).toBeNull();
  });
});

describe('«Copia o sposta voci»: più voci insieme in un\'altra area del Palazzo (spostare 2026-10-14, copiare 2026-10-18)', () => {
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
  const apriScelta = () => fireEvent.click(screen.getByRole('button', { name: 'Scegli voci da copiare o spostare in un’altra infiltrazione del Palazzo' }));
  const barra = () => screen.getByRole('region', { name: 'Copia o sposta voci in un’altra infiltrazione' });

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
    const finestra = screen.getByRole('dialog', { name: 'Sposta 2 voci in un’altra infiltrazione' });
    expect(within(finestra).getByText(/2 voci di 2\. Sala Centrale, con 1 passo di Enigma\./)).toBeInTheDocument();
    // le altre aree, in ordine di guida; parte dall'area dopo questa
    expect(vociSelettore('Infiltrazione di destinazione', finestra)).toEqual(['1. Ingresso', '3. Torre']);
    expect(within(finestra).getByRole('button', { name: /^Sposta in 3\. Torre/ })).toBeInTheDocument();
    scegliVoce('Infiltrazione di destinazione', /^1\. Ingresso/, finestra);
    spostaPuntiInArea.mockResolvedValue({ area: 'k-01', spostate: ['e1', 'p3'] });
    fireEvent.click(within(finestra).getByRole('button', { name: /^Sposta in 1\. Ingresso/ }));
    await waitFor(() => expect(spostaPuntiInArea).toHaveBeenCalledWith({ chiavi: ['e1', 'p3'], area: 'k-01' }));
    await waitFor(() => expect(onRicarica).toHaveBeenCalled());
    expect(notifica).toHaveBeenCalledWith('success', '2 voci spostate in 1. Ingresso, con 1 passo di Enigma, in fondo: per tutte le partite.');
    // fatto: finestra chiusa e fuori dalla scelta
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('region', { name: 'Copia o sposta voci in un’altra infiltrazione' })).toBeNull();
    expect(screen.getByRole('button', { name: /Forziere della sala/ })).toBeInTheDocument();
  });

  it('«Copia in…» copia le voci scelte nell\'area scelta, nell\'ordine della guida, e lo dice coi passi copiati; gli originali restano', async () => {
    const onRicarica = montaPalazzo(voci());
    apriScelta();
    expect(within(barra()).getByText(/da copiare o spostare in un’altra infiltrazione/)).toBeInTheDocument();
    expect(within(barra()).getByRole('button', { name: /Copia in…/ })).toBeDisabled();
    const elenco = screen.getByRole('list', { name: 'Voci di Sala Centrale da scegliere' });
    fireEvent.click(within(elenco).getByRole('checkbox', { name: /Il re e la regina/ }));
    fireEvent.click(within(elenco).getByRole('checkbox', { name: /La porta della torre/ }));
    fireEvent.click(within(barra()).getByRole('button', { name: /Copia in…/ }));
    const finestra = screen.getByRole('dialog', { name: 'Copia 2 voci in un’altra infiltrazione' });
    expect(within(finestra).getByText(/2 voci di 2\. Sala Centrale, con 1 passo di Enigma\. Ogni voce diventa una voce nuova/)).toBeInTheDocument();
    expect(within(finestra).getByText(/collegata agli stessi pin delle planimetrie, con uno stato suo: parte da fare/)).toBeInTheDocument();
    expect(vociSelettore('Infiltrazione di destinazione', finestra)).toEqual(['1. Ingresso', '3. Torre']);
    copiaPuntiInArea.mockResolvedValue({ area: 'k-03', copiate: [{ origine: 'e1', copia: 'k-03-e1', passi: 1, schede: 0, pin: 2 }, { origine: 'p3', copia: 'k-03-p3', passi: 0, schede: 2, pin: 0 }] });
    fireEvent.click(within(finestra).getByRole('button', { name: /^Copia in 3\. Torre/ }));
    await waitFor(() => expect(copiaPuntiInArea).toHaveBeenCalledWith({ chiavi: ['e1', 'p3'], area: 'k-03' }));
    expect(spostaPuntiInArea).not.toHaveBeenCalled();
    await waitFor(() => expect(onRicarica).toHaveBeenCalled());
    expect(notifica).toHaveBeenCalledWith('success', '2 voci copiate in 3. Torre, con 1 passo di Enigma, collegate agli stessi 2 pin (da fare), in fondo: per tutte le partite.');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.queryByRole('region', { name: 'Copia o sposta voci in un’altra infiltrazione' })).toBeNull();
    // una voce sola, senza passi: al singolare e senza passi; un errore resta in notifica con la finestra aperta
    apriScelta();
    fireEvent.click(screen.getByRole('checkbox', { name: /Forziere della sala/ }));
    fireEvent.click(within(barra()).getByRole('button', { name: /Copia in…/ }));
    copiaPuntiInArea.mockResolvedValueOnce({ area: 'k-03', copiate: [{ origine: 'p1', copia: 'k-03-p1', passi: 0, schede: 0, pin: 0 }] });
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Copia 1 voce in un’altra infiltrazione' })).getByRole('button', { name: /^Copia in 3\. Torre/ }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', '1 voce copiata in 3. Torre, in fondo: per tutte le partite.'));
    apriScelta();
    fireEvent.click(screen.getByRole('checkbox', { name: /Forziere della sala/ }));
    fireEvent.click(within(barra()).getByRole('button', { name: /Copia in…/ }));
    copiaPuntiInArea.mockRejectedValueOnce(new Error('«Forziere della sala» è già in quest’area.'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^Copia in 3\. Torre/ }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', '«Forziere della sala» è già in quest’area.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
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
    expect(screen.queryByRole('region', { name: 'Copia o sposta voci in un’altra infiltrazione' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Scegli voci da copiare o spostare in un’altra infiltrazione del Palazzo' })).toBeInTheDocument();
  });

  it('il comando non c\'è con un\'area sola, senza voci, né nei dedali dei Memento', () => {
    montaPalazzo(voci(), [aree[0]]);
    expect(screen.queryByRole('button', { name: 'Scegli voci da copiare o spostare in un’altra infiltrazione del Palazzo' })).toBeNull();
    cleanup();
    montaPalazzo([]);
    expect(screen.queryByRole('button', { name: 'Scegli voci da copiare o spostare in un’altra infiltrazione del Palazzo' })).toBeNull();
    cleanup();
    render(<MemoryRouter><GuidaDellArea area={area([punto({ tipo: 'trama', nome: 'Trama' })])} planimetrie={[]} partitaId={4} mappaAperta={null} cambiaStato={vi.fn()} onPuntoAggiornato={vi.fn()} onRicarica={vi.fn()}
      areaDedalo={{ chiave: 'd1', nome: 'Area 1', altre: [{ chiave: 'd2', nome: 'Area 2' }] }} areePalazzo={aree} /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Scegli voci da copiare o spostare in un’altra infiltrazione del Palazzo' })).toBeNull();
  });
});

describe('i dettagli della voce si correggono dalla «Modifica» (2026-10-18)', () => {
  const ombra = punto({ chiave: 'o1', tipo: 'miniboss', nome: 'Ombra agente security', dettagli: { contenuto: 'Potenziare Ryuji', hp: 120, resisteA: [], tabella: [{ ombra: 'Pixie' }] } });
  /** Apre la «Modifica» dell'Ombra. */
  const apri = () => {
    monta([ombra]);
    fireEvent.click(screen.getByRole('button', { name: /Ombra agente security/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Ombra agente security»/ }));
  };
  const riga = (etichetta: string) => screen.getByRole('group', { name: `Dettaglio ${etichetta}` });

  it('una riga corretta, una tolta e una aggiunta: il corpo porta i dettagli nuovi, le righe non toccate identiche', async () => {
    apri();
    fireEvent.change(within(riga('contenuto')).getByRole('textbox', { name: 'Testo' }), { target: { value: 'Depotenziare il nemico' } });
    fireEvent.click(within(riga('hp')).getByRole('button', { name: 'Togli il dettaglio hp' }));
    fireEvent.click(screen.getByRole('button', { name: /Aggiungi un dettaglio/ }));
    const nuova = screen.getByRole('group', { name: 'Dettaglio 4' });
    fireEvent.change(within(nuova).getByRole('textbox', { name: 'Etichetta' }), { target: { value: 'strategia' } });
    fireEvent.change(within(nuova).getByRole('textbox', { name: 'Testo' }), { target: { value: 'Prima i comuni' } });
    aggiornaPunto.mockResolvedValue(ombra);
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalledWith('o1', expect.objectContaining({ dettagli: { contenuto: 'Depotenziare il nemico', resisteA: [], tabella: [{ ombra: 'Pixie' }], strategia: 'Prima i comuni' } })));
  });

  it('salvando senza toccare i dettagli il corpo non li porta', async () => {
    apri();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Ombra della security' } });
    aggiornaPunto.mockResolvedValue(ombra);
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalled());
    expect(aggiornaPunto.mock.calls.at(-1)![1]).not.toHaveProperty('dettagli');
  });

  it('due dettagli con la stessa etichetta: avviso, e il salvataggio non parte', async () => {
    apri();
    fireEvent.change(within(riga('hp')).getByRole('textbox', { name: 'Etichetta' }), { target: { value: 'contenuto' } });
    expect(screen.getByRole('alert')).toHaveTextContent('Etichetta ripetuta: contenuto');
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'Due dettagli con la stessa etichetta (contenuto): cambiane una.'));
    expect(aggiornaPunto).not.toHaveBeenCalled();
  });
});

// L4 §8.11 (NR4-1): ogni pin tiene il suo stato e la voce lo calcola dai suoi pin. La voce con più pin dice il contatore k/N («In corso ·
// 2/8» se ne è fatta una parte); «Riapri» toglie il segno a tutti i suoi pin e, se altre voci li condividono, chiede conferma elencandole
describe('§8.11: contatore k/N e «Riapri» con «Riapre anche: …»', () => {
  const pin = (id: number) => ({ id, nome: `Statua ${id}`, tipo: 'oggetto', mappa: 'm-sala', mappaNome: 'Palazzo di Kamoshida › Sala' });
  const otto = Array.from({ length: 8 }, (_, i) => pin(i + 1));
  const altreInfiltrazioni = [{ chiave: 'k-02', nome: 'Sala Centrale', ordine: 1 }, { chiave: 'k-04', nome: 'Torre', ordine: 3 }] as unknown as AreaDungeonDto[];

  it('la voce con più pin dice «In corso · 2/8» se una parte è fatta, «8/8» se sono tutti fatti, niente con un pin solo', () => {
    monta([
      punto({ chiave: 'p1', nome: 'Installazioni artistiche', tipo: 'oggetto', pin: otto, avanzamento: { fatti: 2, totale: 8 } }),
      punto({ chiave: 'p2', nome: 'Forziere fatto', pin: otto.slice(0, 3), avanzamento: { fatti: 3, totale: 3 }, stato: 'ottenuto' }),
      punto({ chiave: 'p3', nome: 'Forziere singolo', pin: [pin(9)], avanzamento: { fatti: 0, totale: 1 } }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    expect(screen.getByRole('button', { name: /Installazioni artistiche/ })).toHaveTextContent('In corso · 2/8');
    expect(screen.getByRole('button', { name: /Forziere fatto/ })).toHaveTextContent('3/3');
    expect(screen.getByRole('button', { name: /Forziere singolo/ })).not.toHaveTextContent(/\d\/\d/);
  });

  it('«Riapri» con voci condivise chiede conferma con «Riapre anche: …»; «Annulla» non tocca niente, «Riapri» riapre', async () => {
    const onPuntoAggiornato = vi.fn();
    const cambiaStato = vi.fn().mockResolvedValue(true);
    render(<MemoryRouter><GuidaDellArea area={area([punto({ chiave: 'p1', nome: 'Forziere d’oro', stato: 'ottenuto', pin: [pin(1)], avanzamento: { fatti: 1, totale: 1 },
      condivise: [{ chiave: 'k4-forziere', nome: 'Forziere d’oro (di nuovo)', infiltrazione: { chiave: 'k-04', nome: 'Torre' } }] })])}
      planimetrie={planimetrie} partitaId={4} mappaAperta="m-sala" cambiaStato={cambiaStato} onPuntoAggiornato={onPuntoAggiornato} onRicarica={vi.fn()} areePalazzo={altreInfiltrazioni} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    fireEvent.click(screen.getByRole('button', { name: /Forziere d’oro/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Riapri' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Riaprire «Forziere d’oro»?' }));
    expect(finestra.getByText('Riapre anche: Forziere d’oro (di nuovo) — 4ª infiltrazione.')).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: 'Annulla' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(cambiaStato).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riapri' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Riaprire «Forziere d’oro»?' })).getByRole('button', { name: 'Riapri' }));
    await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'p1' }), null));
  });

  // §8.6 (O4-2): togliere il segno a un passo di un Enigma risolto lo riapre: prima si chiede conferma, nella stessa finestra
  it('§8.6: «Riapri» su un passo di un Enigma risolto chiede «Riapre anche l’Enigma «…»»; «Annulla» lascia tutto com’era', async () => {
    const enigmaRisolto = punto({ chiave: 'e1', tipo: 'puzzle', nome: 'Ogni libro al suo posto', stato: 'ottenuto', esauribile: false });
    const passo = punto({ chiave: 'e1-a', tipo: 'meccanismo', nome: 'Sistema i libri', contenitore: 'e1', stato: 'ottenuto', esauribile: false, pin: [pin(1)] });
    const { cambiaStato } = monta([enigmaRisolto, passo]);
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sistema i libri/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Riapri' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Riaprire «Sistema i libri»?' }));
    expect(finestra.getByText('Riapre anche l’Enigma «Ogni libro al suo posto».')).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: 'Annulla' }));
    expect(cambiaStato).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Riapri' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Riapri' }));
    await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'e1-a' }), null));
  });

  it('§8.6: con l’Enigma non risolto il passo si riapre senza conferma', async () => {
    const enigmaAperto = punto({ chiave: 'e1', tipo: 'puzzle', nome: 'Ogni libro al suo posto', stato: null, esauribile: false });
    const passo = punto({ chiave: 'e1-a', tipo: 'meccanismo', nome: 'Sistema i libri', contenitore: 'e1', stato: 'ottenuto', esauribile: false, pin: [pin(1)] });
    const altro = punto({ chiave: 'e1-b', tipo: 'meccanismo', nome: 'Apri la teca', contenitore: 'e1', stato: null, esauribile: false });
    const { cambiaStato } = monta([enigmaAperto, passo, altro]);
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    fireEvent.click(screen.getByRole('button', { name: /Sistema i libri/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Riapri' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'e1-a' }), null));
  });

  it('«Riapri» senza voci condivise riapre subito, senza conferma', async () => {
    const { cambiaStato } = monta([punto({ chiave: 'p1', stato: 'ottenuto', pin: [pin(1)], condivise: [] })]);
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Riapri' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'p1' }), null));
  });
});

// L4 §4.1: il carattere della voce accanto al tipo — «Permanente» (lucchetto aperto, chiuso se fatta), «Si ripropone» (ciclo; lo stato vale in
// quest'infiltrazione), «Racconto» (si segna come «Letto», non conta) — e nella «Modifica» il selettore «Carattere» con «Ripristina» alla regola
describe('§4.1: il carattere della voce', () => {
  it('la riga porta il chip del carattere accanto al tipo; senza carattere (dedali, Persona) niente chip', () => {
    monta([
      punto({ chiave: 'p1', nome: 'Forziere della sala', carattere: 'permanente' }),
      punto({ chiave: 'p2', tipo: 'oggetto', nome: 'Bottiglia a terra', carattere: 'rigenerabile' }),
      punto({ chiave: 'p3', tipo: 'storia', nome: 'Il quadro parla', carattere: 'descrittiva' }),
      punto({ chiave: 'p4', tipo: 'persona', nome: 'Pixie', carattere: null }),
    ]);
    const riga = (nome: RegExp) => screen.getByRole('button', { name: nome });
    expect(within(riga(/Forziere della sala/)).getByText('Permanente')).toHaveClass('chip');
    expect(within(riga(/Bottiglia a terra/)).getByText('Si ripropone')).toHaveClass('chip');
    expect(within(riga(/Il quadro parla/)).getByText('Racconto')).toHaveClass('chip');
    expect(within(riga(/Pixie/)).queryByText(/^(Permanente|Si ripropone|Racconto)$/)).toBeNull();
  });

  it('aperta: «Si ripropone» dice che lo stato vale in quest’infiltrazione; un Racconto si segna come «Letto» e non conta', async () => {
    const { cambiaStato } = monta([
      punto({ chiave: 'p2', tipo: 'oggetto', nome: 'Bottiglia a terra', esauribile: false, carattere: 'rigenerabile' }),
      punto({ chiave: 'p3', tipo: 'storia', nome: 'Il quadro parla', esauribile: false, carattere: 'descrittiva' }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Bottiglia a terra/ }));
    expect(screen.getByText('Si ripropone: il suo stato vale in quest’infiltrazione.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Il quadro parla/ }));
    expect(screen.getByText('Racconto: si segna come letto e non conta nel completamento.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ottenuto' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Letto' }));
    await waitFor(() => expect(cambiaStato).toHaveBeenCalledWith(expect.objectContaining({ chiave: 'p3' }), 'ottenuto'));
  });

  // §4.1 (segnalazione C, R4-34): «Esaurito» si vede — chip proprio, non più solo « · esaurito» nel testo — e la riga ha un'opacità diversa da «ottenuto»
  it('«Esaurito» è un chip proprio, non testo, e la riga è più tenue di una «ottenuto»', () => {
    monta([
      punto({ chiave: 'p1', nome: 'Forziere svuotato', carattere: 'permanente', stato: 'esaurito' }),
      punto({ chiave: 'p2', nome: 'Forziere aperto', carattere: 'permanente', stato: 'ottenuto' }),
    ]);
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    const esaurito = screen.getByRole('button', { name: /Forziere svuotato/ });
    const ottenuto = screen.getByRole('button', { name: /Forziere aperto/ });
    expect(within(esaurito).getByText('Esaurito')).toHaveClass('chip');
    expect(esaurito).not.toHaveTextContent('· esaurito');
    expect(within(ottenuto).queryByText('Esaurito')).toBeNull();
    expect(ottenuto).toHaveTextContent('· ottenuto');
    expect(esaurito).toHaveClass('opacity-40');
    expect(ottenuto).toHaveClass('opacity-60');
  });

  it('un Racconto segnato dice «letto» nella riga, non «ottenuto»', () => {
    monta([punto({ chiave: 'p3', tipo: 'storia', nome: 'Il quadro parla', esauribile: false, carattere: 'descrittiva', stato: 'ottenuto' })]);
    fireEvent.click(screen.getByRole('button', { name: /Anche le segnate/ }));
    const riga = screen.getByRole('button', { name: /Il quadro parla/ });
    expect(riga).toHaveTextContent('· letto');
    expect(riga).not.toHaveTextContent('ottenuto');
  });

  it('«Modifica»: il selettore «Carattere» parte dalla regola senza «Ripristina»; scegliere «Racconto» salva il carattere', async () => {
    monta([punto({ chiave: 'p1', nome: 'Forziere della sala', carattere: 'permanente', carattereScelto: false })]);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    expect(screen.getByRole('combobox', { name: 'Carattere' })).toHaveTextContent('Permanente');
    expect(screen.getByText('Dalla regola del tipo.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ripristina' })).toBeNull();
    scegliVoce('Carattere', /^Racconto/);
    aggiornaPunto.mockResolvedValue(punto({ chiave: 'p1', carattere: 'descrittiva', carattereScelto: true }));
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalledWith('p1', expect.objectContaining({ carattere: 'descrittiva' })));
  });

  it('«Modifica» di una voce col carattere scelto: «Ripristina» torna alla regola e salva null; senza toccarlo il corpo non lo porta', async () => {
    monta([punto({ chiave: 'p1', nome: 'Forziere della sala', carattere: 'rigenerabile', carattereScelto: true })]);
    fireEvent.click(screen.getByRole('button', { name: /Forziere della sala/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    expect(screen.getByRole('combobox', { name: 'Carattere' })).toHaveTextContent('Si ripropone');
    fireEvent.change(screen.getByRole('textbox', { name: 'Nome' }), { target: { value: 'Forziere della sala grande' } });
    aggiornaPunto.mockResolvedValue(punto({ chiave: 'p1' }));
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenCalled());
    expect(aggiornaPunto.mock.calls.at(-1)![1]).not.toHaveProperty('carattere');
    fireEvent.click(screen.getByRole('button', { name: /^Modifica: la voce «Forziere della sala»/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Ripristina' }));
    expect(screen.getByRole('combobox', { name: 'Carattere' })).toHaveTextContent('Permanente');
    expect(screen.queryByRole('button', { name: 'Ripristina' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^Salva/ }));
    await waitFor(() => expect(aggiornaPunto).toHaveBeenLastCalledWith('p1', expect.objectContaining({ carattere: null })));
  });
});
