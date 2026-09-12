/** @vitest-environment jsdom */
// ============================================================
// Test DungeonDettaglioPage — la raccolta sulle planimetrie con «Raccolto», gli obiettivi dei dedali, i punti della guida ripiegati
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DungeonDettaglioPage } from './DungeonDettaglioPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { AreaDungeonDto, DungeonDettaglioDto, PartitaDto } from '../types';

const { getDungeon, impostaStatoPunto, scaricaPianta, impostaSpilloRaccolto, impostaTimbri, impostaStatoRichiesta } = vi.hoisted(() => ({
  getDungeon: vi.fn(), impostaStatoPunto: vi.fn(), scaricaPianta: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaTimbri: vi.fn(), impostaStatoRichiesta: vi.fn(),
}));
vi.mock('../services/api', () => ({ getDungeon, impostaStatoPunto, scaricaPianta }));
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
  chiave: 'k-01', ordine: 0, nome: 'Cancello', descrizione: '', mappa: false, piantaScaricata: null, pianta: null, piantaAssente: null, mappe: [], punti: [], dedalo: null, ...extra,
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
    { chiave: 'm-cancello', nome: 'Palazzo di Kamoshida › Cancello', n: 2, presi: partita ? 1 : null, spilli: [spillo(1, partita ? true : null), spillo(2, partita ? false : null)] },
    { chiave: 'm-torre', nome: 'Palazzo di Kamoshida › Torre', n: 2, presi: partita ? 0 : null, spilli: [spillo(3, partita ? false : null), spillo(4, partita ? false : null)] },
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

beforeEach(() => { vi.clearAllMocks(); usePartitaStore.setState({ attiva: { id: 4, nome: 'Royal' } as PartitaDto }); });

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
  // l'area dell'elenco dice quanto resta con la stessa misura dell'anello
  expect(screen.getAllByRole('tab', { name: /1\. Cancello/ }).length).toBeGreaterThan(0);
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
  expect(screen.getByText('nessuna planimetria legata')).toBeInTheDocument();
});

it('un’area con la planimetria legata ma senza collezionabili lo dice così, e la colonna mostra il Palazzo', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  render(<MemoryRouter initialEntries={['/guida/dungeon/kamoshida?area=k-03']}><Routes><Route path="/guida/dungeon/:chiave" element={<DungeonDettaglioPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(screen.getByText('Visore: m-cortile')).toBeInTheDocument();
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere nel Palazzo di Kamoshida' });
  expect(within(colonna).getByText(/La planimetria di quest’area non ha collezionabili/)).toBeInTheDocument();
  expect(within(colonna).queryByText(/non ha planimetrie legate/)).toBeNull();
  expect(screen.getByText('niente da raccogliere sulla sua planimetria')).toBeInTheDocument();
  expect(screen.getByText('nessuna planimetria legata')).toBeInTheDocument();
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
