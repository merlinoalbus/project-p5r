/** @vitest-environment jsdom */
// ============================================================
// Test DungeonDettaglioPage — la raccolta sulle planimetrie con «Raccolto», gli obiettivi dei dedali, i punti della guida ripiegati
// ============================================================

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { DungeonDettaglioPage } from './DungeonDettaglioPage';
import { scegliVoce, vociSelettore } from '../../test/selettore';
import { usePartitaStore } from '../stores/partitaStore';
import type { AreaDedaloDto, AreaDungeonDto, DungeonDettaglioDto, PartitaDto, PuntoInteresseDto } from '../types';
import type { SceltaPin } from '../components/mappe/VisoreMappa';

const { aggiornaCompendio, getDungeon, impostaStatoPunto, impostaSpilloRaccolto, impostaTimbri, impostaStatoRichiesta, riordinaMappe, aggiornaMappa, creaMappa, eliminaMappa, getAlberoMappe, aggiornaDungeon, aggiornaArea, aggiornaPunto, creaPunto, eliminaPunto, aggiornaPresentazioneMappa, impostaAreeMappa, eliminaArea, impostaStanzaMappa, collegaPinAlPunto, spostaPunto, creaArea, impostaAtterraggiDungeon, getMappa } = vi.hoisted(() => ({
  aggiornaCompendio: vi.fn(), getDungeon: vi.fn(), impostaStatoPunto: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaTimbri: vi.fn(), impostaStatoRichiesta: vi.fn(),
  riordinaMappe: vi.fn(), aggiornaMappa: vi.fn(), creaMappa: vi.fn(), eliminaMappa: vi.fn(), getAlberoMappe: vi.fn(), aggiornaDungeon: vi.fn(), aggiornaArea: vi.fn(), aggiornaPunto: vi.fn(), creaPunto: vi.fn(), eliminaPunto: vi.fn(), aggiornaPresentazioneMappa: vi.fn(), impostaAreeMappa: vi.fn(), eliminaArea: vi.fn(), impostaStanzaMappa: vi.fn(), collegaPinAlPunto: vi.fn(), spostaPunto: vi.fn(), creaArea: vi.fn(), impostaAtterraggiDungeon: vi.fn(), getMappa: vi.fn(),
}));
vi.mock('../services/api', (vero) => moduloApi(vero, { aggiornaCompendio, getDungeon, impostaStatoPunto, riordinaMappe, aggiornaMappa, creaMappa, eliminaMappa, getAlberoMappe, aggiornaDungeon, aggiornaArea, aggiornaPunto, creaPunto, eliminaPunto, aggiornaPresentazioneMappa, impostaAreeMappa, eliminaArea, impostaStanzaMappa, collegaPinAlPunto, spostaPunto, creaArea, impostaSpilloRaccolto, impostaTimbri, impostaStatoRichiesta, impostaAtterraggiDungeon, getMappa }));
vi.mock('../stores/notificationStore', (vero) => moduloNotifiche(vero));
vi.mock('../stores/suggerimentiStore', () => ({ useSuggerimenti: () => ({ evidenziato: () => false, motivo: () => null }) }));
// il visore vero è provato a parte: qui dice planimetria e, collegando i pin (2026-10-18), che cosa riceve, e «tocca» il pin 3
vi.mock('../components/mappe/MappaIncorporata', () => ({ MappaIncorporata: ({ chiave, classeVisore, scelta }: { chiave: string; classeVisore?: string; scelta?: SceltaPin }) => (
  <div data-classe-visore={classeVisore}>Visore: {chiave}{scelta ? ` · scelta per ${scelta.titolo} · ${scelta.scelti.size} scelti · sbiaditi ${String(scelta.attenuaNascosti)} · cerca «${scelta.ricerca ?? ''}»` : ''}
    {scelta && <button type="button" onClick={() => scelta.onScegli({ id: 3, nome: 'Forziere della torre' } as Parameters<SceltaPin['onScegli']>[0])}>Tocca il pin 3</button>}</div>
) }));
// il pozzo finto: un pulsante che sceglie Qimranut, come toccarne lo strato
vi.mock('../components/mappe/MappaMemento', () => ({ MappaMemento: ({ onSeleziona }: { onSeleziona?: (k: string) => void }) => <button type="button" onClick={() => onSeleziona?.('mementos-01-qimranut')}>Disegno del pozzo</button> }));
vi.mock('../components/mappe/CollegamentoMappa', () => ({ CollegamentoMappa: () => null }));
vi.mock('../components/shared/ImmagineEntita', () => ({ ImmagineEntita: () => <div>Immagine</div> }));
vi.mock('../components/guida/EmblemaDungeon', () => ({ EmblemaDungeon: () => null }));

/** Uno spillo forziere con id e stato di raccolta dati (`null` = senza partita). */
const spillo = (id: number, raccolto: boolean | null) => ({ id, uid: `u${id}`, tipo: 'forziere', nome: 'Forziere', colore: '#eab308', raccolto });
/** Un'area del dungeon («Cancello», k-01, senza mappe né voci) con i campi di `extra` sovrascritti. */
const area = (extra: Partial<AreaDungeonDto>): AreaDungeonDto => ({
  chiave: 'k-01', ordine: 0, nome: 'Cancello', descrizione: '', mappa: false, mappe: [], punti: [], dedalo: null, ...extra,
});
/** Il Palazzo di Kamoshida di prova: tre aree (Cancello con una sicura e una planimetria di 2 forzieri, Torre, Cortile)
 *  e due planimetrie (Cancello e Torre). Con `partita` i conteggi e gli spilli portano lo stato della partita (1 preso
 *  su 4), senza restano `null`. */
const palazzo = (partita: boolean): DungeonDettaglioDto => ({
  chiave: 'kamoshida', tipo: 'palazzo', ordine: 1, nome: 'Palazzo di Kamoshida', sovrano: 'Kamoshida', arcanaSovrano: '', arcanaSovranoNome: '',
  date: { sblocco: '12 Aprile', scadenza: '2 maggio', furtoConsigliato: '' }, finestra: null, livelloConsigliato: '', punti: 2, esauribili: 1, gestiti: partita ? 0 : null,
  raccolta: { totale: 4, presi: partita ? 1 : null, mappe: 2, mappeComplete: partita ? 0 : null }, completato: null, atterraggio: null, atterraggi: [], personeCatturate: partita ? [] : null, note: '', fonti: [],
  aree: [
    area({ mappe: [{ chiave: 'm-cancello', nome: 'Palazzo di Kamoshida › Cancello', n: 2, presi: partita ? 1 : null, spilli: [spillo(1, partita ? true : null), spillo(2, partita ? false : null)] }], punti: [{ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: null, marcatore: null, pin: [], contenitore: null, areaDedalo: null, persona: null, areeDedalo: [] }] }),
    area({ chiave: 'k-02', ordine: 1, nome: 'Torre', punti: [] }),
    area({ chiave: 'k-03', ordine: 2, nome: 'Cortile', mappe: [{ chiave: 'm-cortile', nome: 'Palazzo di Kamoshida › Cortile', n: 0, presi: partita ? 0 : null, spilli: [] }] }),
  ],
  planimetrie: [
    { chiave: 'm-cancello', nome: 'Palazzo di Kamoshida › Cancello', ordine: 0, aree: [{ chiave: 'k-01', nome: 'Cancello', ordine: 0 }], n: 2, presi: partita ? 1 : null, spilli: [spillo(1, partita ? true : null), spillo(2, partita ? false : null)] },
    { chiave: 'm-torre', nome: 'Palazzo di Kamoshida › Torre', ordine: 1, aree: [], n: 2, presi: partita ? 0 : null, spilli: [spillo(3, partita ? false : null), spillo(4, partita ? false : null)] },
  ],
});
/** Un'area di un dedalo di prova (099) con i campi di `extra` che sovrascrivono i predefiniti: vuota, completata. */
const areaDedalo = (extra: Partial<AreaDedaloDto>): AreaDedaloDto => ({ chiave: 'a', ordine: 0, nome: 'Area 1', descrizione: '', timbri: null, richieste: [], elementi: { totale: 0, fatti: 0 }, completata: true, ...extra });
/** Il Memento di prova: due Dedali. Aiyatsbus ha un'area con una Trama, una Persona (fuori dal conto), una richiesta aperta e i timbri (1 su 8): 1 elemento fatto
 *  su 10; Qimranut un'area vuota, quindi completata, e il dedalo con lei. Nessuna planimetria. */
const mementos = (): DungeonDettaglioDto => ({
  ...palazzo(true), chiave: 'mementos', tipo: 'mementos', nome: 'Memento', raccolta: { totale: 10, presi: 1, mappe: 2, mappeComplete: 1 }, planimetrie: [],
  aree: [
    area({ chiave: 'mementos-02-aiyatsbus', nome: 'Dedalo di Aiyatsbus', dedalo: { aree: [areaDedalo({ chiave: 'aiy-1', timbri: { totale: 8, raccolti: 1 }, richieste: [{ chiave: 'bulli', nome: 'Bullismo sui bulli', stato: null }], elementi: { totale: 10, fatti: 1 }, completata: false })], daCollocare: [], obiettivi: { totale: 10, fatti: 1 }, completato: false },
      punti: [{ chiave: 'p2', ordine: 0, tipo: 'trama', nome: 'Jose alla banchina', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: null, marcatore: null, pin: [], contenitore: null, areaDedalo: 'aiy-1', persona: null, areeDedalo: [] },
        // una Persona: in cima all'area, fuori dal conto (2026-10-11)
        { chiave: 'p3', ordine: 1, tipo: 'persona', nome: 'Ragazza seducente', descrizione: '', esauribile: false, dettagli: { maschera: 'Pixie', deboleA: 'Ghiaccio' }, fonte: '', stato: null, marcatore: null, pin: [], contenitore: null, areaDedalo: null, persona: { id: 7, nome: 'Pixie', nomeIt: 'Pixie' }, areeDedalo: ['aiy-1'] }] }),
    area({ chiave: 'mementos-01-qimranut', ordine: 1, nome: 'Dedalo di Qimranut', dedalo: { aree: [areaDedalo({ chiave: 'qim-1' })], daCollocare: [], obiettivi: { totale: 0, fatti: 0 }, completato: true } }),
  ],
});

/** Monta la scheda del dungeon `chiave` sulla sua rotta `/guida/dungeon/:chiave`. */
const monta = (chiave: string) => render(<MemoryRouter initialEntries={[`/guida/dungeon/${chiave}`]}><Routes><Route path="/guida/dungeon/:chiave" element={<DungeonDettaglioPage />} /></Routes></MemoryRouter>);

// reset, non clear: le risposte «una volta» non consumate da un test non devono passare al successivo
beforeEach(() => { vi.resetAllMocks(); getAlberoMappe.mockResolvedValue([]); usePartitaStore.setState({ attiva: { id: 4, nome: 'Royal' } as PartitaDto }); });

