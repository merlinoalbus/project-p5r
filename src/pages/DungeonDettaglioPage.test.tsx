/** @vitest-environment jsdom */
// ============================================================
// Test DungeonDettaglioPage — la raccolta sulle planimetrie con «Raccolto», gli obiettivi dei dedali, i punti della guida ripiegati
// ============================================================

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DungeonDettaglioPage } from './DungeonDettaglioPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { AreaDungeonDto, DungeonDettaglioDto, PartitaDto } from '../types';

const { getDungeon, impostaStatoPunto, impostaSpilloRaccolto, impostaTimbri, impostaStatoRichiesta, riordinaMappe, aggiornaMappa, creaMappa, eliminaMappa, getAlberoMappe, aggiornaDungeon, aggiornaArea, aggiornaPunto, creaPunto, eliminaPunto, aggiornaPresentazioneMappa, impostaAreeMappa } = vi.hoisted(() => ({
  getDungeon: vi.fn(), impostaStatoPunto: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaTimbri: vi.fn(), impostaStatoRichiesta: vi.fn(),
  riordinaMappe: vi.fn(), aggiornaMappa: vi.fn(), creaMappa: vi.fn(), eliminaMappa: vi.fn(), getAlberoMappe: vi.fn(), aggiornaDungeon: vi.fn(), aggiornaArea: vi.fn(), aggiornaPunto: vi.fn(), creaPunto: vi.fn(), eliminaPunto: vi.fn(), aggiornaPresentazioneMappa: vi.fn(), impostaAreeMappa: vi.fn(),
}));
vi.mock('../services/api', () => ({ getDungeon, impostaStatoPunto, riordinaMappe, aggiornaMappa, creaMappa, eliminaMappa, getAlberoMappe, aggiornaDungeon, aggiornaArea, aggiornaPunto, creaPunto, eliminaPunto, aggiornaPresentazioneMappa, impostaAreeMappa, urlImmagine: (ambito: string, chiave: string) => `/api/immagini/${ambito}/${encodeURIComponent(chiave)}/file` }));
vi.mock('../services/api/mappe', () => ({ impostaSpilloRaccolto }));
vi.mock('../services/api/partite', () => ({ impostaTimbri, impostaStatoRichiesta }));
vi.mock('../stores/notificationStore', () => ({ notifica: vi.fn() }));
vi.mock('../stores/suggerimentiStore', () => ({ useSuggerimenti: () => ({ evidenziato: () => false, motivo: () => null }) }));
vi.mock('../components/mappe/MappaIncorporata', () => ({ MappaIncorporata: ({ chiave }: { chiave: string }) => <div>Visore: {chiave}</div> }));
vi.mock('../components/mappe/MappaMemento', () => ({ MappaMemento: () => <div>Pozzo</div> }));
vi.mock('../components/mappe/CollegamentoMappa', () => ({ CollegamentoMappa: () => null }));
vi.mock('../components/shared/ImmagineEntita', () => ({ ImmagineEntita: () => <div>Immagine</div> }));
vi.mock('../components/guida/EmblemaDungeon', () => ({ EmblemaDungeon: () => null }));