it('in un Palazzo la colonna elenca i collezionabili delle planimetrie e «Raccolto» aggiorna anello e conteggi subito, senza caricamento, poi rilegge la scheda in silenzio (voci e Enigmi, 095)', async () => {
  // la rilettura dopo il raccolto: lo spillo 2 raccolto, 2 su 4 (come lo direbbe il server)
  const dopo = palazzo(true);
  dopo.planimetrie[0] = { ...dopo.planimetrie[0], presi: 2, spilli: [spillo(1, true), spillo(2, true)] };
  dopo.aree[0] = { ...dopo.aree[0], mappe: [{ ...dopo.aree[0].mappe[0], presi: 2, spilli: [spillo(1, true), spillo(2, true)] }] };
  dopo.raccolta = { ...dopo.raccolta, presi: 2, mappeComplete: 1 };
  // la seconda lettura (quella dopo il raccolto) resta in sospeso finché il test non la risolve: così si vede l'aggiornamento immediato
  let risolviRilettura: (v: DungeonDettaglioDto) => void = () => {};
  getDungeon.mockResolvedValueOnce(palazzo(true)).mockImplementationOnce(() => new Promise<DungeonDettaglioDto>((r) => { risolviRilettura = r; })).mockResolvedValue(dopo);
  impostaSpilloRaccolto.mockResolvedValue({});
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(getDungeon).toHaveBeenCalledWith('kamoshida', 4);
  // l'anello: 1 su 4
  expect(screen.getByRole('progressbar', { name: /Avanzamento in Palazzo di Kamoshida/ })).toHaveAttribute('aria-valuenow', '25');
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere in Cancello' });
  expect(within(colonna).getByRole('heading', { name: 'Da raccogliere · 1' })).toBeInTheDocument();
  // il raccolto sta nascosto finché non si chiede (un forziere si «apre», scelta dell'utente del 2026-10-03)
  expect(within(colonna).queryByRole('checkbox', { name: 'Forziere 1 di Cancello aperto' })).toBeNull();
  fireEvent.click(within(colonna).getByRole('checkbox', { name: 'Forziere 2 di Cancello aperto' }));
  await waitFor(() => expect(impostaSpilloRaccolto).toHaveBeenCalledWith(4, 2, true));
  // subito, senza aspettare il server: la rilettura è partita ma non ha ancora risposto
  await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('progressbar', { name: /Avanzamento in Palazzo di Kamoshida/ })).toHaveAttribute('aria-valuenow', '50');
  expect(within(colonna).queryByRole('checkbox', { name: 'Forziere 2 di Cancello aperto' })).toBeNull();
  // poi la rilettura risponde, e la scheda resta coerente
  await act(async () => { risolviRilettura(dopo); });
  expect(screen.getByRole('progressbar', { name: /Avanzamento in Palazzo di Kamoshida/ })).toHaveAttribute('aria-valuenow', '50');
  // le altre planimetrie del Palazzo, ripiegate con quanto resta; sotto, la guida dell'area (aperta) con Ottenuto
  expect(screen.getByText(/Tutte le planimetrie del Palazzo · 2 da raccogliere/)).toBeInTheDocument();
  // una sicura senza pin è una voce «da collegare»
  expect(screen.getByText(/Guida dell’area · 1 voce · 1 da collegare/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Sicura del cancello/ }));
  impostaStatoPunto.mockResolvedValue({ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: 'ottenuto', marcatore: null, pin: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
  await waitFor(() => expect(impostaStatoPunto).toHaveBeenCalledWith(4, 'p1', 'ottenuto'));
  // un punto della guida può contare sulle planimetrie: la raccolta si rilegge dal server (terza lettura: la seconda è dopo il raccolto)
  await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(3));
  // la stanza compare nell'elenco del Palazzo, con l'area a cui è legata
  expect(within(screen.getByLabelText('Planimetrie del Palazzo')).getAllByText(/Cancello/).length).toBeGreaterThan(0);
});