const spillo = (id: number, raccolto: boolean | null) => ({ id, uid: `u${id}`, tipo: 'forziere', nome: 'Forziere', colore: '#eab308', raccolto });
const area = (extra: Partial<AreaDungeonDto>): AreaDungeonDto => ({
  chiave: 'k-01', ordine: 0, nome: 'Cancello', descrizione: '', mappa: false, mappe: [], punti: [], dedalo: null, ...extra,
});
const palazzo = (partita: boolean): DungeonDettaglioDto => ({
  chiave: 'kamoshida', tipo: 'palazzo', ordine: 1, nome: 'Palazzo di Kamoshida', sovrano: 'Kamoshida', arcanaSovrano: '', arcanaSovranoNome: '',
  date: { sblocco: '12 Aprile', scadenza: '2 maggio', furtoConsigliato: '' }, finestra: null, livelloConsigliato: '', punti: 2, esauribili: 1, gestiti: partita ? 0 : null,
  raccolta: { totale: 4, presi: partita ? 1 : null, mappe: 2, mappeComplete: partita ? 0 : null }, note: '', fonti: [],
  aree: [
    area({ mappe: [{ chiave: 'm-cancello', nome: 'Palazzo di Kamoshida › Cancello', n: 2, presi: partita ? 1 : null, spilli: [spillo(1, partita ? true : null), spillo(2, partita ? false : null)] }], punti: [{ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: null, marcatore: null }] }),
    area({ chiave: 'k-02', ordine: 1, nome: 'Torre', punti: [] }),
    area({ chiave: 'k-03', ordine: 2, nome: 'Cortile', mappe: [{ chiave: 'm-cortile', nome: 'Palazzo di Kamoshida › Cortile', n: 0, presi: partita ? 0 : null, spilli: [] }] }),
  ],
  planimetrie: [
    { chiave: 'm-cancello', nome: 'Palazzo di Kamoshida › Cancello', ordine: 0, aree: [{ chiave: 'k-01', nome: 'Cancello', ordine: 0 }], n: 2, presi: partita ? 1 : null, spilli: [spillo(1, partita ? true : null), spillo(2, partita ? false : null)] },
    { chiave: 'm-torre', nome: 'Palazzo di Kamoshida › Torre', ordine: 1, aree: [], n: 2, presi: partita ? 0 : null, spilli: [spillo(3, partita ? false : null), spillo(4, partita ? false : null)] },
  ],
});
const mementos = (): DungeonDettaglioDto => ({
  ...palazzo(true), chiave: 'mementos', tipo: 'mementos', nome: 'Memento', raccolta: { totale: 9, presi: 1, mappe: 2, mappeComplete: 0 }, planimetrie: [],
  aree: [
    area({ chiave: 'mementos-02-aiyatsbus', nome: 'Dedalo di Aiyatsbus', dedalo: { timbri: { totale: 8, raccolti: 1 }, richieste: [{ chiave: 'bulli', nome: 'Bullismo sui bulli', stato: null }], obiettivi: { totale: 9, fatti: 1 } }, punti: [{ chiave: 'p2', ordine: 0, tipo: 'boss', nome: 'Boss', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: null, marcatore: null }] }),
    area({ chiave: 'mementos-01-qimranut', ordine: 1, nome: 'Dedalo di Qimranut', dedalo: { timbri: { totale: null, raccolti: null }, richieste: [], obiettivi: { totale: 0, fatti: 0 } } }),
  ],
});

const monta = (chiave: string) => render(<MemoryRouter initialEntries={[`/guida/dungeon/${chiave}`]}><Routes><Route path="/guida/dungeon/:chiave" element={<DungeonDettaglioPage />} /></Routes></MemoryRouter>);

beforeEach(() => { vi.clearAllMocks(); getAlberoMappe.mockResolvedValue([]); usePartitaStore.setState({ attiva: { id: 4, nome: 'Royal' } as PartitaDto }); });

it('in un Palazzo la colonna elenca i collezionabili delle planimetrie e «Raccolto» aggiorna anello e conteggi senza ricaricare', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  impostaSpilloRaccolto.mockResolvedValue({});
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(getDungeon).toHaveBeenCalledWith('kamoshida', 4);
  // l'anello: 1 su 4
  expect(screen.getByRole('progressbar', { name: /Avanzamento in Palazzo di Kamoshida/ })).toHaveAttribute('aria-valuenow', '25');
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere in Cancello' });
  expect(within(colonna).getByRole('heading', { name: 'Da raccogliere · 1' })).toBeInTheDocument();
  // il raccolto sta nascosto finché non si chiede
  expect(within(colonna).queryByRole('checkbox', { name: 'Forziere 1 di Cancello raccolto' })).toBeNull();
  fireEvent.click(within(colonna).getByRole('checkbox', { name: 'Forziere 2 di Cancello raccolto' }));
  await waitFor(() => expect(impostaSpilloRaccolto).toHaveBeenCalledWith(4, 2, true));
  await waitFor(() => expect(screen.getByRole('progressbar', { name: /Avanzamento in Palazzo di Kamoshida/ })).toHaveAttribute('aria-valuenow', '50'));
  expect(getDungeon).toHaveBeenCalledTimes(1);
  // le altre planimetrie del Palazzo, ripiegate con quanto resta; i punti della guida in una piega a parte con Ottenuto
  expect(screen.getByText(/Tutte le planimetrie del Palazzo · 2 da raccogliere/)).toBeInTheDocument();
  fireEvent.click(screen.getByText(/Dalla guida · 1 punti/));
  fireEvent.click(screen.getByRole('button', { name: /Sicura del cancello/ }));
  impostaStatoPunto.mockResolvedValue({ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: 'ottenuto', marcatore: null });
  fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
  await waitFor(() => expect(impostaStatoPunto).toHaveBeenCalledWith(4, 'p1', 'ottenuto'));
  // un punto della guida può contare sulle planimetrie: la raccolta si rilegge dal server
  await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(2));
  // la stanza compare nell'elenco del Palazzo, con l'area a cui è legata
  expect(within(screen.getByLabelText('Planimetrie del Palazzo')).getAllByText(/Cancello/).length).toBeGreaterThan(0);
});

it('quando l’area non ha planimetrie legate la colonna mostra subito tutto il Palazzo, non una piega chiusa', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  render(<MemoryRouter initialEntries={['/guida/dungeon/kamoshida?area=k-02']}><Routes><Route path="/guida/dungeon/:chiave" element={<DungeonDettaglioPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere nel Palazzo di Kamoshida' });
  expect(within(colonna).getByRole('heading', { name: 'Da raccogliere nel Palazzo · 3' })).toBeInTheDocument();
  expect(within(colonna).getByText(/Quest’area non ha planimetrie legate/)).toBeInTheDocument();
  expect(within(colonna).queryByText(/Tutte le planimetrie del Palazzo/)).toBeNull();
  expect(within(colonna).getAllByRole('checkbox')).toHaveLength(3);
  // nell'elenco unico un'area senza planimetria è una riga in coda, da collegare
  expect(screen.getAllByText('area della guida · nessuna planimetria').length).toBeGreaterThan(0);
});

it('un’area con la planimetria legata ma senza collezionabili lo dice così, e la colonna mostra il Palazzo', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  render(<MemoryRouter initialEntries={['/guida/dungeon/kamoshida?area=k-03']}><Routes><Route path="/guida/dungeon/:chiave" element={<DungeonDettaglioPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(screen.getByText('Visore: m-cortile')).toBeInTheDocument();
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere nel Palazzo di Kamoshida' });
  expect(within(colonna).getByText(/La planimetria di quest’area non ha collezionabili/)).toBeInTheDocument();
  expect(within(colonna).queryByText(/non ha planimetrie legate/)).toBeNull();
  expect(screen.getAllByText('area della guida · nessuna planimetria').length).toBeGreaterThan(0);
});

it('senza partita non ci sono spunte, e l’elenco resta consultabile', async () => {
  usePartitaStore.setState({ attiva: null });
  getDungeon.mockResolvedValue(palazzo(false));
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).toBeNull();
  expect(screen.getByRole('heading', { name: 'Da raccogliere · 2' })).toBeInTheDocument();
  expect(screen.queryByRole('progressbar', { name: /Avanzamento/ })).toBeNull();
});

it('nei Memento la colonna sono gli obiettivi del dedalo: timbri con −/+ e richieste con Completata; niente pianta della guida', async () => {
  getDungeon.mockResolvedValue(mementos());
  impostaTimbri.mockResolvedValue({ area: 'mementos-02-aiyatsbus', raccolti: 2, totale: 8, completato: false });
  impostaStatoRichiesta.mockResolvedValue({ chiave: 'bulli', stato: 'completata' });
  monta('mementos');
  expect(await screen.findByRole('heading', { name: 'Memento' })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Pianta della guida' })).toBeNull();
  const colonna = screen.getByRole('complementary', { name: 'Obiettivi di Dedalo di Aiyatsbus' });
  expect(within(colonna).getByText('1 su 8')).toBeInTheDocument();
  fireEvent.click(within(colonna).getByRole('button', { name: 'Aggiungi un timbro' }));
  await waitFor(() => expect(impostaTimbri).toHaveBeenCalledWith(4, 'mementos-02-aiyatsbus', 2));
  await waitFor(() => expect(within(colonna).getByText('2 su 8')).toBeInTheDocument());
  // l'anello segue: (2 timbri + 0 richieste) su 9
  expect(screen.getByRole('progressbar', { name: /Avanzamento in Memento/ })).toHaveAttribute('aria-valuenow', '22');
  fireEvent.click(within(colonna).getByRole('button', { name: 'Completata' }));
  await waitFor(() => expect(impostaStatoRichiesta).toHaveBeenCalledWith(4, 'bulli', 'completata'));
  await waitFor(() => expect(screen.getByRole('progressbar', { name: /Avanzamento in Memento/ })).toHaveAttribute('aria-valuenow', '33'));
  // il dedalo senza timbri dichiarati lo dice, senza contatore
  fireEvent.click(screen.getByRole('tab', { name: /2\. Dedalo di Qimranut/ }));
  expect(await screen.findByText('non dichiarati dalla guida')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Aggiungi un timbro' })).toBeNull();
});

// ---- L'elenco del Palazzo (ordine logico, legame con l'area, planimetria libera) ----
//
// Non si apre più niente: **l'elenco è la colonna di atterraggio** (scelta dell'utente,
// 2026-09-19). Prima stava dietro un pulsante, e chi non sapeva di doverlo premere non vedeva
// nessun modo di sistemare le planimetrie del Palazzo.

async function apriPlanimetrie() {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  return within(screen.getByLabelText('Planimetrie del Palazzo'));
}

it('il pannello elenca le stanze in ordine, con quanto resta e l’area a cui sono legate', async () => {
  const pannello = await apriPlanimetrie();
  expect(pannello.getAllByText(/1\. Cancello/).length).toBeGreaterThan(0);
  expect(pannello.getByText(/una planimetria · 1 da prendere su 2/)).toBeInTheDocument();
  expect(pannello.getByText(/una planimetria · 2 da prendere su 2/)).toBeInTheDocument();
  // l'area a cui la stanza è legata sta sulla riga sotto, per esteso
  expect(pannello.getAllByText('nessuna area').length).toBeGreaterThan(0);
});

it('«Giù» salva il nuovo ordine di tutto il Palazzo', async () => {
  const pannello = await apriPlanimetrie();
  riordinaMappe.mockResolvedValue([]);
  // l'ordine si sblocca quando l'atlante è arrivato: prima di allora il tasto è spento
  await waitFor(() => expect(pannello.getByRole('button', { name: /Sposta «Cancello» giù/ })).not.toBeDisabled());
  fireEvent.click(pannello.getByRole('button', { name: /Sposta «Cancello» giù/ }));
  await waitFor(() => expect(riordinaMappe).toHaveBeenCalledWith('dungeon-kamoshida', ['m-torre', 'm-cancello']));
});

it('aperta la stanza, scegliere la sua planimetria apre il visore e la colonna dei suoi soli collezionabili', async () => {
  const pannello = await apriPlanimetrie();
  // la stanza si apre, e dentro c'è la sua planimetria con la propria etichetta
  // la riga della stanza, non l'omonima opzione del selettore «Area della guida»
  fireEvent.click(pannello.getAllByRole('button', { name: /2\. Torre/ }).find((b) => b.getAttribute('aria-expanded') !== null)!);
  const stanza = within(pannello.getByRole('list', { name: /Planimetrie di Torre/ }));
  fireEvent.click(stanza.getAllByRole('button', { name: /Immagine 1/ }).find((b) => b.getAttribute('aria-pressed') !== null)!);
  expect(await screen.findByText('Visore: m-torre')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Su questa planimetria/ })).toBeInTheDocument();
});

it('finché l’atlante non è caricato l’ordine resta bloccato: senza di lui non si sa quali tavole sono la stessa stanza', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  let arriva: (v: unknown) => void = () => {};
  getAlberoMappe.mockReturnValue(new Promise((r) => { arriva = r; }));
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
  expect(pannello.getByRole('status')).toHaveTextContent(/l’ordine si sblocca appena arriva/);
  expect(pannello.getByRole('button', { name: /Sposta «Cancello» giù/ })).toBeDisabled();
  await act(async () => { arriva([]); });
  expect(pannello.getByRole('button', { name: /Sposta «Cancello» giù/ })).not.toBeDisabled();
});