it('due riletture sovrapposte: la risposta vecchia che arriva dopo non sovrascrive quella nuova', async () => {
  const dopo = palazzo(true);
  dopo.planimetrie[0] = { ...dopo.planimetrie[0], presi: 2, spilli: [spillo(1, true), spillo(2, true)] };
  dopo.aree[0] = { ...dopo.aree[0], mappe: [{ ...dopo.aree[0].mappe[0], presi: 2, spilli: [spillo(1, true), spillo(2, true)] }] };
  dopo.raccolta = { ...dopo.raccolta, presi: 2, mappeComplete: 1 };
  // la rilettura dopo il raccolto risponde per ultima, e con la scheda di prima (1 su 4)
  let risolviVecchia: (v: DungeonDettaglioDto) => void = () => {};
  getDungeon.mockResolvedValueOnce(palazzo(true)).mockImplementationOnce(() => new Promise<DungeonDettaglioDto>((r) => { risolviVecchia = r; })).mockResolvedValueOnce(dopo);
  impostaSpilloRaccolto.mockResolvedValue({});
  impostaStatoPunto.mockResolvedValue({ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: 'ottenuto', marcatore: null, pin: [], contenitore: null, areaDedalo: null });
  monta('kamoshida');
  const colonna = await screen.findByRole('complementary', { name: 'Da raccogliere in Cancello' });
  fireEvent.click(within(colonna).getByRole('checkbox', { name: 'Forziere 2 di Cancello aperto' }));
  await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(2));
  fireEvent.click(screen.getByRole('button', { name: /Sicura del cancello/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
  await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(3));
  await waitFor(() => expect(screen.getByRole('progressbar', { name: /Avanzamento in Palazzo di Kamoshida/ })).toHaveAttribute('aria-valuenow', '50'));
  // ora risponde la rilettura vecchia: non conta più
  await act(async () => { risolviVecchia(palazzo(true)); });
  expect(screen.getByRole('progressbar', { name: /Avanzamento in Palazzo di Kamoshida/ })).toHaveAttribute('aria-valuenow', '50');
});

// Con un'area scelta la colonna mostra **quell'area** (rilievo dell'utente, 2026-10-01: «in ogni area sembrano poi vedersi
// i raccoglibili di tutte le altre aree»): il resto del Palazzo sta solo nella piega chiusa.
it('quando l’area non ha planimetrie legate la colonna lo dice, e il Palazzo resta nella piega chiusa', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  render(<MemoryRouter initialEntries={['/guida/dungeon/kamoshida?area=k-02']}><Routes><Route path="/guida/dungeon/:chiave" element={<DungeonDettaglioPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere in Torre' });
  expect(within(colonna).getByRole('status')).toHaveTextContent('Quest’area non ha planimetrie legate: niente da raccogliere qui.');
  expect(within(colonna).queryByRole('heading', { name: /Da raccogliere nel Palazzo/ })).toBeNull();
  const piega = within(colonna).getByText(/Tutte le planimetrie del Palazzo · 3 da raccogliere/).closest('details')!;
  expect(piega).not.toHaveAttribute('open');
  // un'area senza voci della guida: si dice, e se ne aggiunge una
  expect(within(colonna).getByText('La guida non ha voci per quest’area: aggiungile qui sotto.')).toBeInTheDocument();
  expect(within(colonna).getByRole('button', { name: 'Aggiungi una voce' })).toBeInTheDocument();
  // nell'elenco unico un'area senza planimetria è una riga in coda, da collegare
  expect(screen.getAllByText('area della guida · nessuna planimetria').length).toBeGreaterThan(0);
});

it('un’area con la planimetria legata ma senza collezionabili lo dice così, senza mostrare il resto del Palazzo', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  render(<MemoryRouter initialEntries={['/guida/dungeon/kamoshida?area=k-03']}><Routes><Route path="/guida/dungeon/:chiave" element={<DungeonDettaglioPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(screen.getByText('Visore: m-cortile')).toBeInTheDocument();
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere in Cortile' });
  expect(within(colonna).getByRole('status')).toHaveTextContent('Niente da raccogliere sulle planimetrie di quest’area.');
  expect(within(colonna).queryByText(/non ha planimetrie legate/)).toBeNull();
  expect(within(colonna).getByText(/Tutte le planimetrie del Palazzo · 3 da raccogliere/).closest('details')).not.toHaveAttribute('open');
  expect(screen.getAllByText('area della guida · nessuna planimetria').length).toBeGreaterThan(0);
});

// Collegare o scollegare un pin può cambiare lo stato della voce nella partita (gli stati si uniscono), e la risposta del
// server non lo porta: la scheda si rilegge con la partita (rilievo della revisione, 2026-10-01).
it('scollegando un pin da una voce «ottenuto» la voce resta com’è nella partita: la scheda si rilegge', async () => {
  /** Il Palazzo con la sola voce «Forziere del cancello», «ottenuto» nella partita, nella prima area: con `pin` vero
   *  la voce ha collegato il pin 1, altrimenti nessuno. */
  const conVoce = (pin: boolean): DungeonDettaglioDto => {
    const p = palazzo(true);
    const voce = { ...p.aree[0].punti[0], tipo: 'forziere' as const, nome: 'Forziere del cancello', stato: 'ottenuto' as const, pin: pin ? [{ id: 1, nome: 'Forziere', tipo: 'forziere', mappa: 'm-cancello', mappaNome: 'Palazzo di Kamoshida › Cancello' }] : [] };
    return { ...p, aree: [{ ...p.aree[0], punti: [voce] }, ...p.aree.slice(1)] };
  };
  getDungeon.mockResolvedValueOnce(conVoce(true)).mockResolvedValue(conVoce(false));
  // la risposta del collegamento: i pin sì, lo stato della partita no
  collegaPinAlPunto.mockResolvedValue({ ...conVoce(false).aree[0].punti[0], stato: null });
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Anche le segnate (1)' }));
  fireEvent.click(screen.getByRole('button', { name: /^Forziere del cancello/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Scollega Forziere da Forziere del cancello' }));
  await waitFor(() => expect(collegaPinAlPunto).toHaveBeenCalledWith('p1', 1, false));
  await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(2));
  expect(getDungeon).toHaveBeenLastCalledWith('kamoshida', 4);
  const riga = screen.getByRole('button', { name: /^Forziere del cancello/ });
  expect(riga).toHaveTextContent('· ottenuto');
  expect(riga).toHaveTextContent('da collegare');
  expect(screen.queryByRole('button', { name: 'Ottenuto' })).toBeNull();
});

it('«Collega pin» usa la mappa principale: barra con voce, conto, planimetria, ricerca e «Fatto»; tutti i pin, i nascosti sbiaditi (2026-10-18)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  collegaPinAlPunto.mockResolvedValue({ ...palazzo(true).aree[0].punti[0], pin: [{ id: 3, nome: 'Forziere della torre', tipo: 'forziere', mappa: 'm-torre', mappaNome: 'Palazzo di Kamoshida › Torre' }] });
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(screen.getByText('Visore: m-cancello')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Sicura del cancello/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  // la barra sopra la mappa principale; una sola mappa, quella principale, in modalità scelta
  const barra = screen.getByRole('region', { name: 'Collegamento dei pin a Sicura del cancello' });
  expect(barra).toHaveTextContent('Pin di «Sicura del cancello» · 0 collegati');
  // la spiegazione del tocco e dei pin grigi la dice la voce, nella colonna accanto (la barra sta anche in 242 px)
  expect(screen.getByLabelText('Scelta dei pin per Sicura del cancello')).toHaveTextContent('quelli grigi sono già raccolti o non ancora disponibili');
  expect(screen.getAllByText(/^Visore:/)).toHaveLength(1);
  expect(screen.getByText(/^Visore: m-cancello · scelta per Sicura del cancello · 0 scelti · sbiaditi true · cerca «»/)).toBeInTheDocument();
  // nella voce resta il conto
  expect(screen.getByLabelText('Scelta dei pin per Sicura del cancello')).toHaveTextContent('0 collegati');
  // la ricerca della barra arriva alla mappa; la planimetria si cambia dalla barra, anche fra quelle delle altre aree
  fireEvent.change(within(barra).getByRole('searchbox', { name: 'Cerca un pin sulla mappa' }), { target: { value: 'torre' } });
  expect(screen.getByText(/cerca «torre»/)).toBeInTheDocument();
  scegliVoce('Planimetria', /Torre/, barra);
  expect(screen.getByText(/^Visore: m-torre · scelta per Sicura del cancello/)).toBeInTheDocument();
  // collegando, la tela prende l'altezza che la colonna le lascia (un minimo più alto faceva scorrere la colonna) e dell'intestazione
  // dell'area resta il titolo: niente descrizione, planimetrie dell'area né aree della planimetria
  const visore = screen.getByText(/^Visore: m-torre/).closest('[data-classe-visore]')!;
  expect(visore.getAttribute('data-classe-visore')!.split(' ')).toEqual(expect.arrayContaining(['xl:flex-1', 'xl:[--minimo-tela:240px]']));
  expect(screen.queryByText(/Planimetrie di quest’area/)).not.toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Aree della guida su questa planimetria' })).not.toBeInTheDocument();
  // un tocco sulla mappa principale collega
  fireEvent.click(screen.getByRole('button', { name: 'Tocca il pin 3' }));
  await waitFor(() => expect(collegaPinAlPunto).toHaveBeenCalledWith('p1', 3, true));
  // «Fatto» chiude: la mappa torna la planimetria dell'area, senza scelta
  fireEvent.click(within(barra).getByRole('button', { name: 'Fatto: chiudi il collegamento dei pin' }));
  await waitFor(() => expect(screen.queryByRole('region', { name: /Collegamento dei pin/ })).toBeNull());
  expect(screen.getByText('Visore: m-cancello')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Tocca il pin 3' })).toBeNull();
});

it('collegando i pin l\'elenco del Palazzo resta e una sua stanza porta quella planimetria nella mappa del collegamento, senza cambiare area (2026-10-18)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Sicura del cancello/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  expect(screen.getByRole('navigation', { name: 'Il Palazzo' })).toBeVisible();
  const stanze = within(within(screen.getByLabelText('Planimetrie del Palazzo')).getByRole('list', { name: 'Stanze del Palazzo' }));
  fireEvent.click(stanze.getByRole('button', { name: /^2\. Torre/ }));
  // la mappa del collegamento passa alla Torre; l'area resta il Cancello e il collegamento resta aperto
  expect(screen.getByText(/^Visore: m-torre · scelta per Sicura del cancello/)).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Collegamento dei pin a Sicura del cancello' })).toBeInTheDocument();
  expect(screen.getByLabelText('Scelta dei pin per Sicura del cancello')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fatto: chiudi il collegamento dei pin' }));
  await waitFor(() => expect(screen.getByText('Visore: m-cancello')).toBeInTheDocument());
});

it('un\'area senza planimetria propria collega lo stesso, su una del Palazzo; l\'elenco del Palazzo resta (2026-10-18)', async () => {
  // la Torre (k-02) non ha planimetrie sue: una voce lì
  const p = palazzo(true);
  const voce = { ...p.aree[0].punti[0], chiave: 'p9', nome: 'Leva della torre', tipo: 'meccanismo' as const };
  getDungeon.mockResolvedValue({ ...p, aree: [p.aree[0], { ...p.aree[1], punti: [voce] }, p.aree[2]] });
  monta('kamoshida?area=k-02');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Il Palazzo' })).toBeVisible();
  expect(screen.queryByText(/^Visore:/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^Leva della torre/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  // la mappa c'è, sulla prima planimetria del Palazzo, con la barra; l'elenco del Palazzo resta
  expect(screen.getByRole('region', { name: 'Collegamento dei pin a Leva della torre' })).toBeInTheDocument();
  expect(screen.getByText(/^Visore: m-cancello · scelta per Leva della torre/)).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Il Palazzo' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Fatto: chiudi il collegamento dei pin' }));
  await waitFor(() => expect(screen.getByRole('navigation', { name: 'Il Palazzo' })).toBeVisible());
  expect(screen.queryByText(/^Visore:/)).toBeNull();
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

it('nei Memento (progetto del 2026-10-12): binario dei dedali, scheda del dedalo e un’area per volta; timbri a un tocco e Richieste a tre stati muovono area, dedalo e anello', async () => {
  getDungeon.mockResolvedValue(mementos());
  impostaTimbri.mockResolvedValue({ area: 'aiy-1', raccolti: 2, totale: 8, completato: false });
  impostaStatoRichiesta.mockResolvedValue({ chiave: 'bulli', stato: 'completata' });
  monta('mementos');
  expect(await screen.findByRole('heading', { name: 'Memento' })).toBeInTheDocument();
  expect(screen.queryByRole('tab', { name: 'Pianta della guida' })).toBeNull();
  // il binario dei dedali, con la percentuale; il disegno del pozzo fisso in cima (2026-10-12, «lascia sempre visibile Pozzo»),
  // senza più il pulsante; la finestra resta per tablet e telefono
  const binario = screen.getByRole('navigation', { name: 'Dedali dei Memento' });
  expect(within(binario).getByRole('button', { name: /^1 ?Aiyatsbus/ })).toHaveAttribute('aria-pressed', 'true');
  expect(within(binario).getByRole('button', { name: 'Disegno del pozzo' })).toBeInTheDocument();
  expect(within(binario).queryByRole('button', { name: 'Apri il pozzo dei Memento' })).toBeNull();
  expect(screen.queryByRole('dialog')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Apri il pozzo dei Memento' }));
  expect(within(screen.getByRole('dialog', { name: 'Il pozzo dei Memento' })).getByRole('button', { name: 'Disegno del pozzo' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Chiudi/ }));
  const dedalo = screen.getByRole('group', { name: 'Dedalo di Aiyatsbus' });
  expect(within(dedalo).getByRole('tab', { name: 'Area 1 · 1/10' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.click(within(dedalo).getByRole('button', { name: 'Timbro 2 di 8: da prendere' }));
  await waitFor(() => expect(impostaTimbri).toHaveBeenCalledWith(4, 'aiy-1', 2));
  // l'area, il dedalo e l'anello seguono: (2 timbri + 0 richieste + 0 voci) su 10
  await waitFor(() => expect(within(dedalo).getByRole('tab', { name: 'Area 1 · 2/10' })).toBeInTheDocument());
  expect(within(dedalo).getByRole('heading', { name: 'Timbri · 2/8' })).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: /Avanzamento in Memento/ })).toHaveAttribute('aria-valuenow', '20');
  fireEvent.click(within(within(dedalo).getByRole('radiogroup', { name: 'Stato di «Bullismo sui bulli»' })).getByRole('radio', { name: 'Fatta' }));
  await waitFor(() => expect(impostaStatoRichiesta).toHaveBeenCalledWith(4, 'bulli', 'completata'));
  await waitFor(() => expect(screen.getByRole('progressbar', { name: /Avanzamento in Memento/ })).toHaveAttribute('aria-valuenow', '30'));
  // Qimranut ha un'area vuota: completata, e con lei il dedalo (la ✓ nel binario); lo si sceglie toccando il pozzo del binario
  expect(within(binario).getByRole('button', { name: /Qimranut.*\(completata\)/ })).toBeInTheDocument();
  fireEvent.click(within(binario).getByRole('button', { name: 'Disegno del pozzo' }));
  const qimranut = await screen.findByRole('group', { name: 'Dedalo di Qimranut' });
  expect(within(qimranut).getByRole('tab', { name: 'Area 1 (completata)' })).toBeInTheDocument();
  expect(within(qimranut).queryByRole('button', { name: /^Timbro/ })).toBeNull();
});

it('nei Memento l’area ha Timbri, Persona, Richieste e Trama in quest’ordine; catturare una Persona non sposta l’anello; «Correggi la scheda» solo in «Modifica la guida»', async () => {
  getDungeon.mockResolvedValue(mementos());
  aggiornaCompendio.mockResolvedValue([{ personaId: 7, registrata: true }]);
  monta('mementos');
  expect(await screen.findByRole('heading', { name: 'Memento' })).toBeInTheDocument();
  // la miniatura del dedalo nella sua scheda; nessuna colonna dei Palazzi
  expect(screen.getByRole('img', { name: 'Dedalo di Aiyatsbus, come lo disegna il gioco' })).toBeInTheDocument();
  expect(screen.queryByRole('complementary')).toBeNull();
  const pannello = within(screen.getByRole('group', { name: 'Dedalo di Aiyatsbus' })).getByRole('tabpanel');
  expect(within(pannello).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Timbri · 1/8', 'Persona · 0/1 catturate', 'Richieste · 0/1', 'Trama · 0/1']);
  // la Persona sta solo fra le Persona, non nella Trama
  expect(within(pannello).getByRole('list', { name: 'Trama di Area 1' })).not.toHaveTextContent('Ragazza seducente');
  const persone = within(pannello).getByRole('region', { name: 'Persona dell’area' });
  fireEvent.click(within(persone).getByRole('button', { name: 'Pixie (Ragazza seducente): da catturare' }));
  // catturata = registrata nel compendio della partita (2026-10-12), per tutte le aree e i dedali
  await waitFor(() => expect(aggiornaCompendio).toHaveBeenCalledWith(4, 7, { registrata: true }));
  expect(impostaStatoPunto).not.toHaveBeenCalled();
  await waitFor(() => expect(within(persone).getByRole('button', { name: 'Pixie (Ragazza seducente): catturata' })).toHaveAttribute('aria-pressed', 'true'));
  // fuori dal conto: l'area resta a 1 su 10, l'anello al 10%
  expect(screen.getByRole('tab', { name: 'Area 1 · 1/10' })).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: /Avanzamento in Memento/ })).toHaveAttribute('aria-valuenow', '10');
  // toglierla dal compendio (dopo la conferma) la riporta da catturare
  aggiornaCompendio.mockResolvedValue([]);
  fireEvent.click(within(persone).getByRole('button', { name: 'Pixie (Ragazza seducente): catturata' }));
  fireEvent.click(screen.getByRole('button', { name: /^Togli dal compendio/ }));
  await waitFor(() => expect(aggiornaCompendio).toHaveBeenLastCalledWith(4, 7, { registrata: false }));
  await waitFor(() => expect(within(persone).getByRole('button', { name: 'Pixie (Ragazza seducente): da catturare' })).toHaveAttribute('aria-pressed', 'false'));
  // la correzione della scheda è un comando per sistemare la guida
  expect(screen.queryByRole('button', { name: /Correggi la scheda/ })).toBeNull();
  fireEvent.click(screen.getAllByRole('button', { name: 'Modifica la guida' })[0]);
  expect(screen.getByRole('button', { name: /Correggi la scheda/ })).toBeInTheDocument();
});

// ---- Due gesti ravvicinati (B3", verifica completa 2026-10-03) ----
//
// Ogni aggiornamento locale arriva dopo un `await`: costruito dalla scheda del render in cui era partito, cancellava un secondo
// gesto completato nel frattempo. Le riletture in silenzio restano in sospeso, così si guarda l'aggiornamento locale da solo.

describe('DungeonDettaglioPage — due gesti ravvicinati (B3")', () => {
  /** L'anello d'avanzamento (progressbar) il cui nome comincia con «Avanzamento in <nome>». */
  const anello = (nome: string) => screen.getByRole('progressbar', { name: new RegExp(`Avanzamento in ${nome}`) });

  it('Memento: la risposta dei timbri, arrivata dopo una richiesta completata, non la riapre', async () => {
    getDungeon.mockResolvedValue(mementos());
    let rispondiTimbri!: (v: unknown) => void;
    impostaTimbri.mockImplementation(() => new Promise((ok) => { rispondiTimbri = ok; }));
    impostaStatoRichiesta.mockResolvedValue({ chiave: 'bulli', stato: 'completata' });
    monta('mementos');
    const colonna = within(await screen.findByRole('group', { name: 'Dedalo di Aiyatsbus' }));
    await act(async () => { fireEvent.click(colonna.getByRole('button', { name: 'Timbro 2 di 8: da prendere' })); }); // in volo
    await act(async () => { fireEvent.click(colonna.getByRole('radio', { name: 'Fatta' })); }); // arriva subito
    await act(async () => { rispondiTimbri({ area: 'aiy-1', raccolti: 2, totale: 8, completato: false }); });
    // (2 timbri + 1 richiesta) su 10
    expect(anello('Memento')).toHaveAttribute('aria-valuenow', '30');
    expect(colonna.getByRole('heading', { name: 'Timbri · 2/8' })).toBeInTheDocument();
    expect(colonna.getByRole('radio', { name: 'Fatta' })).toHaveAttribute('aria-checked', 'true');
  });

  it('Memento: la risposta di una richiesta, arrivata dopo un timbro, non toglie il timbro', async () => {
    getDungeon.mockResolvedValue(mementos());
    let rispondiRichiesta!: (v: unknown) => void;
    impostaStatoRichiesta.mockImplementation(() => new Promise((ok) => { rispondiRichiesta = ok; }));
    impostaTimbri.mockResolvedValue({ area: 'aiy-1', raccolti: 2, totale: 8, completato: false });
    monta('mementos');
    const colonna = within(await screen.findByRole('group', { name: 'Dedalo di Aiyatsbus' }));
    await act(async () => { fireEvent.click(colonna.getByRole('radio', { name: 'Fatta' })); }); // in volo
    await act(async () => { fireEvent.click(colonna.getByRole('button', { name: 'Timbro 2 di 8: da prendere' })); }); // arriva subito
    await act(async () => { rispondiRichiesta({ chiave: 'bulli', stato: 'completata' }); });
    expect(anello('Memento')).toHaveAttribute('aria-valuenow', '30');
    expect(colonna.getByRole('heading', { name: 'Timbri · 2/8' })).toBeInTheDocument();
  });

  it('Palazzo: lo stato di una voce, arrivato dopo un raccolto, non riapre il raccolto', async () => {
    getDungeon.mockResolvedValueOnce(palazzo(true)).mockImplementation(() => new Promise(() => {}));
    let rispondiStato!: (v: unknown) => void;
    impostaStatoPunto.mockImplementation(() => new Promise((ok) => { rispondiStato = ok; }));
    impostaSpilloRaccolto.mockResolvedValue({});
    monta('kamoshida');
    const colonna = within(await screen.findByRole('complementary', { name: 'Da raccogliere in Cancello' }));
    fireEvent.click(screen.getByRole('button', { name: /Sicura del cancello/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' })); }); // in volo
    await act(async () => { fireEvent.click(colonna.getByRole('checkbox', { name: 'Forziere 2 di Cancello aperto' })); }); // arriva subito
    expect(anello('Palazzo di Kamoshida')).toHaveAttribute('aria-valuenow', '50');
    await act(async () => { rispondiStato({ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: 'ottenuto', marcatore: null, pin: [], contenitore: null, areaDedalo: null }); });
    expect(anello('Palazzo di Kamoshida')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('button', { name: 'Anche le segnate (1)' })).toBeInTheDocument();
  });

  it('Palazzo: un raccolto, arrivato dopo lo stato di una voce, non riporta indietro la voce', async () => {
    getDungeon.mockResolvedValueOnce(palazzo(true)).mockImplementation(() => new Promise(() => {}));
    let rispondiRaccolto!: (v: unknown) => void;
    impostaSpilloRaccolto.mockImplementation(() => new Promise((ok) => { rispondiRaccolto = ok; }));
    impostaStatoPunto.mockResolvedValue({ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: 'ottenuto', marcatore: null, pin: [], contenitore: null, areaDedalo: null });
    monta('kamoshida');
    const colonna = within(await screen.findByRole('complementary', { name: 'Da raccogliere in Cancello' }));
    await act(async () => { fireEvent.click(colonna.getByRole('checkbox', { name: 'Forziere 2 di Cancello aperto' })); }); // in volo
    fireEvent.click(screen.getByRole('button', { name: /Sicura del cancello/ }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' })); }); // arriva subito
    expect(screen.getByRole('button', { name: 'Anche le segnate (1)' })).toBeInTheDocument();
    await act(async () => { rispondiRaccolto({}); });
    expect(anello('Palazzo di Kamoshida')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByRole('button', { name: 'Anche le segnate (1)' })).toBeInTheDocument();
  });
});

// ---- L'elenco del Palazzo (ordine logico, legame con l'area, planimetria libera) ----
//
// Non si apre più niente: **l'elenco è la colonna di atterraggio** (scelta dell'utente,
// 2026-09-19). Prima stava dietro un pulsante, e chi non sapeva di doverlo premere non vedeva
// nessun modo di sistemare le planimetrie del Palazzo.

/** Monta la scheda del Palazzo di Kamoshida (con partita, atlante vuoto), aspetta il titolo e restituisce le query
 *  limitate alla colonna «Planimetrie del Palazzo». */
async function apriPlanimetrie() {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  return within(screen.getByLabelText('Planimetrie del Palazzo'));
}

// La colonna ristrutturata (richiesta dell'utente, 2026-09-30): l'elenco serve a scegliere e a riordinare
// trascinando la maniglia; «Gestisci» apre la scheda in una finestra, dove si sistema tutto il resto.

it('l’elenco dice le stanze in ordine, che cosa mostrano, quanto resta e le aree della guida', async () => {
  const pannello = await apriPlanimetrie();
  const stanze = within(pannello.getByRole('list', { name: 'Stanze del Palazzo' }));
  expect(stanze.getByRole('button', { name: /^1\. Cancello/ })).toHaveTextContent('Immagine 1 · 1 da prendere su 2');
  expect(stanze.getByRole('button', { name: /^1\. Cancello/ })).toHaveTextContent('1. Cancello');
  expect(stanze.getByRole('button', { name: /^2\. Torre/ })).toHaveTextContent('nessuna area della guida');
  // niente matite, frecce o cestini nelle righe: una maniglia e «Gestisci»
  expect(pannello.queryByRole('button', { name: /Correggi/ })).toBeNull();
  expect(pannello.queryByRole('button', { name: /giù$/ })).toBeNull();
  expect(pannello.getAllByRole('button', { name: /^Sposta la stanza/ })).toHaveLength(2);
  expect(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' })).toBeInTheDocument();
});

it('le frecce sulla maniglia spostano la stanza e salvano l’ordine di tutto il Palazzo', async () => {
  const pannello = await apriPlanimetrie();
  riordinaMappe.mockResolvedValue([]);
  const maniglia = pannello.getByRole('button', { name: 'Sposta la stanza «Cancello»' });
  // la prima non sale oltre la cima
  fireEvent.keyDown(maniglia, { key: 'ArrowUp' });
  expect(riordinaMappe).not.toHaveBeenCalled();
  maniglia.focus();
  fireEvent.keyDown(maniglia, { key: 'ArrowDown' });
  await waitFor(() => expect(riordinaMappe).toHaveBeenCalledWith('dungeon-kamoshida', ['m-torre', 'm-cancello']));
  // la riga è scesa e la maniglia ha ancora il focus: la freccia successiva continua a spostarla
  expect(document.activeElement).toBe(pannello.getByRole('button', { name: 'Sposta la stanza «Cancello»' }));
  expect(within(pannello.getByRole('list', { name: 'Stanze del Palazzo' })).getAllByRole('button', { name: /^Sposta la stanza/ }).map((b) => b.getAttribute('aria-label')))
    .toEqual(['Sposta la stanza «Torre»', 'Sposta la stanza «Cancello»']);
});

it('trascinare la maniglia porta la stanza dove la si lascia', async () => {
  const pannello = await apriPlanimetrie();
  riordinaMappe.mockResolvedValue([]);
  const maniglia = pannello.getByRole('button', { name: 'Sposta la stanza «Cancello»' });
  // in jsdom tutte le righe stanno a 0: il puntatore più in basso cade sull'ultima
  fireEvent.pointerDown(maniglia, { pointerId: 1, clientY: 0 });
  fireEvent.pointerMove(maniglia, { pointerId: 1, clientY: 80 });
  fireEvent.pointerUp(maniglia, { pointerId: 1, clientY: 80 });
  await waitFor(() => expect(riordinaMappe).toHaveBeenCalledWith('dungeon-kamoshida', ['m-torre', 'm-cancello']));
});

it('toccare una stanza porta la sua planimetria nel visore e nella colonna dei suoi collezionabili', async () => {
  const pannello = await apriPlanimetrie();
  fireEvent.click(within(pannello.getByRole('list', { name: 'Stanze del Palazzo' })).getByRole('button', { name: /^2\. Torre/ }));
  expect(await screen.findByText('Visore: m-torre')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: /Su questa planimetria/ })).toBeInTheDocument();
});

// Da 1280 px la mappa non scende mai sotto i 240 px (2026-09-30), ma il minimo stava sul riquadro: la barra del visore
// se ne prendeva fino a 180 e la tela restava alta 58. Ora il minimo è della tela (2026-10-15): il riquadro chiede
// `--minimo-tela` al visore ed è alto almeno quanto il suo contenuto, barra compresa.
it('da 1280 px il minimo di 240 px della mappa vale per la tela, non per il riquadro del visore', async () => {
  await apriPlanimetrie();
  const classi = (await screen.findByText(/^Visore: /)).getAttribute('data-classe-visore')!.split(' ');
  expect(classi).toEqual(expect.arrayContaining(['xl:[--minimo-tela:240px]', 'xl:min-h-fit', 'xl:flex-1', 'h-[max(300px,min(41vh,560px))]']));
  expect(classi).not.toContain('xl:min-h-[240px]');
});

it('finché l’atlante non è caricato l’ordine resta bloccato: senza di lui non si sa quali tavole sono la stessa stanza', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  riordinaMappe.mockResolvedValue([]);
  /** Risolutore dell'atlante in sospeso: il test lo chiama per far arrivare l'albero delle mappe quando vuole. */
  let arriva: (v: unknown) => void = () => {};
  getAlberoMappe.mockReturnValue(new Promise((r) => { arriva = r; }));
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
  expect(pannello.getByRole('status')).toHaveTextContent(/l’ordine si sblocca appena arriva/);
  const maniglia = pannello.getByRole('button', { name: 'Sposta la stanza «Cancello»' });
  expect(maniglia).toHaveAttribute('aria-disabled', 'true');
  fireEvent.keyDown(maniglia, { key: 'ArrowDown' });
  expect(riordinaMappe).not.toHaveBeenCalled();
  await act(async () => { arriva([]); });
  expect(pannello.getByRole('button', { name: 'Sposta la stanza «Cancello»' })).not.toHaveAttribute('aria-disabled');
});

/** Il Palazzo di prova con «Cancello» in due versioni della stessa stanza (atlante con il loro gruppo). */
const conDueVersioni = () => {
  const p = palazzo(true);
  const ovest = { ...p.planimetrie[0], chiave: 'm-cancello-ovest', nome: 'Palazzo di Kamoshida › Cancello ovest', aree: [], n: 0, presi: 0, spilli: [] };
  /** Voce dell'albero delle mappe per la planimetria `chiave`, figlia del Palazzo e nel gruppo d'immagini «Cancello»
   *  con l'ordine e l'etichetta di versione dati. */
  const gruppo = (chiave: string, ordine: number, etichetta: string) => ({ chiave, nome: `Palazzo di Kamoshida › ${chiave}`, genitore: 'dungeon-kamoshida', gruppoImmagini: { id: 'g-cancello', nome: 'Cancello', ordine, etichetta } });
  return {
    dungeon: { ...p, planimetrie: [p.planimetrie[0], ovest, p.planimetrie[1]] },
    albero: [gruppo('m-cancello', 0, 'Pianta completa'), gruppo('m-cancello-ovest', 1, 'Porzione ovest')],
  };
};

it('una stanza con più planimetrie si apre: le versioni si scelgono, si riordinano con la loro maniglia e si gestiscono', async () => {
  const { dungeon, albero } = conDueVersioni();
  getDungeon.mockResolvedValue(dungeon);
  getAlberoMappe.mockResolvedValue(albero);
  riordinaMappe.mockResolvedValue([]);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
  // la stanza della planimetria a schermo è già aperta
  const versioni = within(await pannello.findByRole('list', { name: 'Planimetrie di Cancello' }));
  expect(versioni.getAllByRole('button', { name: /^Sposta «/ }).map((b) => b.getAttribute('aria-label'))).toEqual(['Sposta «Pianta completa» di Cancello', 'Sposta «Porzione ovest» di Cancello']);
  fireEvent.keyDown(versioni.getByRole('button', { name: 'Sposta «Porzione ovest» di Cancello' }), { key: 'ArrowUp' });
  await waitFor(() => expect(riordinaMappe).toHaveBeenCalledWith('dungeon-kamoshida', ['m-cancello-ovest', 'm-cancello', 'm-torre']));
  expect(versioni.getByRole('button', { name: 'Gestisci «Porzione ovest» di Cancello' })).toBeInTheDocument();
  // scendendo con la freccia la maniglia della versione resta a fuoco (è la riga spostata nel DOM)
  const giu = versioni.getByRole('button', { name: 'Sposta «Porzione ovest» di Cancello' });
  await waitFor(() => expect(giu).not.toHaveAttribute('aria-disabled'));
  giu.focus();
  fireEvent.keyDown(giu, { key: 'ArrowDown' });
  await waitFor(() => expect(riordinaMappe).toHaveBeenLastCalledWith('dungeon-kamoshida', ['m-cancello', 'm-cancello-ovest', 'm-torre']));
  expect(document.activeElement).toBe(versioni.getByRole('button', { name: 'Sposta «Porzione ovest» di Cancello' }));
});

it('svuotare «Che cosa mostra» toglie l’etichetta (torna il numero nella stanza), e la scheda lo dice prima di salvare', async () => {
  const { dungeon, albero } = conDueVersioni();
  getDungeon.mockResolvedValue(dungeon);
  getAlberoMappe.mockResolvedValue(albero);
  aggiornaPresentazioneMappa.mockResolvedValue({});
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  fireEvent.click(await screen.findByRole('button', { name: 'Gestisci «Pianta completa» di Cancello' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Pianta completa' }));
  expect(finestra.getByLabelText('Che cosa mostra')).toHaveValue('Pianta completa');
  expect(finestra.getByText('Vale per tutte e 2 le planimetrie della stanza.')).toBeInTheDocument();
  fireEvent.change(finestra.getByLabelText('Che cosa mostra'), { target: { value: '' } });
  expect(finestra.getByText(/l’etichetta «Pianta completa» si perde/)).toBeInTheDocument();
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaPresentazioneMappa).toHaveBeenCalledWith('m-cancello', { etichetta: null }));
});

it('la scheda della planimetria cambia stanza, «Che cosa mostra», nome e aree in un salvataggio, e rilegge l’atlante', async () => {
  const pannello = await apriPlanimetrie();
  aggiornaPresentazioneMappa.mockResolvedValue({});
  aggiornaMappa.mockResolvedValue({});
  impostaAreeMappa.mockResolvedValue({ aree: [] });
  await waitFor(() => expect(getAlberoMappe).toHaveBeenCalled());
  getAlberoMappe.mockClear();
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
  expect(finestra.getByLabelText('Nome della stanza')).toHaveValue('Cancello');
  expect(finestra.getByLabelText('Che cosa mostra')).toHaveValue('');
  expect(finestra.getByText('Vuoto: si chiama col suo numero nella stanza, «Immagine 1».')).toBeInTheDocument();
  expect(finestra.getByRole('button', { name: 'Salva' })).toBeDisabled();
  fireEvent.change(finestra.getByLabelText('Nome della stanza'), { target: { value: 'Ingresso' } });
  fireEvent.change(finestra.getByLabelText('Che cosa mostra'), { target: { value: 'Livello 0' } });
  fireEvent.change(finestra.getByLabelText('Nome della planimetria'), { target: { value: 'Ingresso del castello' } });
  fireEvent.click(finestra.getByRole('checkbox', { name: /2\. Torre/ }));
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaPresentazioneMappa).toHaveBeenCalledWith('m-cancello', { gruppoNome: 'Ingresso', etichetta: 'Livello 0' }));
  expect(aggiornaMappa).toHaveBeenCalledWith('m-cancello', { nome: 'Ingresso del castello' });
  expect(impostaAreeMappa).toHaveBeenCalledWith('m-cancello', ['k-01', 'k-02']);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  // il nome della stanza e l'etichetta stanno nell'atlante: senza rileggerlo resterebbero quelli di prima
  expect(getAlberoMappe).toHaveBeenCalled();
});

it('dalla scheda si elimina la planimetria, con la conferma dentro la finestra', async () => {
  const pannello = await apriPlanimetrie();
  eliminaMappa.mockResolvedValue(undefined);
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Torre' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Torre · Immagine 1' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Elimina…' }));
  const conferma = within(finestra.getByRole('alertdialog', { name: 'Conferma eliminazione' }));
  expect(conferma.getByText(/compresi 2 da raccogliere/)).toBeInTheDocument();
  // dove finisce, e come tornarla indietro (2026-10-16)
  expect(conferma.getByText(/Finisce nel cestino \(Impostazioni → Cestino\): da lì la rimetti com’era\./)).toBeInTheDocument();
  // Torre non contiene aree della guida: la conferma non ne parla
  expect(conferma.queryByText(/senza planimetria/)).toBeNull();
  fireEvent.click(conferma.getByRole('button', { name: 'Elimina la planimetria' }));
  await waitFor(() => expect(eliminaMappa).toHaveBeenCalledWith('m-torre'));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('la conferma dell’eliminazione nomina le aree della guida che la planimetria contiene', async () => {
  const pannello = await apriPlanimetrie();
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Elimina…' }));
  expect(within(finestra.getByRole('alertdialog')).getByText(/L’area della guida «Cancello» resta senza planimetria\./)).toBeInTheDocument();
  // non eliminare riporta Annulla e Salva
  fireEvent.click(finestra.getByRole('button', { name: 'Non eliminare' }));
  expect(finestra.getByRole('button', { name: 'Salva' })).toBeInTheDocument();
  expect(eliminaMappa).not.toHaveBeenCalled();
});

describe('un’area su più planimetrie (decisione dell’utente, 2026-10-04)', () => {
  it('dall’area aperta si collega anche a un’altra planimetria: le si aggiunge l’area, senza toglierla dalla prima', async () => {
    getDungeon.mockResolvedValue(palazzo(true));
    impostaAreeMappa.mockResolvedValue({ aree: [] });
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    fireEvent.click(screen.getByText('Planimetrie di quest’area · 1'));
    // si offrono solo le planimetrie che non hanno già l'area: la Torre
    expect(vociSelettore('Collega anche a').filter((v) => !v.startsWith('—')).map((v) => v.split(' ')[0])).toEqual(['Torre']);
    scegliVoce('Collega anche a', /^Torre/);
    await waitFor(() => expect(impostaAreeMappa).toHaveBeenCalledWith('m-torre', ['k-01']));
    // la prima planimetria non si tocca, e la scheda si rilegge
    expect(impostaAreeMappa).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(2));
  });

  it('«Scollega questa planimetria» toglie l’area solo da quella a schermo, e dice dove resta', async () => {
    const d = palazzo(true);
    // il Cancello sta su due planimetrie: la sua e la Torre
    d.planimetrie[1] = { ...d.planimetrie[1], aree: [{ chiave: 'k-01', nome: 'Cancello', ordine: 0 }] };
    d.aree[0] = { ...d.aree[0], mappe: [...d.aree[0].mappe, { chiave: 'm-torre', nome: d.planimetrie[1].nome, n: 2, presi: 0, spilli: [] }] };
    getDungeon.mockResolvedValue(d);
    impostaAreeMappa.mockResolvedValue({ aree: [] });
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    fireEvent.click(screen.getByText('Planimetrie di quest’area · 2'));
    // non c'è niente da collegare: l'area sta già su tutte le planimetrie
    expect(screen.queryByRole('combobox', { name: 'Collega anche a' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Scollega questa planimetria l’area resta sulle altre/ }));
    // la planimetria a schermo è la prima, Cancello: perde l'area e tiene le altre (qui nessuna)
    await waitFor(() => expect(impostaAreeMappa).toHaveBeenCalledWith('m-cancello', []));
    expect(impostaAreeMappa).toHaveBeenCalledTimes(1);
  });

  it('la conferma dell’eliminazione distingue le aree che restano su altre planimetrie da quelle che restano senza', async () => {
    const d = palazzoConPiuAree();
    // il Cancello sta anche sulla Torre; il Cortile solo sulla planimetria da eliminare
    d.planimetrie[1] = { ...d.planimetrie[1], aree: [...d.planimetrie[1].aree, { chiave: 'k-01', nome: 'Cancello', ordine: 0 }] };
    getDungeon.mockResolvedValue(d);
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
    fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
    // accanto all'area, dove altro sta
    expect(finestra.getAllByRole('checkbox')[0].closest('label')!.textContent).toBe('1. Cancelloanche su «Torre»');
    fireEvent.click(finestra.getByRole('button', { name: 'Elimina…' }));
    const conferma = within(finestra.getByRole('alertdialog'));
    expect(conferma.getByText(/L’area della guida «Cortile» resta senza planimetria\. L’area «Cancello» resta sulle altre planimetrie che la contengono\./)).toBeInTheDocument();
  });

  it('con due aree che restano altrove la conferma parla al plurale: «restano … che le contengono»', async () => {
    const d = palazzoConPiuAree();
    // Cancello e Cortile stanno anche sulla Torre
    d.planimetrie[1] = { ...d.planimetrie[1], aree: [...d.planimetrie[1].aree, { chiave: 'k-01', nome: 'Cancello', ordine: 0 }, { chiave: 'k-03', nome: 'Cortile', ordine: 2 }] };
    getDungeon.mockResolvedValue(d);
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    fireEvent.click(within(screen.getByLabelText('Planimetrie del Palazzo')).getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
    fireEvent.click(finestra.getByRole('button', { name: 'Elimina…' }));
    const conferma = within(finestra.getByRole('alertdialog'));
    expect(conferma.getByText(/Le aree «Cancello», «Cortile» restano sulle altre planimetrie che le contengono\./)).toBeInTheDocument();
    // nessuna resta senza planimetria
    expect(conferma.queryByText(/senza planimetria/)).toBeNull();
  });
});

it('mentre un ordine si salva, la maniglia dice perché è ferma', async () => {
  const pannello = await apriPlanimetrie();
  riordinaMappe.mockReturnValue(new Promise(() => {}));
  const maniglia = pannello.getByRole('button', { name: 'Sposta la stanza «Cancello»' });
  expect(maniglia).toHaveAttribute('title', 'Trascina per spostare (con la tastiera: frecce su e giù)');
  fireEvent.keyDown(maniglia, { key: 'ArrowDown' });
  await waitFor(() => expect(pannello.getByRole('button', { name: 'Sposta la stanza «Cancello»' })).toHaveAttribute('title', 'Un momento: sto salvando l’ultima modifica'));
});

// ---- Stanze e testo delle aree (richiesta dell'utente, 2026-09-30) ----

it('rinominare la planimetria non rinomina la stanza: il nome della stanza resta fissato com’era', async () => {
  const pannello = await apriPlanimetrie();
  aggiornaPresentazioneMappa.mockResolvedValue({});
  aggiornaMappa.mockResolvedValue({});
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
  fireEvent.change(finestra.getByLabelText('Nome della planimetria'), { target: { value: 'Cancello, lato nord' } });
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaMappa).toHaveBeenCalledWith('m-cancello', { nome: 'Cancello, lato nord' }));
  expect(aggiornaPresentazioneMappa).toHaveBeenCalledWith('m-cancello', { gruppoNome: 'Cancello' });
});

it('una planimetria a sé si sposta nella stanza di un’altra, dalla sua scheda', async () => {
  const pannello = await apriPlanimetrie();
  impostaStanzaMappa.mockResolvedValue({});
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
  const stanza = within(finestra.getByRole('region', { name: 'Stanza della planimetria' }));
  expect(stanza.getByText('È una stanza a sé.')).toBeInTheDocument();
  expect(stanza.queryByRole('button', { name: 'Rendila una stanza a sé' })).toBeNull();
  fireEvent.click(stanza.getByRole('button', { name: 'Sposta in un’altra stanza…' }));
  const scelte = within(stanza.getByRole('list', { name: 'Stanze in cui spostarla' })).getAllByRole('button');
  // le altre stanze, non la sua
  expect(scelte.map((b) => b.textContent)).toEqual(['Torreuna planimetria']);
  fireEvent.click(scelte[0]);
  await waitFor(() => expect(impostaStanzaMappa).toHaveBeenCalledWith('m-cancello', { con: 'm-torre', nome: 'Torre' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('fra le stanze in cui spostarla ci sono solo quelle dello stesso livello (il server rifiuta le altre)', async () => {
  const { dungeon, albero } = conDueVersioni();
  // «Torre» sta sotto un'altra mappa del Palazzo: una stanza annidata, di un altro livello
  getDungeon.mockResolvedValue(dungeon);
  getAlberoMappe.mockResolvedValue([...albero, { chiave: 'm-torre', nome: 'Palazzo di Kamoshida › Torre', genitore: 'm-cancello' }]);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  fireEvent.click(await screen.findByRole('button', { name: 'Gestisci «Pianta completa» di Cancello' }));
  const stanza = within(within(screen.getByRole('dialog')).getByRole('region', { name: 'Stanza della planimetria' }));
  // l'unica altra stanza è di un altro livello: niente da proporre
  expect(stanza.queryByRole('button', { name: 'Sposta in un’altra stanza…' })).toBeNull();
});

it('una planimetria di una stanza con più versioni diventa una stanza a sé, col suo nome', async () => {
  const { dungeon, albero } = conDueVersioni();
  getDungeon.mockResolvedValue(dungeon);
  getAlberoMappe.mockResolvedValue(albero);
  impostaStanzaMappa.mockResolvedValue({});
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  fireEvent.click(await screen.findByRole('button', { name: 'Gestisci «Porzione ovest» di Cancello' }));
  const stanza = within(within(screen.getByRole('dialog')).getByRole('region', { name: 'Stanza della planimetria' }));
  expect(stanza.getByText('È una delle 2 planimetrie di «Cancello».')).toBeInTheDocument();
  fireEvent.click(stanza.getByRole('button', { name: 'Rendila una stanza a sé' }));
  await waitFor(() => expect(impostaStanzaMappa).toHaveBeenCalledWith('m-cancello-ovest', { con: null, nome: 'Cancello ovest' }));
});

it('il testo di un’area si modifica: dalla scheda dell’area senza planimetria e con «Modifica testo» sopra la mappa', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  aggiornaArea.mockResolvedValue({});
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  // sopra la mappa il comando dice che cosa fa, non è più una ✎ sola
  // e il nome accessibile comincia dal testo che si vede (chi comanda a voce dice «Modifica testo»)
  expect(screen.getByRole('button', { name: 'Modifica testo: l’area «Cancello»' })).toHaveTextContent('Modifica testo');
  fireEvent.click(screen.getByRole('button', { name: 'Gestisci l’area «Torre»' }));
  const finestra = within(screen.getByRole('dialog', { name: '2. Torre' }));
  expect(finestra.getByRole('button', { name: 'Salva il testo' })).toBeDisabled();
  fireEvent.change(finestra.getByLabelText('Nome dell’area'), { target: { value: 'Torre nord' } });
  fireEvent.change(finestra.getByLabelText('Descrizione'), { target: { value: 'La torre dell’ala nord.' } });
  fireEvent.click(finestra.getByRole('button', { name: 'Salva il testo' }));
  await waitFor(() => expect(aggiornaArea).toHaveBeenCalledWith('k-02', { nome: 'Torre nord', descrizione: 'La torre dell’ala nord.' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('un’area senza planimetria ha la sua scheda: si collega a una qualsiasi tavola, che la aggiunge alle sue', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  impostaAreeMappa.mockResolvedValue({ aree: [] });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const orfane = within(screen.getByRole('list', { name: 'Aree della guida senza planimetria' }));
  expect(orfane.getByText('area della guida · nessuna planimetria')).toBeInTheDocument();
  fireEvent.click(orfane.getByRole('button', { name: 'Gestisci l’area «Torre»' }));
  const finestra = within(screen.getByRole('dialog', { name: '2. Torre' }));
  // **tutte** le tavole, anche quella che contiene già un'area, e lo dicono; nella finestra, non in una tendina
  const tavole = within(finestra.getByRole('list', { name: 'Planimetrie a cui collegarla' })).getAllByRole('button');
  expect(tavole).toHaveLength(2);
  expect(tavole[0]).toHaveTextContent(/Cancello.*contiene Cancello/);
  expect(tavole[1]).toHaveTextContent(/Torre.*nessuna area/);
  fireEvent.click(tavole[0]);
  await waitFor(() => expect(impostaAreeMappa).toHaveBeenCalledWith('m-cancello', ['k-01', 'k-02']));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(aggiornaMappa).not.toHaveBeenCalled();
});

it('un’area della guida si elimina dalla sua scheda, dopo una conferma che dice che cosa si perde', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  eliminaArea.mockResolvedValue(undefined);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  fireEvent.click(screen.getByRole('button', { name: 'Gestisci l’area «Torre»' }));
  const finestra = within(screen.getByRole('dialog', { name: '2. Torre' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Elimina…' }));
  const conferma = within(finestra.getByRole('alertdialog', { name: 'Conferma eliminazione' }));
  expect(conferma.getByText(/per tutte le partite/)).toBeInTheDocument();
  expect(conferma.getByText(/Finisce nel cestino \(Impostazioni → Cestino\): da lì la rimetti com’era\./)).toBeInTheDocument();
  getDungeon.mockClear();
  fireEvent.click(conferma.getByRole('button', { name: 'Elimina l’area' }));
  await waitFor(() => expect(eliminaArea).toHaveBeenCalledWith('k-02'));
  // la scheda del Palazzo si rilegge senza l'area
  await waitFor(() => expect(getDungeon).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('anche l’area aperta si elimina, dal suo modulo di correzione, e la scheda torna alla prima area', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  eliminaArea.mockResolvedValue(undefined);
  render(<MemoryRouter initialEntries={['/guida/dungeon/kamoshida?area=k-03']}><Routes><Route path="/guida/dungeon/:chiave" element={<DungeonDettaglioPage />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Cortile' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Modifica testo: l’area/ }));
  const modulo = within(screen.getByRole('form', { name: /Correggi l’area/ }));
  fireEvent.click(modulo.getByRole('button', { name: 'Elimina' }));
  expect(modulo.getByText(/Se ne va dalla guida per tutte le partite.*Finisce nel cestino \(Impostazioni → Cestino\): da lì la rimetti com’era\./)).toBeInTheDocument();
  fireEvent.click(modulo.getByRole('button', { name: 'Confermo' }));
  await waitFor(() => expect(eliminaArea).toHaveBeenCalledWith('k-03'));
  // senza il parametro la scheda apre la prima area
  expect(await screen.findByRole('heading', { name: 'Cancello' })).toBeInTheDocument();
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

/** Una voce della guida con lo stato dato, nell'area indicata (per la spunta delle aree completate). */
const voceGuida = (chiave: string, tipo: PuntoInteresseDto['tipo'], stato: PuntoInteresseDto['stato']): PuntoInteresseDto =>
  ({ chiave, ordine: 0, tipo, nome: chiave, descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato, marcatore: null, pin: [], contenitore: null, areaDedalo: null, persona: null, areeDedalo: [] });

describe('spunta delle aree completate (scelta dell’utente, 2026-10-04)', () => {
  /** Il Palazzo con più aree, con le voci date per area (le altre restano come sono). */
  const conVoci = (voci: Record<string, PuntoInteresseDto[]>): DungeonDettaglioDto => {
    const d = palazzoConPiuAree();
    return { ...d, aree: d.aree.map((a) => (voci[a.chiave] ? { ...a, punti: voci[a.chiave] } : a)) };
  };
  /** La riga della stanza della planimetria Cancello nell'elenco del Palazzo. */
  const rigaCancello = () => within(screen.getByRole('list', { name: 'Stanze del Palazzo' })).getAllByRole('listitem')[0];

  it('tutte le voci segnate (Ottenute o Esaurite; le descrittive non contano): spunta sull’area, sulla stanza che ha tutte le aree completate e nei chip', async () => {
    getDungeon.mockResolvedValue(conVoci({
      'k-01': [voceGuida('a', 'sicura', 'ottenuto')],
      'k-03': [voceGuida('b', 'forziere', 'esaurito'), voceGuida('c', 'altro', null)],
    }));
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const riga = rigaCancello();
    // la stanza: la spunta dopo il nome, e «(completata)» per chi usa un lettore di schermo
    expect(within(riga).getAllByRole('button')[1]).toHaveAccessibleName(/Cancello \(completata\).*1\. Cancello \(completata\).*3\. Cortile \(completata\)/);
    // tre spunte: la stanza e le sue due aree
    expect(riga.querySelectorAll('[data-completata]')).toHaveLength(3);
    // i chip sopra la mappa
    const chip = within(screen.getByRole('list', { name: 'Aree della guida su questa planimetria' })).getAllByRole('button');
    expect(chip.map((b) => b.textContent)).toEqual(['1. Cancello (completata)', '3. Cortile (completata)']);
    expect(chip.every((b) => b.querySelector('[data-completata]'))).toBe(true);
  });

  it('una voce ancora da fare: niente spunta su quell’area né sulla stanza; un’area senza voci da segnare non ha spunta', async () => {
    getDungeon.mockResolvedValue(conVoci({
      'k-01': [voceGuida('a', 'sicura', 'ottenuto')],
      'k-03': [voceGuida('b', 'forziere', 'esaurito'), voceGuida('d', 'boss', null)],
      'k-02': [voceGuida('e', 'altro', null)],
    }));
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const riga = rigaCancello();
    expect(riga.querySelectorAll('[data-completata]')).toHaveLength(1);
    expect(within(riga).getAllByRole('button')[1]).toHaveAccessibleName(/1\. Cancello \(completata\) ?· 3\. Cortile$/);
    // la Torre ha solo una nota descrittiva: nessuna spunta
    const torre = within(screen.getByRole('list', { name: 'Stanze del Palazzo' })).getAllByRole('listitem')[1];
    expect(torre.querySelectorAll('[data-completata]')).toHaveLength(0);
    const chip = within(screen.getByRole('list', { name: 'Aree della guida su questa planimetria' })).getAllByRole('button');
    expect(chip.map((b) => b.textContent)).toEqual(['1. Cancello (completata)', '3. Cortile']);
  });

  it('un’area della guida senza planimetria, completata, ha la spunta sulla sua riga in coda all’elenco', async () => {
    const d = palazzo(true);
    // la Torre (k-02) non ha planimetrie: sta fra le aree in coda
    d.aree[1] = { ...d.aree[1], punti: [voceGuida('t', 'miniboss', 'ottenuto')] };
    getDungeon.mockResolvedValue(d);
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const orfane = within(screen.getByRole('list', { name: 'Aree della guida senza planimetria' }));
    const torre = orfane.getByRole('button', { name: /2\. Torre \(completata\)/ });
    expect(torre.closest('li')!.querySelectorAll('[data-completata]')).toHaveLength(1);
    // le stanze con planimetria non ne sono toccate: le loro aree hanno voci ancora da fare o nessuna
    expect(screen.getByRole('list', { name: 'Stanze del Palazzo' }).querySelectorAll('[data-completata]')).toHaveLength(0);
  });

  it('in una stanza con più versioni la spunta compare sulla stanza, nelle sue aree, in ogni versione che contiene l’area e sulla versione senza niente da raccogliere (2026-10-11)', async () => {
    const { dungeon, albero } = conDueVersioni();
    // l'area Cancello è completata; la versione «Pianta completa» ha 1 su 2 da raccogliere, «Porzione ovest» niente e nessuna area
    dungeon.aree[0] = { ...dungeon.aree[0], punti: [voceGuida('a', 'sicura', 'ottenuto')] };
    getDungeon.mockResolvedValue(dungeon);
    getAlberoMappe.mockResolvedValue(albero);
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
    const versioni = within(await pannello.findByRole('list', { name: 'Planimetrie di Cancello' }));
    const [completa, ovest] = versioni.getAllByRole('listitem');
    // la versione che contiene l'area ha la spunta dell'area; la sua raccolta (1 su 2) non è completa, quindi lei no
    expect(completa.querySelectorAll('[data-completata]')).toHaveLength(1);
    expect(within(completa).getByRole('button', { name: /Pianta completa.*1\. Cancello \(completata\)/ })).toBeInTheDocument();
    // quella senza niente da raccogliere è completa per raccolta: la sua ✓ e il testo
    expect(ovest.querySelectorAll('[data-completata]')).toHaveLength(1);
    expect(within(ovest).getByRole('button', { name: /^Porzione ovest \(completata\)/ })).toHaveTextContent('niente da raccogliere · completa');
    // in tutto la riga della stanza ne ha quattro: la stanza, l'area nell'intestazione, l'area nella versione e la versione vuota
    const stanza = within(screen.getByRole('list', { name: 'Stanze del Palazzo' })).getAllByRole('listitem')[0];
    expect(stanza.querySelectorAll('[data-completata]')).toHaveLength(4);
  });

  it('una planimetria senza niente da raccogliere è completa (2026-10-11): testo, ✓, chip delle complete; senza partita resta solo «niente da raccogliere»', async () => {
    const p = palazzo(true);
    // la Torre (2 da raccogliere) diventa vuota; il server la conta fra le complete
    const conVuota: DungeonDettaglioDto = { ...p, raccolta: { ...p.raccolta, totale: 2, mappeComplete: 1 }, planimetrie: [p.planimetrie[0], { ...p.planimetrie[1], n: 0, presi: 0, spilli: [] }] };
    getDungeon.mockResolvedValue(conVuota);
    getAlberoMappe.mockResolvedValue([]);
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    expect(screen.getByText('2 planimetrie · 1 complete')).toBeInTheDocument();
    const stanze = within(screen.getByRole('list', { name: 'Stanze del Palazzo' }));
    const torre = stanze.getAllByRole('listitem').find((li) => li.textContent?.includes('Torre'))!;
    expect(torre).toHaveTextContent('niente da raccogliere · completa');
    expect(torre.querySelectorAll('[data-completata]')).toHaveLength(1);
    // segnando l'ultimo collezionabile del Cancello il chip si aggiorna subito, con la stessa regola: anche la Torre vuota conta
    impostaSpilloRaccolto.mockResolvedValue({});
    getDungeon.mockImplementation(() => new Promise<DungeonDettaglioDto>(() => {}));
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Forziere 2 di Cancello aperto' })[0]);
    await waitFor(() => expect(screen.getByText('2 planimetrie · 2 complete')).toBeInTheDocument());
    cleanup();
    getDungeon.mockReset();
    // senza partita niente è completo
    const senza = palazzo(false);
    getDungeon.mockResolvedValue({ ...senza, planimetrie: [senza.planimetrie[0], { ...senza.planimetrie[1], n: 0, presi: null, spilli: [] }] });
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const torreSenza = within(screen.getByRole('list', { name: 'Stanze del Palazzo' })).getAllByRole('listitem').find((li) => li.textContent?.includes('Torre'))!;
    expect(torreSenza).toHaveTextContent('niente da raccogliere');
    expect(torreSenza).not.toHaveTextContent('· completa');
    expect(torreSenza.querySelectorAll('[data-completata]')).toHaveLength(0);
  });

  it('segnando l’ultima voce dalla guida la spunta compare subito, prima della rilettura; riaprendola sparisce subito', async () => {
    // le riletture dopo ogni gesto restano in sospeso: quello che si vede viene solo dall'aggiornamento immediato della pagina
    getDungeon.mockResolvedValueOnce(palazzo(true)).mockImplementation(() => new Promise<DungeonDettaglioDto>(() => {}));
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    /** L'elenco delle stanze, riletto a ogni chiamata (la pagina si ridisegna dopo ogni gesto). */
    const stanze = () => screen.getByRole('list', { name: 'Stanze del Palazzo' });
    expect(stanze().querySelectorAll('[data-completata]')).toHaveLength(0);
    // la Sicura del cancello è l'unica voce dell'area Cancello
    fireEvent.click(screen.getByRole('button', { name: /Sicura del cancello/ }));
    impostaStatoPunto.mockResolvedValueOnce(voceGuida('p1', 'sicura', 'ottenuto'));
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(impostaStatoPunto).toHaveBeenCalledWith(4, 'p1', 'ottenuto'));
    // spunta sull'area e sulla stanza, che ha solo quell'area
    await waitFor(() => expect(stanze().querySelectorAll('[data-completata]')).toHaveLength(2));
    impostaStatoPunto.mockResolvedValueOnce(voceGuida('p1', 'sicura', null));
    fireEvent.click(screen.getByRole('button', { name: 'Riapri' }));
    await waitFor(() => expect(impostaStatoPunto).toHaveBeenLastCalledWith(4, 'p1', null));
    await waitFor(() => expect(stanze().querySelectorAll('[data-completata]')).toHaveLength(0));
  });

  it('senza partita le voci non hanno stato: nessuna spunta', async () => {
    usePartitaStore.setState({ attiva: null });
    getDungeon.mockResolvedValue(conVoci({ 'k-01': [voceGuida('a', 'sicura', null)] }));
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    expect(document.querySelectorAll('[data-completata]')).toHaveLength(0);
  });
});

it('una planimetria con più aree le mostra in ordine di guida: nell’elenco del Palazzo e sopra la mappa', async () => {
  getDungeon.mockResolvedValue(palazzoConPiuAree());
  getAlberoMappe.mockResolvedValue([]);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  // la riga della stanza: le aree nell'ordine della guida, non in quello in cui arrivano
  const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
  // (le aree sono elementi distinti, per la spunta di quelle completate: si confronta il testo intero della riga)
  expect(pannello.getByText((_, el) => el?.tagName === 'SPAN' && el.textContent === '1. Cancello · 3. Cortile')).toBeInTheDocument();
  // sopra la mappa, le aree della planimetria a schermo: toccarne una apre quell'area sulla stessa mappa
  const sullaPianta = within(screen.getByRole('list', { name: 'Aree della guida su questa planimetria' }));
  const voci = sullaPianta.getAllByRole('button');
  expect(voci.map((b) => b.textContent)).toEqual(['1. Cancello', '3. Cortile']);
  expect(voci[0]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(voci[1]);
  expect(await screen.findByRole('heading', { name: 'Cortile' })).toBeInTheDocument();
  expect(screen.getByText('Visore: m-cancello')).toBeInTheDocument();
});

it('le aree di una planimetria si scelgono insieme nella scheda: in ordine, con dove stanno le altre, e si salva l’insieme', async () => {
  getDungeon.mockResolvedValue(palazzoConPiuAree());
  getAlberoMappe.mockResolvedValue([]);
  impostaAreeMappa.mockResolvedValue({ aree: [] });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const pannello = within(screen.getByLabelText('Planimetrie del Palazzo'));
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
  const caselle = finestra.getAllByRole('checkbox');
  // tutte le aree del Palazzo, in ordine di guida, con spuntate quelle della planimetria
  expect(caselle.map((c) => c.closest('label')!.textContent)).toEqual(['1. Cancello', '2. Torreora su «Torre»', '3. Cortile']);
  expect(caselle.map((c) => (c as HTMLInputElement).checked)).toEqual([true, false, true]);
  // senza cambiamenti non si salva niente
  expect(finestra.getByRole('button', { name: 'Salva' })).toBeDisabled();
  fireEvent.click(caselle[1]);
  // spuntare un'area che sta altrove la aggiunge anche qui, senza toglierla da lì (2026-10-04): niente più «lascia la planimetria»
  expect(caselle[1].closest('label')!.textContent).toBe('2. Torreanche su «Torre»');
  expect(finestra.queryByText(/lascia la planimetria|si sposta qui/)).toBeNull();
  // con una modifica non salvata, cambiare stanza aspetta (la scheda lo dice)
  expect(finestra.getByText('Salva prima le modifiche qui sopra per cambiare stanza.')).toBeInTheDocument();
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
  fireEvent.click(screen.getByRole('button', { name: /^Modifica testo: l’area/ }));
  const modulo = screen.getByRole('form', { name: /Correggi l’area/ });
  fireEvent.change(within(modulo).getByLabelText('Nome dell’area'), { target: { value: 'Scritto per sbaglio' } });
  // si cambia area dall'elenco: «Torre» è un'area senza planimetria, in coda (non la stanza omonima)
  fireEvent.click(within(screen.getByRole('list', { name: 'Aree della guida senza planimetria' })).getByRole('button', { name: /^2\. Torre/ }));

  // il modulo si è chiuso con la sua bozza: riaprendolo sull'altra area c'è il nome dell'altra area
  fireEvent.click(screen.getByRole('button', { name: /^Modifica testo: l’area/ }));
  expect(within(screen.getByRole('form', { name: /Correggi l’area/ })).getByLabelText('Nome dell’area')).toHaveValue('Torre');
  expect(aggiornaArea).not.toHaveBeenCalled();
});

it('salvata l’intestazione, la scheda si rilegge con la partita attiva', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  aggiornaDungeon.mockResolvedValue(palazzo(false));
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  getDungeon.mockClear();
  fireEvent.click(screen.getByRole('button', { name: /^Correggi la scheda: il Palazzo/ }));
  const modulo = screen.getByRole('form', { name: /Correggi il Palazzo/ });
  fireEvent.change(within(modulo).getByLabelText('Nome'), { target: { value: 'Castello' } });
  fireEvent.click(within(modulo).getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaDungeon).toHaveBeenCalledWith('kamoshida', expect.objectContaining({ nome: 'Castello' })));
  // la risposta del PUT non porta lo stato della partita: la scheda si rilegge con l'id
  await waitFor(() => expect(getDungeon).toHaveBeenCalledWith('kamoshida', 4));
});

it('la scheda salva solo quel che cambia: la sola etichetta non tocca nome, stanza e aree', async () => {
  const pannello = await apriPlanimetrie();
  aggiornaPresentazioneMappa.mockResolvedValue({});
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
  fireEvent.change(finestra.getByLabelText('Che cosa mostra'), { target: { value: 'Livello 0' } });
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaPresentazioneMappa).toHaveBeenCalledWith('m-cancello', { etichetta: 'Livello 0' }));
  expect(aggiornaMappa).not.toHaveBeenCalled();
  expect(impostaAreeMappa).not.toHaveBeenCalled();
});

// ---- Una sezione nuova della guida (richiesta dell'utente, 2026-10-01) ----

it('dalla scheda di una planimetria senza aree si crea un’area dentro di lei: nome della stanza proposto, in fondo al Palazzo', async () => {
  const pannello = await apriPlanimetrie();
  creaArea.mockResolvedValue({ chiave: 'kamoshida-cancello-interno', nome: 'Cancello', ordine: 1 });
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Torre' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Torre · Immagine 1' }));
  // la Torre non contiene aree: lo dice, e offre di crearne una
  expect(finestra.getByText('Non contiene sezioni della guida: creane una qui.')).toBeInTheDocument();
  fireEvent.click(finestra.getByRole('button', { name: 'Nuova area della guida…' }));
  const modulo = within(finestra.getByRole('form', { name: 'Nuova area della guida' }));
  expect(modulo.getByLabelText('Nome dell’area')).toHaveValue('Torre');
  // il modulo si apre dal nome
  expect(modulo.getByLabelText('Nome dell’area')).toHaveFocus();
  fireEvent.change(modulo.getByLabelText('Nome dell’area'), { target: { value: 'Torre di guardia' } });
  fireEvent.change(modulo.getByLabelText('Descrizione'), { target: { value: 'In cima alle scale.' } });
  fireEvent.click(modulo.getByRole('button', { name: 'Crea l’area' }));
  // la Torre non ha aree: va in fondo; con la planimetria, si aggiunge a lei
  await waitFor(() => expect(creaArea).toHaveBeenCalledWith('kamoshida', { nome: 'Torre di guardia', descrizione: 'In cima alle scale.', planimetria: 'm-torre' }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(getDungeon).toHaveBeenCalledTimes(2);
});

it('una planimetria che ha già un’area propone il posto subito dopo di lei', async () => {
  const pannello = await apriPlanimetrie();
  creaArea.mockResolvedValue({ chiave: 'kamoshida-garitta', nome: 'Garitta', ordine: 1 });
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Cancello' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Cancello · Immagine 1' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Nuova area della guida…' }));
  const modulo = within(finestra.getByRole('form', { name: 'Nuova area della guida' }));
  expect(modulo.getByText('Dopo «1. Cancello»')).toBeInTheDocument();
  fireEvent.change(modulo.getByLabelText('Nome dell’area'), { target: { value: 'Garitta' } });
  fireEvent.click(modulo.getByRole('button', { name: 'Crea l’area' }));
  await waitFor(() => expect(creaArea).toHaveBeenCalledWith('kamoshida', { nome: 'Garitta', descrizione: '', dopo: 'k-01', planimetria: 'm-cancello' }));
});

it('a modulo aperto, con modifiche non salvate nella scheda l’area non si crea: lo dice, e l’invio aspetta', async () => {
  const pannello = await apriPlanimetrie();
  fireEvent.click(pannello.getByRole('button', { name: 'Gestisci «Immagine 1» di Torre' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Torre · Immagine 1' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Nuova area della guida…' }));
  const modulo = within(finestra.getByRole('form', { name: 'Nuova area della guida' }));
  expect(modulo.getByRole('button', { name: 'Crea l’area' })).toBeEnabled();
  // una modifica nella scheda, con il modulo già aperto: creando, la finestra si chiuderebbe e la modifica andrebbe persa
  fireEvent.change(finestra.getByLabelText('Che cosa mostra'), { target: { value: 'Piano alto' } });
  expect(modulo.getByRole('status')).toHaveTextContent('Salva prima le modifiche della scheda: creando l’area la finestra si chiude.');
  expect(modulo.getByRole('button', { name: 'Crea l’area' })).toBeDisabled();
  fireEvent.submit(finestra.getByRole('form', { name: 'Nuova area della guida' }));
  expect(creaArea).not.toHaveBeenCalled();
  // la conferma dell'eliminazione aperta ferma anche lei
  fireEvent.change(finestra.getByLabelText('Che cosa mostra'), { target: { value: '' } });
  expect(modulo.getByRole('button', { name: 'Crea l’area' })).toBeEnabled();
  fireEvent.click(finestra.getByRole('button', { name: 'Elimina…' }));
  expect(modulo.getByRole('status')).toHaveTextContent('Chiudi prima la conferma dell’eliminazione.');
  expect(modulo.getByRole('button', { name: 'Crea l’area' })).toBeDisabled();
});

it('dalla colonna del Palazzo si crea un’area senza planimetria, nel posto scelto, e la scheda la apre', async () => {
  // l'area nuova in fondo alla risposta: se la scheda non la aprisse, resterebbe aperta la prima (Cancello)
  const conAtrio = (): DungeonDettaglioDto => { const p = palazzo(true); return { ...p, aree: [...p.aree, { ...p.aree[1], chiave: 'kamoshida-atrio', nome: 'Atrio', ordine: 3, punti: [] }] }; };
  const pannello = await apriPlanimetrie();
  getDungeon.mockResolvedValue(conAtrio());
  creaArea.mockResolvedValue({ chiave: 'kamoshida-atrio', nome: 'Atrio', ordine: 0 });
  fireEvent.click(pannello.getByRole('button', { name: 'Nuova area della guida' }));
  const finestra = within(screen.getByRole('dialog', { name: 'Nuova area della guida' }));
  fireEvent.change(finestra.getByLabelText('Nome dell’area'), { target: { value: 'Atrio' } });
  // il posto: «All'inizio del Palazzo»
  fireEvent.click(finestra.getByRole('combobox', { name: 'Dove va nella guida' }));
  fireEvent.click(screen.getByRole('option', { name: 'All’inizio del Palazzo' }).querySelector('button')!);
  fireEvent.click(finestra.getByRole('button', { name: 'Crea l’area' }));
  await waitFor(() => expect(creaArea).toHaveBeenCalledWith('kamoshida', { nome: 'Atrio', descrizione: '', dopo: null }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  // creata, la scheda apre l'area nuova (la riletta la contiene)
  expect(await screen.findByRole('heading', { name: 'Atrio' })).toBeInTheDocument();
});

it('dall’intestazione del Palazzo si sceglie dove si atterra dalla mappa di Tokyo: salvata la regola, la scheda si rilegge e la mostra (2026-10-04)', async () => {
  /** La scheda dopo il salvataggio: finestra 11 aprile – 2 maggio e una regola «sempre» sul Cancello, che vale oggi. */
  const conRegola = (): DungeonDettaglioDto => ({ ...palazzo(true), finestra: { dal: '04-11', al: '05-02' },
    atterraggi: [{ dal: null, al: null, mappa: 'm-cancello', mappaNome: 'Palazzo di Kamoshida › Cancello', spillo: null, spilloNome: null }], atterraggio: { mappa: 'm-cancello', spillo: null } });
  getDungeon.mockResolvedValueOnce(palazzo(true)).mockResolvedValue(conRegola());
  getMappa.mockResolvedValue({ chiave: 'm-cancello', spilli: [] });
  impostaAtterraggiDungeon.mockResolvedValue(conRegola().atterraggi);
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  // senza finestra il Palazzo c'è sempre, e lo dice il pulsante
  fireEvent.click(screen.getByRole('button', { name: /Sulla mappa di Tokyo.*sempre/ }));
  const finestra = within(screen.getByRole('dialog', { name: 'Sulla mappa di Tokyo — Palazzo di Kamoshida' }));
  expect(finestra.getByText('Oggi nessuna regola vale: si apre la scheda del Palazzo.')).toBeInTheDocument();
  fireEvent.click(finestra.getByRole('button', { name: /Aggiungi una regola/ }));
  fireEvent.click(finestra.getByRole('button', { name: /Salva le regole/ }));
  await waitFor(() => expect(impostaAtterraggiDungeon).toHaveBeenCalledWith('kamoshida', [{ dal: null, al: null, mappa: 'm-cancello', spillo: null }]));
  // la scheda riletta: la regola vale oggi, e il pulsante dice la finestra
  expect(await finestra.findByText(/Oggi si atterra su:/)).toHaveTextContent('Oggi si atterra su: Cancello.');
  expect(getDungeon).toHaveBeenCalledTimes(2);
  expect(screen.getByRole('button', { name: /Sulla mappa di Tokyo.*dall’11 aprile al 2 maggio/ })).toBeInTheDocument();
});

it('cambiato il giorno della partita, la scheda del Palazzo si rilegge: «Oggi si atterra su…» segue il giorno (2026-10-04)', async () => {
  /** La scheda con le due regole del tutorial e l'atterraggio del giorno dato. */
  const conAtterraggio = (mappa: string): DungeonDettaglioDto => ({ ...palazzo(true), finestra: { dal: '04-11', al: '05-02' },
    atterraggi: [
      { dal: '04-11', al: '04-11', mappa: 'm-cancello', mappaNome: 'Palazzo di Kamoshida › Cancello', spillo: null, spilloNome: null },
      { dal: null, al: null, mappa: 'm-torre', mappaNome: 'Palazzo di Kamoshida › Torre', spillo: null, spilloNome: null },
    ], atterraggio: { mappa, spillo: null } });
  usePartitaStore.setState({ attiva: { id: 4, nome: 'Royal', dataGioco: '04-11' } as PartitaDto });
  getDungeon.mockResolvedValueOnce(conAtterraggio('m-cancello')).mockResolvedValue(conAtterraggio('m-torre'));
  getMappa.mockResolvedValue({ chiave: 'm-cancello', spilli: [] });
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Sulla mappa di Tokyo/ }));
  const finestra = within(screen.getByRole('dialog', { name: 'Sulla mappa di Tokyo — Palazzo di Kamoshida' }));
  expect(finestra.getByText(/Oggi si atterra su:/)).toHaveTextContent('Oggi si atterra su: Cancello.');
  // la partita passa al 12: la scheda si rilegge e la regola «sempre» prende il posto di quella dell'11
  act(() => usePartitaStore.setState({ attiva: { id: 4, nome: 'Royal', dataGioco: '04-12' } as PartitaDto }));
  await waitFor(() => expect(finestra.getByText(/Oggi si atterra su:/)).toHaveTextContent('Oggi si atterra su: Torre.'));
  expect(getDungeon).toHaveBeenCalledTimes(2);
});