it('l’elenco del Palazzo è la colonna di atterraggio: niente da aprire per sistemare le planimetrie', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  // nessun pulsante che apra un pannello: l'elenco c'è già, con i suoi comandi
  expect(screen.queryByRole('button', { name: /Gestisci le planimetrie/i })).toBeNull();
  const elenco = within(screen.getByLabelText('Planimetrie del Palazzo'));
  expect(elenco.getAllByRole('button', { name: /^Trascina «/ }).length).toBeGreaterThan(0);
  expect(elenco.getAllByRole('button', { name: /^Correggi la stanza/ }).length).toBeGreaterThan(0);
});

it('un’area senza planimetria si collega dalla sua riga in coda all’elenco', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  impostaAreeMappa.mockResolvedValue({ aree: [] });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const elenco = within(screen.getByLabelText('Planimetrie del Palazzo'));
  // «Torre» è un'area che la guida racconta ma di cui nessuna tavola dice di essere la pianta
  expect(elenco.getAllByText('area della guida · nessuna planimetria').length).toBe(1);
  fireEvent.click(elenco.getAllByLabelText('Collega una planimetria')[0]);
  // la prima è «— scegli —»; poi **tutte** le tavole, anche quella che contiene già un'area, e lo dicono
  const opzioni = await screen.findAllByRole('option');
  expect(opzioni).toHaveLength(3);
  expect(opzioni[1]).toHaveTextContent(/Cancello.*contiene Cancello/);
  expect(opzioni[2]).toHaveTextContent(/Torre.*nessuna area/);
  fireEvent.click(opzioni[2].querySelector('button')!);
  await waitFor(() => expect(impostaAreeMappa).toHaveBeenCalledWith('m-torre', ['k-02']));
  expect(aggiornaMappa).not.toHaveBeenCalled();
});

it('collegare un’area a una tavola che ne contiene già altre la aggiunge, non le sostituisce', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  impostaAreeMappa.mockResolvedValue({ aree: [] });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  fireEvent.click(within(screen.getByLabelText('Planimetrie del Palazzo')).getAllByLabelText('Collega una planimetria')[0]);
  const opzioni = await screen.findAllByRole('option');
  fireEvent.click(opzioni[1].querySelector('button')!);
  await waitFor(() => expect(impostaAreeMappa).toHaveBeenCalledWith('m-cancello', ['k-01', 'k-02']));
});

// ---- Più aree della guida nella stessa planimetria (richiesta dell'utente, 2026-09-29) ----

/** Il Palazzo di prova con «Cancello» che contiene anche «Cortile», e «Torre» legata a una tavola sua. */
const palazzoConPiuAree = (): DungeonDettaglioDto => {
  const p = palazzo(true);
  const cancello = { ...p.planimetrie[0], aree: [{ chiave: 'k-03', nome: 'Cortile', ordine: 2 }, { chiave: 'k-01', nome: 'Cancello', ordine: 0 }] };
  const torre = { ...p.planimetrie[1], aree: [{ chiave: 'k-02', nome: 'Torre', ordine: 1 }] };
  return {
    ...p,
    planimetrie: [cancello, torre],
    aree: [
      { ...p.aree[0], mappe: [{ chiave: 'm-cancello', nome: cancello.nome, n: cancello.n, presi: cancello.presi, spilli: cancello.spilli }] },
      { ...p.aree[1], mappe: [{ chiave: 'm-torre', nome: torre.nome, n: torre.n, presi: torre.presi, spilli: torre.spilli }] },
      { ...p.aree[2], mappe: [{ chiave: 'm-cancello', nome: cancello.nome, n: cancello.n, presi: cancello.presi, spilli: cancello.spilli }] },
    ],
  };
};

it('una planimetria con più aree le mostra in ordine di guida: nell’elenco del Palazzo e sopra la mappa', async () => {
  getDungeon.mockResolvedValue(palazzoConPiuAree());
  getAlberoMappe.mockResolvedValue([]);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  // la riga della stanza: le aree nell'ordine della guida, non in quello in cui arrivano
  const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
  expect(pannello.getByText('1. Cancello · 3. Cortile')).toBeInTheDocument();
  // sopra la mappa, le aree della planimetria a schermo: toccarne una apre quell'area sulla stessa mappa
  const sullaPianta = within(screen.getByRole('list', { name: 'Aree della guida su questa planimetria' }));
  const voci = sullaPianta.getAllByRole('button');
  expect(voci.map((b) => b.textContent)).toEqual(['1. Cancello', '3. Cortile']);
  expect(voci[0]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(voci[1]);
  expect(await screen.findByRole('heading', { name: 'Cortile' })).toBeInTheDocument();
  expect(screen.getByText('Visore: m-cancello')).toBeInTheDocument();
});

it('le aree di una planimetria si scelgono insieme: la finestra le elenca in ordine, dice dove stanno le altre e salva l’insieme', async () => {
  getDungeon.mockResolvedValue(palazzoConPiuAree());
  getAlberoMappe.mockResolvedValue([]);
  impostaAreeMappa.mockResolvedValue({ aree: [] });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
  // la stanza aperta è quella della planimetria a schermo: le sue aree stanno nella riga della versione
  expect(within(pannello.getByRole('list', { name: 'Aree della guida di «Immagine 1»' })).getAllByRole('listitem').map((l) => l.textContent)).toEqual(['1. Cancello', '3. Cortile']);
  fireEvent.click(pannello.getByRole('button', { name: /Scegli le aree della guida di «Immagine 1» di Cancello/ }));
  const finestra = within(screen.getByRole('dialog', { name: /Aree della guida/ }));
  const caselle = finestra.getAllByRole('checkbox');
  // tutte le aree del Palazzo, in ordine di guida, con spuntate quelle della planimetria
  expect(caselle.map((c) => c.closest('label')!.textContent)).toEqual(['1. Cancello', '2. Torreora su «Torre»', '3. Cortile']);
  expect(caselle.map((c) => (c as HTMLInputElement).checked)).toEqual([true, false, true]);
  // senza cambiamenti non si salva niente
  expect(finestra.getByRole('button', { name: 'Salva' })).toBeDisabled();
  fireEvent.click(caselle[1]);
  // spuntare un'area che sta altrove lo dice prima di salvare
  expect(finestra.getByText(/si sposta qui da «Torre»/)).toBeInTheDocument();
  expect(finestra.getByRole('status')).toHaveTextContent('Un’area lascia la planimetria dove stava: Torre.');
  fireEvent.click(caselle[0]);
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(impostaAreeMappa).toHaveBeenCalledWith('m-cancello', ['k-02', 'k-03']));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(aggiornaMappa).not.toHaveBeenCalled();
});

// ---- Le correzioni della guida (rilievi della revisione, 2026-09-18) ----

it('la bozza di correzione appartiene al pezzo che stai correggendo, non alla schermata', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  aggiornaArea.mockResolvedValue({});
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();

  // scrivo nel modulo dell'area, poi cambio area senza salvare
  fireEvent.click(screen.getByRole('button', { name: /Correggi l’area/ }));
  const modulo = screen.getByRole('form', { name: /Correggi l’area/ });
  fireEvent.change(within(modulo).getByLabelText('Nome dell’area'), { target: { value: 'Scritto per sbaglio' } });
  // si cambia area dall'elenco: «Torre» è un'area senza planimetria, in coda
  // la riga dell'area, non l'omonima opzione del selettore «Area della guida»
  fireEvent.click(within(screen.getByLabelText('Planimetrie del Palazzo')).getAllByRole('button', { name: /2\. Torre/ }).find((b) => b.getAttribute('aria-pressed') !== null)!);

  // il modulo si è chiuso con la sua bozza: riaprendolo sull'altra area c'è il nome dell'altra area
  fireEvent.click(screen.getByRole('button', { name: /Correggi l’area/ }));
  expect(within(screen.getByRole('form', { name: /Correggi l’area/ })).getByLabelText('Nome dell’area')).toHaveValue('Torre');
  expect(aggiornaArea).not.toHaveBeenCalled();
});

it('salvata l’intestazione, la scheda si rilegge con la partita attiva', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  aggiornaDungeon.mockResolvedValue(palazzo(false));
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  getDungeon.mockClear();
  fireEvent.click(screen.getByRole('button', { name: /Correggi il Palazzo/ }));
  const modulo = screen.getByRole('form', { name: /Correggi il Palazzo/ });
  fireEvent.change(within(modulo).getByLabelText('Nome'), { target: { value: 'Castello' } });
  fireEvent.click(within(modulo).getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaDungeon).toHaveBeenCalledWith('kamoshida', expect.objectContaining({ nome: 'Castello' })));
  // la risposta del PUT non porta lo stato della partita: la scheda si rilegge con l'id
  await waitFor(() => expect(getDungeon).toHaveBeenCalledWith('kamoshida', 4));
});

it('correggendo una stanza si rilegge anche l’atlante: lì stanno il nome della stanza e l’etichetta', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  aggiornaPresentazioneMappa.mockResolvedValue({});
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  await waitFor(() => expect(getAlberoMappe).toHaveBeenCalled());
  getAlberoMappe.mockClear();

  const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
  fireEvent.click(pannello.getAllByRole('button', { name: /Correggi la stanza/ })[0]);
  const modulo = screen.getByRole('form', { name: /Correggi la stanza/ });
  fireEvent.change(within(modulo).getByLabelText('Nome della stanza'), { target: { value: 'Ingresso' } });
  fireEvent.click(within(modulo).getByRole('button', { name: 'Salva' }));

  await waitFor(() => expect(aggiornaPresentazioneMappa).toHaveBeenCalledWith('m-cancello', { gruppoNome: 'Ingresso' }));
  // senza questa rilettura il nome salvato restava invisibile fino al ricaricamento della pagina
  await waitFor(() => expect(getAlberoMappe).toHaveBeenCalled());
});
