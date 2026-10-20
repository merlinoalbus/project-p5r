/** @vitest-environment jsdom */
// ============================================================
// Test DungeonDettaglioPage — la raccolta sulle planimetrie con «Raccolto», gli obiettivi dei dedali, i punti della guida ripiegati
// ============================================================

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { DungeonDettaglioPage } from './DungeonDettaglioPage';
import { scegliVoce, vociSelettore } from '../../test/selettore';
import { usePartitaStore } from '../stores/partitaStore';
import { notifica } from '../stores/notificationStore';
import type { AreaDedaloDto, AreaDungeonDto, DungeonDettaglioDto, PartitaDto, PuntoInteresseDto } from '../types';
import type { SceltaPin } from '../components/mappe/VisoreMappa';
import type { ReactNode } from 'react';
import { ApiError } from '../services/api/_helpers';
import type { AreaDettaglioDto, AreaRiassuntoDto } from '../types';

const { aggiornaCompendio, getDungeon, impostaStatoPunto, impostaSpilloRaccolto, impostaTimbri, impostaStatoRichiesta, eliminaMappa, getAlberoMappe, aggiornaDungeon, aggiornaArea, aggiornaPunto, creaPunto, eliminaPunto, eliminaArea, collegaPinAlPunto, spostaPunto, creaArea, impostaAtterraggiDungeon, getMappa,
  getArea, riordinaAree, eliminaAreaMondo, aggiornaAreaMondo, aggiornaPlanimetrieArea, impostaInfiltrazioniArea, impostaAreeInfiltrazione, collocaPlanimetria, creaAreaMondo, getDivergenze, togliFattoAlPin, getVocePercorso, risolviMappa,
  creaVoceDallaScheda, collegaSchedaAllaVoce } = vi.hoisted(() => ({
  // L4: le divergenze «da verificare» e «Togli il fatto al pin»
  getDivergenze: vi.fn(), togliFattoAlPin: vi.fn(),
  // L4 §4.3: i due gesti delle «Schede da sistemare»
  creaVoceDallaScheda: vi.fn(), collegaSchedaAllaVoce: vi.fn(),
  // L3 UX3-1: la voce del diario da cui si arriva (`?daVoce=`)
  getVocePercorso: vi.fn(),
  // L3 AP3-2: la casa della planimetria d'arrivo di un passaggio con una chiave che la scheda non conosce
  risolviMappa: vi.fn(),
  aggiornaCompendio: vi.fn(), getDungeon: vi.fn(), impostaStatoPunto: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaTimbri: vi.fn(), impostaStatoRichiesta: vi.fn(),
  eliminaMappa: vi.fn(), getAlberoMappe: vi.fn(), aggiornaDungeon: vi.fn(), aggiornaArea: vi.fn(), aggiornaPunto: vi.fn(), creaPunto: vi.fn(), eliminaPunto: vi.fn(), eliminaArea: vi.fn(), collegaPinAlPunto: vi.fn(), spostaPunto: vi.fn(), creaArea: vi.fn(), impostaAtterraggiDungeon: vi.fn(), getMappa: vi.fn(),
  // L3 (2026-10-20): le Aree del Palazzo con le rotte di L2 (contenitore `dungeon`) e i legami infiltrazione ↔ area
  getArea: vi.fn(), riordinaAree: vi.fn(), eliminaAreaMondo: vi.fn(), aggiornaAreaMondo: vi.fn(), aggiornaPlanimetrieArea: vi.fn(), impostaInfiltrazioniArea: vi.fn(), impostaAreeInfiltrazione: vi.fn(), collocaPlanimetria: vi.fn(), creaAreaMondo: vi.fn(),
}));
vi.mock('../services/api', (vero) => moduloApi(vero, { aggiornaCompendio, getDungeon, impostaStatoPunto, eliminaMappa, getAlberoMappe, aggiornaDungeon, aggiornaArea, aggiornaPunto, creaPunto, eliminaPunto, eliminaArea, collegaPinAlPunto, spostaPunto, creaArea, impostaSpilloRaccolto, impostaTimbri, impostaStatoRichiesta, impostaAtterraggiDungeon, getMappa,
  getArea, riordinaAree, eliminaAreaMondo, aggiornaAreaMondo, aggiornaPlanimetrieArea, impostaInfiltrazioniArea, impostaAreeInfiltrazione, collocaPlanimetria, creaAreaMondo, getDivergenze, togliFattoAlPin, getVocePercorso, risolviMappa,
  creaVoceDallaScheda, collegaSchedaAllaVoce }));
vi.mock('../stores/notificationStore', (vero) => moduloNotifiche(vero));
// `useMedia` risponde alla larghezza scelta dal test (0 di partenza: la scheda sotto i 1024 px, come in jsdom senza finto)
const media = vi.hoisted(() => ({ larghezza: 0 }));
vi.mock('../hooks/useMedia', () => ({ useMedia: (q: string) => { const m = /min-width:\s*(\d+)px/.exec(q); return m ? media.larghezza >= Number(m[1]) : false; } }));
vi.mock('../stores/suggerimentiStore', () => ({ useSuggerimenti: () => ({ evidenziato: () => false, motivo: () => null }) }));
// il visore vero è provato a parte: qui dice planimetria e, collegando i pin (2026-10-18), che cosa riceve, e «tocca» il pin 3
// L3: anche il pannello del visore («Infiltrazioni in quest'area») e lo spillo dell'indirizzo; AP3-2: `senzaVicine` e due passaggi
// (verso una planimetria che la scheda conosce, e verso una chiave interna da risolvere), con lo spillo d'arrivo 9
vi.mock('../components/mappe/MappaIncorporata', () => ({ MappaIncorporata: ({ chiave, classeVisore, scelta, contenutiPannello, spilloIniziale, senzaVicine, onNaviga, primaDiRiaprire, infiltrazione }: { chiave: string; classeVisore?: string; scelta?: SceltaPin; contenutiPannello?: ReactNode; spilloIniziale?: number | null; senzaVicine?: boolean; onNaviga?: (k: string, arrivo?: { spillo: number }) => void; primaDiRiaprire?: (s: { id: number }, voce: string | null) => Promise<boolean>; infiltrazione?: string | null }) => (
  <div data-classe-visore={classeVisore} data-senza-vicine={senzaVicine ? 'sì' : undefined} data-infiltrazione={infiltrazione ?? undefined}>
    {/* L4 §8.6: il popup del pin «toglie il segno» al pin 1 chiedendo prima alla pagina; l'esito si scrive qui */}
    {primaDiRiaprire && <button type="button" onClick={(e) => { const b = e.currentTarget; void primaDiRiaprire({ id: 1 }, null).then((ok) => { b.dataset.esito = String(ok); }); }}>Togli il segno al pin 1 dal popup</button>}Visore: {chiave}{scelta ? ` · scelta per ${scelta.titolo} · ${scelta.scelti.size} scelti · sbiaditi ${String(scelta.attenuaNascosti)} · cerca «${scelta.ricerca ?? ''}»` : ''}{spilloIniziale ? ` · pin ${spilloIniziale}` : ''}
    {scelta && <button type="button" onClick={() => scelta.onScegli({ id: 3, nome: 'Forziere della torre' } as Parameters<SceltaPin['onScegli']>[0])}>Tocca il pin 3</button>}
    {onNaviga && <button type="button" onClick={() => onNaviga('m-cortile', { spillo: 9 })}>Passaggio al Cortile</button>}
    {onNaviga && <button type="button" onClick={() => onNaviga('nativo-cortile', { spillo: 9 })}>Passaggio interno al Cortile</button>}
    {contenutiPannello}</div>
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
  chiave: 'k-01', ordine: 0, nome: 'Cancello', descrizione: '', mappe: [], punti: [], dedalo: null, ...extra,
});
/** Un'Area del Palazzo di prova (L3): slug, nome, predefinita, versioni, infiltrazioni che la toccano e raccolta. */
const areaPalazzo = (slug: string, nome: string, predefinita: string, infiltrazioni: Array<{ chiave: string; nome: string; ordine: number }>, raccolta: { n: number; presi: number | null }, extra: Partial<AreaRiassuntoDto> = {}): AreaRiassuntoDto => ({
  chiave: `dungeon/kamoshida/${slug}`, contenitore: { tipo: 'dungeon', chiave: 'kamoshida', nome: 'Palazzo di Kamoshida' }, slug, nome, nomeRivisto: false, ordine: 0, predefinita,
  illustrazione: { immagineUrl: null, asset: null }, numeroPlanimetrie: 1, numeroSpilli: raccolta.n, passaggio: null, ingresso: false, origine: 'seed', modificata: false, daVerificare: false,
  casa: `/guida/dungeon/kamoshida/area/${slug}`, infiltrazioni, raccolta, ...extra,
});
/** Il Palazzo di Kamoshida di prova: tre infiltrazioni (Cancello con una sicura, Torre, Cortile) e tre Aree (L3): «Cancello» (la sua
 *  planimetria con 2 forzieri, toccata dall'infiltrazione Cancello), «Torre alta» (2 forzieri, nessuna infiltrazione) e «Cortile»
 *  (niente da raccogliere, toccata dall'infiltrazione Cortile). L'infiltrazione Torre non tocca aree. Con `partita` i conteggi e gli
 *  spilli portano lo stato della partita (1 preso su 4), senza restano `null`. */
const palazzo = (partita: boolean): DungeonDettaglioDto => ({
  chiave: 'kamoshida', tipo: 'palazzo', ordine: 1, nome: 'Palazzo di Kamoshida', sovrano: 'Kamoshida', arcanaSovrano: '', arcanaSovranoNome: '',
  date: { sblocco: '12 Aprile', scadenza: '2 maggio', furtoConsigliato: '' }, finestra: null, livelloConsigliato: '', punti: 2, esauribili: 1, gestiti: partita ? 0 : null,
  raccolta: { totale: 4, presi: partita ? 1 : null, mappe: 3, mappeComplete: partita ? 0 : null }, completato: null, concluso: null, atterraggio: null, atterraggi: [], illustrazione: { immagineUrl: null, asset: null }, personeCatturate: partita ? [] : null, note: '', fonti: [],
  aree: [
    area({ mappe: [{ chiave: 'm-cancello', nome: 'Palazzo di Kamoshida › Cancello', n: 2, presi: partita ? 1 : null, spilli: [spillo(1, partita ? true : null), spillo(2, partita ? false : null)], area: 'dungeon/kamoshida/cancello' }],
      areePalazzo: [{ chiave: 'dungeon/kamoshida/cancello', slug: 'cancello', nome: 'Cancello', planimetriaIniziale: 'm-cancello' }],
      punti: [{ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: null, marcatore: null, pin: [], contenitore: null, areaDedalo: null, persona: null, areeDedalo: [] }] }),
    area({ chiave: 'k-02', ordine: 1, nome: 'Torre', punti: [], areePalazzo: [] }),
    area({ chiave: 'k-03', ordine: 2, nome: 'Cortile', mappe: [{ chiave: 'm-cortile', nome: 'Palazzo di Kamoshida › Cortile', n: 0, presi: partita ? 0 : null, spilli: [], area: 'dungeon/kamoshida/cortile' }],
      areePalazzo: [{ chiave: 'dungeon/kamoshida/cortile', slug: 'cortile', nome: 'Cortile', planimetriaIniziale: 'm-cortile' }] }),
  ],
  planimetrie: [
    { chiave: 'm-cancello', nome: 'Palazzo di Kamoshida › Cancello', ordine: 0, aree: [{ chiave: 'k-01', nome: 'Cancello', ordine: 0 }], n: 2, presi: partita ? 1 : null, spilli: [spillo(1, partita ? true : null), spillo(2, partita ? false : null)], area: 'dungeon/kamoshida/cancello' },
    { chiave: 'm-torre', nome: 'Palazzo di Kamoshida › Torre', ordine: 1, aree: [], n: 2, presi: partita ? 0 : null, spilli: [spillo(3, partita ? false : null), spillo(4, partita ? false : null)], area: 'dungeon/kamoshida/torre-alta' },
    { chiave: 'm-cortile', nome: 'Palazzo di Kamoshida › Cortile', ordine: 2, aree: [{ chiave: 'k-03', nome: 'Cortile', ordine: 2 }], n: 0, presi: partita ? 0 : null, spilli: [], area: 'dungeon/kamoshida/cortile' },
  ],
  areePalazzo: [
    areaPalazzo('cancello', 'Cancello', 'm-cancello', [{ chiave: 'k-01', nome: 'Cancello', ordine: 0 }], { n: 2, presi: partita ? 1 : null }),
    areaPalazzo('torre-alta', 'Torre alta', 'm-torre', [], { n: 2, presi: partita ? 0 : null }, { ordine: 1 }),
    areaPalazzo('cortile', 'Cortile', 'm-cortile', [{ chiave: 'k-03', nome: 'Cortile', ordine: 2 }], { n: 0, presi: partita ? 0 : null }, { ordine: 2 }),
  ],
});
/** La pagina di un'Area del Palazzo (`getArea`), costruita dal Palazzo dato: le sue versioni dalle planimetrie con quell'area. */
const dettaglioDi = (d: DungeonDettaglioDto, slug: string): AreaDettaglioDto => {
  const a = d.areePalazzo!.find((x) => x.slug === slug)!;
  const versioni = d.planimetrie.filter((p) => p.area === a.chiave);
  return { ...a, numeroPlanimetrie: versioni.length, elementi: [], vicine: [],
    planimetrie: versioni.map((p, i) => ({ chiave: p.chiave, nome: a.nome, etichetta: (p as { versioneEtichetta?: string | null }).versioneEtichetta ?? null, ordine: i, predefinita: p.chiave === a.predefinita, numeroSpilli: p.spilli.length, immagineUrl: null, asset: null, ruoloImmagine: 'planimetria-nativa' as const })) };
};
/** `getArea` risponde con l'area del Palazzo della prima lettura della scheda (quella che il test ha preparato per l'arrivo). */
const areaDellaPrimaLettura = async (_contenitore: unknown, slug: string): Promise<AreaDettaglioDto> => {
  const prima = getDungeon.mock.results[0]?.value as Promise<DungeonDettaglioDto> | DungeonDettaglioDto | undefined;
  return dettaglioDi(prima ? await prima : palazzo(true), slug);
};
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
// L3: anche la casa di un'Area (`/guida/dungeon/:chiave/area/:slug`), e l'indirizzo corrente scritto sotto la scheda
function Indirizzo() { const l = useLocation(); return <p data-testid="indirizzo">{l.pathname}{l.search}</p>; }
// (`coda`: quel che segue la chiave nell'indirizzo d'arrivo, per esempio `/area/cortile` o `?infiltrazione=in-corso`)
const monta = (chiave: string, coda = '') => render(<MemoryRouter initialEntries={[`/guida/dungeon/${chiave}${coda}`]}><Routes>
  <Route path="/guida/dungeon/:chiave" element={<><DungeonDettaglioPage /><Indirizzo /></>} />
  <Route path="/guida/dungeon/:chiave/area/:slug" element={<><DungeonDettaglioPage /><Indirizzo /></>} />
</Routes></MemoryRouter>);

// reset, non clear: le risposte «una volta» non consumate da un test non devono passare al successivo
beforeEach(() => { vi.resetAllMocks(); media.larghezza = 0; getAlberoMappe.mockResolvedValue([]); getArea.mockImplementation(areaDellaPrimaLettura); usePartitaStore.setState({ attiva: { id: 4, nome: 'Royal' } as PartitaDto }); });

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
  expect(screen.getByText(/Guida dell’infiltrazione · 1 voce · 1 da collegare/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Sicura del cancello/ }));
  impostaStatoPunto.mockResolvedValue({ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: 'ottenuto', marcatore: null, pin: [] });
  fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
  await waitFor(() => expect(impostaStatoPunto).toHaveBeenCalledWith(4, 'p1', 'ottenuto'));
  // un punto della guida può contare sulle planimetrie: la raccolta si rilegge dal server (terza lettura: la seconda è dopo il raccolto)
  await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(3));
  // l'area compare nell'elenco del Palazzo (L3: «Aree del Palazzo»), con l'infiltrazione che la tocca
  expect(within(screen.getByRole('group', { name: 'Aree del Palazzo' })).getAllByText(/Cancello/).length).toBeGreaterThan(0);
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
it('un’infiltrazione che non tocca aree: niente visore, «Collega aree»; la colonna lo dice e il Palazzo resta nella piega chiusa (L3)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  // il vecchio `?area=` vale ancora come infiltrazione (R3-18)
  monta('kamoshida?area=k-02');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(screen.queryByText(/^Visore:/)).toBeNull();
  expect(screen.getByText('Quest’infiltrazione non tocca ancora aree.')).toBeInTheDocument();
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere in Torre' });
  expect(within(colonna).getByRole('status')).toHaveTextContent('Nessuna area aperta: niente da raccogliere qui.');
  const piega = within(colonna).getByText(/Tutte le planimetrie del Palazzo · 3 da raccogliere/).closest('details')!;
  expect(piega).not.toHaveAttribute('open');
  // un'infiltrazione senza voci della guida: si dice, e se ne aggiunge una
  expect(within(colonna).getByText('La guida non ha voci per quest’infiltrazione: aggiungile qui sotto.')).toBeInTheDocument();
  expect(within(colonna).getByRole('button', { name: 'Aggiungi una voce' })).toBeInTheDocument();
  // nell'elenco l'infiltrazione senza aree è una riga in coda, con «Collega aree»
  const senza = within(screen.getByRole('region', { name: 'Infiltrazioni senza aree' }));
  expect(senza.getByRole('button', { name: /^2\. Torre/ })).toHaveAttribute('aria-pressed', 'true');
  expect(senza.getByRole('button', { name: 'Collega aree a «Torre»' })).toBeInTheDocument();
});

it('un’area senza collezionabili lo dice così, senza mostrare il resto del Palazzo', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida?area=k-03');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  expect(await screen.findByText('Visore: m-cortile')).toBeInTheDocument();
  const colonna = screen.getByRole('complementary', { name: 'Da raccogliere in Cortile' });
  expect(within(colonna).getByRole('status')).toHaveTextContent('Niente da raccogliere sulle planimetrie di quest’area.');
  expect(within(colonna).getByText(/Tutte le planimetrie del Palazzo · 3 da raccogliere/).closest('details')).not.toHaveAttribute('open');
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
  expect(screen.queryByText(/Planimetrie di quest’infiltrazione/)).not.toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Infiltrazioni su questa planimetria' })).not.toBeInTheDocument();
  // un tocco sulla mappa principale collega
  fireEvent.click(screen.getByRole('button', { name: 'Tocca il pin 3' }));
  await waitFor(() => expect(collegaPinAlPunto).toHaveBeenCalledWith('p1', 3, true));
  // «Fatto» chiude: la mappa torna la planimetria dell'area, senza scelta
  fireEvent.click(within(barra).getByRole('button', { name: 'Fatto: chiudi il collegamento dei pin' }));
  await waitFor(() => expect(screen.queryByRole('region', { name: /Collegamento dei pin/ })).toBeNull());
  expect(screen.getByText('Visore: m-cancello')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Tocca il pin 3' })).toBeNull();
});

it('collegando i pin l\'elenco del Palazzo resta e una sua area porta quella planimetria nella mappa del collegamento, senza cambiare infiltrazione (2026-10-18)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getAlberoMappe.mockResolvedValue([]);
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Sicura del cancello/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Collega pin' }));
  expect(screen.getByRole('navigation', { name: 'Il Palazzo' })).toBeVisible();
  // L3: l'elenco è quello delle aree; toccarne una porta la sua planimetria nella mappa del collegamento
  const stanze = within(within(screen.getByRole('group', { name: 'Aree del Palazzo' })).getByRole('list', { name: 'Aree' }));
  fireEvent.click(stanze.getByRole('button', { name: /^2\. Torre alta/ }));
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

// L0 (2026-10-20): nella testata comune i Memento si chiamano col loro nome
it('nei Memento la linea del tempo è la «Finestra dei Memento»', async () => {
  getDungeon.mockResolvedValue(mementos());
  monta('mementos');
  expect(await screen.findByRole('heading', { name: 'Memento' })).toBeInTheDocument();
  expect(screen.getByRole('list', { name: 'Finestra dei Memento' })).toBeInTheDocument();
  expect(screen.queryByRole('list', { name: 'Finestra del Palazzo' })).toBeNull();
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

// ---- L'elenco del Palazzo: le Aree (L3, §4.2; prima l'elenco delle planimetrie) ----
//
// Non si apre più niente: **l'elenco è la colonna di atterraggio** (scelta dell'utente, 2026-09-19). Da L3 è quello delle Aree del
// Palazzo, con le infiltrazioni che le toccano; l'ordine si cambia trascinando la maniglia (o con le frecce), come prima.

/** Monta la scheda del Palazzo di Kamoshida (con partita), aspetta il titolo e restituisce le query limitate all'elenco «Aree del Palazzo». */
async function apriAree() {
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  return within(screen.getByRole('group', { name: 'Aree del Palazzo' }));
}

it('l’elenco dice le aree in ordine, quanto resta, se sono complete e le infiltrazioni che le toccano', async () => {
  const pannello = await apriAree();
  const aree = within(pannello.getByRole('list', { name: 'Aree' }));
  expect(aree.getByRole('button', { name: /^1\. Cancello/ })).toHaveTextContent('1 da prendere su 2');
  // le infiltrazioni che toccano l'area fanno parte del suo nome
  expect(aree.getByRole('button', { name: /^1\. Cancello/ })).toHaveAccessibleName(/1 da prendere su 2 ?1\. Cancello$/);
  expect(aree.getByRole('button', { name: /^2\. Torre alta/ })).toHaveTextContent('2 da prendere su 2');
  expect(aree.getByRole('button', { name: /^2\. Torre alta/ }).querySelector('[data-infiltrazioni-di]')).toBeNull();
  // l'area aperta è premuta; nelle righe niente matite né cestini: la maniglia
  expect(aree.getByRole('button', { name: /^1\. Cancello/ })).toHaveAttribute('aria-pressed', 'true');
  expect(pannello.queryByRole('button', { name: /Correggi/ })).toBeNull();
  expect(pannello.getAllByRole('button', { name: /^Sposta l’area/ })).toHaveLength(3);
  // «Mappa del Palazzo» non c'è più: il visore è nella scheda (§4.1)
  expect(screen.queryByText('Mappa del Palazzo')).toBeNull();
});

it('le frecce sulla maniglia spostano l’area e salvano l’ordine di tutto il Palazzo', async () => {
  const pannello = await apriAree();
  riordinaAree.mockResolvedValue(undefined);
  const maniglia = pannello.getByRole('button', { name: 'Sposta l’area «Cancello»' });
  // la prima non sale oltre la cima
  fireEvent.keyDown(maniglia, { key: 'ArrowUp' });
  expect(riordinaAree).not.toHaveBeenCalled();
  maniglia.focus();
  fireEvent.keyDown(maniglia, { key: 'ArrowDown' });
  await waitFor(() => expect(riordinaAree).toHaveBeenCalledWith({ tipo: 'dungeon', chiave: 'kamoshida' }, ['torre-alta', 'cancello', 'cortile']));
  // la riga è scesa subito e la maniglia ha ancora il focus: la freccia successiva continua a spostarla
  expect(document.activeElement).toBe(pannello.getByRole('button', { name: 'Sposta l’area «Cancello»' }));
  expect(pannello.getAllByRole('button', { name: /^Sposta l’area/ }).map((b) => b.getAttribute('aria-label')))
    .toEqual(['Sposta l’area «Torre alta»', 'Sposta l’area «Cancello»', 'Sposta l’area «Cortile»']);
});

it('trascinare la maniglia porta l’area dove la si lascia', async () => {
  const pannello = await apriAree();
  riordinaAree.mockResolvedValue(undefined);
  const maniglia = pannello.getByRole('button', { name: 'Sposta l’area «Cancello»' });
  // in jsdom tutte le righe stanno a 0: il puntatore più in basso cade sull'ultima
  fireEvent.pointerDown(maniglia, { pointerId: 1, clientY: 0 });
  fireEvent.pointerMove(maniglia, { pointerId: 1, clientY: 80 });
  fireEvent.pointerUp(maniglia, { pointerId: 1, clientY: 80 });
  await waitFor(() => expect(riordinaAree).toHaveBeenCalledWith({ tipo: 'dungeon', chiave: 'kamoshida' }, ['torre-alta', 'cortile', 'cancello']));
});

it('toccare un’area apre la sua casa: la sua planimetria nel visore e i suoi collezionabili nella colonna (L3, §4.1)', async () => {
  const pannello = await apriAree();
  fireEvent.click(within(pannello.getByRole('list', { name: 'Aree' })).getByRole('button', { name: /^2\. Torre alta/ }));
  expect(await screen.findByText('Visore: m-torre')).toBeInTheDocument();
  // la Torre alta non è toccata dall'infiltrazione aperta (Cancello): si apre con la prima del Palazzo che la tocca, qui nessuna
  expect(screen.getByTestId('indirizzo')).toHaveTextContent(/^\/guida\/dungeon\/kamoshida\/area\/torre-alta$/);
  expect(screen.getByRole('complementary', { name: 'Da raccogliere in Torre alta' })).toBeInTheDocument();
});

it('arrivando sulla casa di un’area senza infiltrazione si apre la prima infiltrazione che la tocca (L3, FUN3-1)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida', '/area/cortile');
  expect(await screen.findByRole('heading', { level: 2, name: 'Cortile' })).toBeInTheDocument();
  expect(await screen.findByText(/^Visore: m-cortile/)).toBeInTheDocument();
  expect(getArea).toHaveBeenCalledWith({ tipo: 'dungeon', chiave: 'kamoshida' }, 'cortile', 4);
  expect(screen.getByRole('complementary', { name: 'Da raccogliere in Cortile' })).toBeInTheDocument();
});

it('`?infiltrazione=in-corso` (il diario senza infiltrazioni) apre la prima infiltrazione non completata', async () => {
  // il Cancello è completato (la sua sola voce da segnare è Ottenuta): la prima in corso è la Torre
  const d = palazzo(true);
  d.aree[0] = { ...d.aree[0], punti: [{ ...d.aree[0].punti[0], stato: 'ottenuto' }] };
  getDungeon.mockResolvedValue(d);
  monta('kamoshida', '?infiltrazione=in-corso');
  expect(await screen.findByRole('heading', { level: 2, name: 'Torre' })).toBeInTheDocument();
  // la Torre non tocca aree: lo dice, e offre di collegarle
  expect(screen.getByText('Quest’infiltrazione non tocca ancora aree.')).toBeInTheDocument();
});

it('«Aggiungi area» crea un’area del Palazzo legata all’infiltrazione aperta, e la scheda la apre', async () => {
  const pannello = await apriAree();
  creaAreaMondo.mockResolvedValue({ ...dettaglioDi(palazzo(true), 'torre-alta'), slug: 'sala-del-tesoro', nome: 'Sala del Tesoro', infiltrazioni: [{ chiave: 'k-01', nome: 'Cancello', ordine: 0 }] });
  fireEvent.click(pannello.getByRole('button', { name: 'Aggiungi area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Aggiungi un’area a Palazzo di Kamoshida' }));
  fireEvent.change(finestra.getByRole('textbox', { name: /^Nome/ }), { target: { value: 'Sala del Tesoro' } });
  const immagine = new File(['x'], 'sala.png', { type: 'image/png' });
  fireEvent.change(finestra.getByLabelText('Immagine della prima planimetria'), { target: { files: [immagine] } });
  // l'infiltrazione aperta è già spuntata
  const caselle = within(finestra.getByRole('group', { name: 'Infiltrazioni da collegare' })).getAllByRole('checkbox');
  expect(caselle.map((c) => (c as HTMLInputElement).checked)).toEqual([true, false, false]);
  fireEvent.click(finestra.getAllByRole('button', { name: 'Aggiungi area' }).at(-1)!);
  await waitFor(() => expect(creaAreaMondo).toHaveBeenCalledWith({ tipo: 'dungeon', chiave: 'kamoshida' }, immagine, { nome: 'Sala del Tesoro', etichetta: undefined, infiltrazioni: ['k-01'] }));
  await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent('/guida/dungeon/kamoshida/area/sala-del-tesoro?infiltrazione=k-01'));
  expect(getDungeon).toHaveBeenCalledTimes(2);
});

// Da 1280 px la mappa non scende mai sotto i 240 px (2026-09-30), ma il minimo stava sul riquadro: la barra del visore
// se ne prendeva fino a 180 e la tela restava alta 58. Ora il minimo è della tela (2026-10-15): il riquadro chiede
// `--minimo-tela` al visore ed è alto almeno quanto il suo contenuto, barra compresa.
it('da 1280 px il minimo di 240 px della mappa vale per la tela, non per il riquadro del visore', async () => {
  await apriAree();
  const classi = (await screen.findByText(/^Visore: /)).getAttribute('data-classe-visore')!.split(' ');
  expect(classi).toEqual(expect.arrayContaining(['xl:[--minimo-tela:240px]', 'xl:min-h-fit', 'xl:flex-1', 'lg:h-[max(300px,min(41vh,560px))]']));
  expect(classi).not.toContain('xl:min-h-[240px]');
});

// LAY3-3 (R3-40, caso L3-L07): sotto i 1024 px il visore è alto min(64dvh, 560px) — 520 a 375×812, 560 a 768×1024 —; da 1024 px
// restano le misure di R3-41
it('sotto i 1024 px il visore è alto min(64dvh, 560px); da 1024 px restano le misure di R3-41 (LAY3-3)', async () => {
  await apriAree();
  const classi = (await screen.findByText(/^Visore: /)).getAttribute('data-classe-visore')!.split(' ');
  expect(classi).toEqual(expect.arrayContaining(['h-[min(64dvh,560px)]', 'lg:h-[max(300px,min(41vh,560px))]', 'xl:h-auto']));
  expect(classi).not.toContain('h-[max(300px,min(41vh,560px))]');
});

// L3: l'ordine delle aree non dipende più dall'atlante (che diceva quali tavole erano la stessa stanza): le aree lo sanno da sé. Resta
// da provare il ritorno all'ordine del server quando il salvataggio non riesce.
it('se l’ordine non si salva, l’elenco torna a quello del server e lo dice', async () => {
  const pannello = await apriAree();
  riordinaAree.mockRejectedValue(new Error('Ordine non salvato: riprova.'));
  const maniglia = pannello.getByRole('button', { name: 'Sposta l’area «Cancello»' });
  maniglia.focus();
  fireEvent.keyDown(maniglia, { key: 'ArrowDown' });
  await waitFor(() => expect(riordinaAree).toHaveBeenCalled());
  await waitFor(() => expect(pannello.getAllByRole('button', { name: /^Sposta l’area/ }).map((b) => b.getAttribute('aria-label')))
    .toEqual(['Sposta l’area «Cancello»', 'Sposta l’area «Torre alta»', 'Sposta l’area «Cortile»']));
});

/** Il Palazzo di prova con l'area «Cancello» in due versioni: «Pianta completa» (la sua planimetria, 2 forzieri) e «Porzione ovest»
 *  (niente da raccogliere, nessun pin). */
const conDueVersioni = (): DungeonDettaglioDto => {
  const p = palazzo(true);
  const ovest = { ...p.planimetrie[0], chiave: 'm-cancello-ovest', nome: 'Palazzo di Kamoshida › Cancello ovest', aree: [], n: 0, presi: 0, spilli: [], versioneEtichetta: 'Porzione ovest' };
  return { ...p,
    planimetrie: [{ ...p.planimetrie[0], versioneEtichetta: 'Pianta completa' } as DungeonDettaglioDto['planimetrie'][number], ovest as DungeonDettaglioDto['planimetrie'][number], ...p.planimetrie.slice(1)],
    areePalazzo: p.areePalazzo!.map((a) => (a.slug === 'cancello' ? { ...a, numeroPlanimetrie: 2 } : a)) };
};

it('un’area con più versioni: si scelgono nella fila (cambia solo `?planimetria=`), e la versione senza pin lo dice', async () => {
  getDungeon.mockResolvedValue(conDueVersioni());
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const versioni = within(await screen.findByRole('group', { name: 'Versioni di Cancello' }));
  expect(versioni.getByRole('button', { name: /^Pianta completa/ })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByText(/^Visore: m-cancello/)).toBeInTheDocument();
  fireEvent.click(versioni.getByRole('button', { name: /^Porzione ovest/ }));
  expect(await screen.findByText(/^Visore: m-cancello-ovest/)).toBeInTheDocument();
  expect(screen.getByTestId('indirizzo')).toHaveTextContent('/guida/dungeon/kamoshida?planimetria=m-cancello-ovest');
  expect(screen.getByText(/Su questa planimetria non ci sono pin: quelli dell’area stanno su «Pianta completa»/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Passa a «Pianta completa»' }));
  expect(await screen.findByText(/^Visore: m-cancello(?!-)/)).toBeInTheDocument();
});

it('dalla casa di un’area (senza parametri) si apre la sua predefinita; la versione iniziale dell’infiltrazione vale solo con `?infiltrazione=` (NR3-4, strada (a))', async () => {
  // l'infiltrazione Cancello apre «Pianta completa», ma la predefinita dell'area è «Porzione ovest»
  const d = conDueVersioni();
  d.areePalazzo = d.areePalazzo!.map((a) => (a.slug === 'cancello' ? { ...a, predefinita: 'm-cancello-ovest' } : a));
  getDungeon.mockResolvedValue(d);
  const casa = monta('kamoshida', '/area/cancello');
  expect(await screen.findByText(/^Visore: m-cancello-ovest/)).toBeInTheDocument();
  casa.unmount();
  monta('kamoshida', '/area/cancello?infiltrazione=k-01');
  expect(await screen.findByText(/^Visore: m-cancello(?!-)/)).toBeInTheDocument();
});

it('le schede della guida senza mappa né voce si vedono nella scheda del Palazzo, in «Schede da sistemare (N)», col testo e l’infiltrazione (AP3-1)', async () => {
  getDungeon.mockResolvedValue({ ...palazzo(true), schedeDaSistemare: [
    { id: 14, nome: 'Tre guardie del Tetto', descrizione: '2 Cavalieri brutali + 1 Nemico potente', tipo: 'miniboss', infiltrazione: 'k-03', infiltrazioneNome: 'Cortile', posizione: { x: 1, y: 2 } },
    { id: 15, nome: 'Forziere dei 3 Magatama', descrizione: '', tipo: 'forziere', infiltrazione: 'k-01', infiltrazioneNome: 'Cancello', posizione: null },
  ] });
  monta('kamoshida');
  const sezione = within((await screen.findByText('Schede da sistemare (2)')).closest('details')!);
  const righe = within(sezione.getByRole('list', { name: 'Schede da sistemare' })).getAllByRole('listitem');
  expect(righe).toHaveLength(2);
  expect(righe[0]).toHaveTextContent('Tre guardie del Tetto');
  expect(righe[0]).toHaveTextContent('Cortile');
  expect(righe[0]).toHaveTextContent('2 Cavalieri brutali + 1 Nemico potente');
  expect(righe[1]).toHaveTextContent('Forziere dei 3 Magatama');
});

// L3 UX3-14 (RG-5): la guida della scheda segue la planimetria mostrata nel visore; le voci di altre planimetrie stanno in «Nelle altre planimetrie»
it('UX3-14: la guida mostra le voci della planimetria del visore; quella con il pin in Torre sta in «Nelle altre planimetrie»', async () => {
  const d = palazzo(true);
  const sicura = { ...d.aree[0].punti[0], planimetria: { chiave: 'm-cancello', nome: 'Palazzo di Kamoshida › Cancello', aMano: false } };
  const lontana = { ...d.aree[0].punti[0], chiave: 'p7', ordine: 1, tipo: 'forziere' as const, nome: 'Forziere della torre lontana',
    pin: [{ id: 3, nome: 'Forziere', tipo: 'forziere', mappa: 'm-torre', mappaNome: 'Palazzo di Kamoshida › Torre' }], planimetria: { chiave: 'm-torre', nome: 'Palazzo di Kamoshida › Torre', aMano: false } };
  d.aree[0] = { ...d.aree[0], punti: [sicura, lontana] };
  getDungeon.mockResolvedValue(d);
  monta('kamoshida');
  const elenco = within(await screen.findByRole('list', { name: 'Voci della guida di Cancello' }));
  expect(elenco.getByRole('button', { name: /Sicura del cancello/ })).toBeInTheDocument();
  expect(elenco.queryByRole('button', { name: /Forziere della torre lontana/ })).toBeNull();
  expect(screen.getByText(/Guida dell’infiltrazione · 1 voce su questa planimetria/)).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: 'Voci della guida su Torre' })).getByRole('button', { name: /Forziere della torre lontana/ })).toBeInTheDocument();
});

// L4 §4.1: «Anche nella Nª infiltrazione» sotto una voce permanente il cui oggetto ha voci altrove apre quell'infiltrazione nella scheda
it('§4.1: «Anche nella 3ª infiltrazione» apre il Cortile nella scheda del Palazzo', async () => {
  const d = palazzo(true);
  d.aree[0] = { ...d.aree[0], punti: [{ ...d.aree[0].punti[0], carattere: 'permanente', oggetto: 'p1' }] };
  d.aree[2] = { ...d.aree[2], punti: [{ ...d.aree[0].punti[0], chiave: 'p9', nome: 'Sicura del cancello (dal cortile)', carattere: 'permanente', oggetto: 'p1' }] };
  getDungeon.mockResolvedValue(d);
  monta('kamoshida');
  fireEvent.click(await screen.findByRole('button', { name: 'Anche nella 3ª infiltrazione' }));
  await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent('?infiltrazione=k-03'));
});

// L4 §4.3: le «Schede da sistemare» si sistemano con «Crea la voce» o «Collega a una voce» (mai «Elimina»); ogni gesto chiede prima in una
// finestra, «Annulla» non tocca niente, e dopo il gesto la scheda si rilegge
describe('§4.3: «Crea la voce» e «Collega a una voce» dalle schede da sistemare', () => {
  const schede = [
    { id: 14, nome: 'Tre guardie del Tetto', descrizione: '2 Cavalieri brutali', tipo: 'miniboss', infiltrazione: 'k-03', infiltrazioneNome: 'Cortile', posizione: { x: 1, y: 2 } },
    { id: 16, nome: 'Seme lussuria verde', descrizione: '', tipo: 'seme-bramosia', infiltrazione: 'k-03', infiltrazioneNome: 'Cortile', posizione: null },
    { id: 15, nome: 'Forziere dei 3 Magatama', descrizione: '', tipo: 'forziere', infiltrazione: 'k-01', infiltrazioneNome: 'Cancello', posizione: null },
  ];
  /** Apre la sezione e ne restituisce il contenuto. */
  const apriSezione = async () => {
    const sezione = (await screen.findByText('Schede da sistemare (3)')).closest('details')!;
    fireEvent.click(within(sezione).getByText('Schede da sistemare (3)'));
    return within(sezione);
  };

  it('ogni scheda ha i due gesti e nessun «Elimina»; «Crea la voce» propone il tipo del pin, «Annulla» non crea niente, la conferma crea e rilegge', async () => {
    getDungeon.mockResolvedValue({ ...palazzo(true), schedeDaSistemare: schede });
    creaVoceDallaScheda.mockResolvedValue({ chiave: 'k-03-tre-guardie', nome: 'Tre guardie del Tetto' });
    monta('kamoshida');
    const sezione = await apriSezione();
    const righe = within(sezione.getByRole('list', { name: 'Schede da sistemare' })).getAllByRole('listitem');
    for (const r of righe) {
      expect(within(r).getByRole('button', { name: /^Crea la voce da/ })).toBeInTheDocument();
      expect(within(r).getByRole('button', { name: /a una voce$/ })).toBeInTheDocument();
      expect(within(r).queryByRole('button', { name: /Elimina/ })).toBeNull();
    }
    // il tipo proposto viene dal tipo del pin: seme della bramosia → «Semi della bramosia»
    fireEvent.click(sezione.getByRole('button', { name: 'Crea la voce da «Seme lussuria verde»' }));
    let finestra = within(screen.getByRole('dialog', { name: 'Crea la voce da «Seme lussuria verde»' }));
    expect(finestra.getByRole('combobox', { name: 'Tipo' })).toHaveTextContent('Semi della bramosia');
    expect(finestra.getByRole('combobox', { name: 'Tipo' }).closest('.selettore')).toHaveClass('selettore--in-linea');
    expect(finestra.getByText(/in fondo a «Cortile».*Nessuno stato si trasferisce/)).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: 'Annulla' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    // miniboss → «Mini-boss»; la conferma crea la voce col tipo e rilegge la scheda
    fireEvent.click(sezione.getByRole('button', { name: 'Crea la voce da «Tre guardie del Tetto»' }));
    finestra = within(screen.getByRole('dialog', { name: 'Crea la voce da «Tre guardie del Tetto»' }));
    expect(finestra.getByRole('combobox', { name: 'Tipo' })).toHaveTextContent('Mini-boss');
    const letture = getDungeon.mock.calls.length;
    fireEvent.click(finestra.getByRole('button', { name: 'Crea la voce' }));
    await waitFor(() => expect(creaVoceDallaScheda).toHaveBeenCalledWith(14, 'miniboss'));
    expect(creaVoceDallaScheda).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getDungeon.mock.calls.length).toBeGreaterThan(letture));
    expect(notifica).toHaveBeenCalledWith('success', 'Voce «Tre guardie del Tetto» creata in Cortile.');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(collegaSchedaAllaVoce).not.toHaveBeenCalled();
  });

  // FUN4-1 (strada (a) del PM): la voce nuova di un tipo permanente conta fra gli oggetti permanenti; nella partita che ha completato il
  // Palazzo lo riporta a «Concluso» finché non la si segna: la finestra lo dice prima della conferma (la voce non si segna da sola, «1 B»)
  it('FUN4-1: con un tipo permanente la finestra avvisa, e col Palazzo completato dice che torna a «Concluso»; con un Racconto niente avviso', async () => {
    getDungeon.mockResolvedValue({ ...palazzo(true), completato: 'Tesoro, boss finale e tutti gli oggetti permanenti (71/71)', concluso: 'Tesoro e boss finale', schedeDaSistemare: schede });
    monta('kamoshida');
    const sezione = await apriSezione();
    fireEvent.click(sezione.getByRole('button', { name: 'Crea la voce da «Tre guardie del Tetto»' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Crea la voce da «Tre guardie del Tetto»' }));
    expect(finestra.getByText('La voce nuova conta fra gli oggetti permanenti: in questa partita il Palazzo torna da «Completato» a «Concluso» finché non la segni.')).toBeInTheDocument();
    scegliVoce('Tipo', /^Storia/);
    expect(finestra.queryByText(/oggetti permanenti/)).toBeNull();
  });

  it('FUN4-1: Palazzo non completato e tipo permanente: l’avviso parla solo della percentuale', async () => {
    getDungeon.mockResolvedValue({ ...palazzo(true), schedeDaSistemare: schede });
    monta('kamoshida');
    const sezione = await apriSezione();
    fireEvent.click(sezione.getByRole('button', { name: 'Crea la voce da «Forziere dei 3 Magatama»' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Crea la voce da «Forziere dei 3 Magatama»' }));
    expect(finestra.getByText('La voce nuova conta fra gli oggetti permanenti del Palazzo: la percentuale si ricalcola con lei.')).toBeInTheDocument();
    expect(finestra.queryByText(/Concluso/)).toBeNull();
  });

  it('«Collega a una voce»: si sceglie fra le voci del Palazzo (prima quelle della sua infiltrazione); senza scelta non si collega; un errore lascia la finestra aperta', async () => {
    getDungeon.mockResolvedValue({ ...palazzo(true), schedeDaSistemare: schede });
    collegaSchedaAllaVoce.mockRejectedValueOnce(new Error('La voce non è del Palazzo della scheda.')).mockResolvedValue({ chiave: 'p1', nome: 'Sicura del cancello' });
    monta('kamoshida');
    const sezione = await apriSezione();
    fireEvent.click(sezione.getByRole('button', { name: 'Collega «Forziere dei 3 Magatama» a una voce' }));
    const finestra = within(screen.getByRole('dialog', { name: 'Collega «Forziere dei 3 Magatama» a una voce' }));
    expect(finestra.getByRole('button', { name: 'Collega' })).toBeDisabled();
    // nella finestra la tendina si apre nel flusso: sovrapposta resterebbe tagliata dal corpo scorrevole (si vedeva una voce sola)
    expect(finestra.getByRole('combobox', { name: 'Voce' }).closest('.selettore')).toHaveClass('selettore--in-linea');
    fireEvent.click(finestra.getByRole('combobox', { name: 'Voce' }));
    // la voce dell'infiltrazione della scheda (Cancello), sotto il nome dell'infiltrazione
    expect(finestra.getByText('1. Cancello')).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('option', { name: /Sicura del cancello/ }).querySelector('button')!);
    fireEvent.click(finestra.getByRole('button', { name: 'Collega' }));
    await waitFor(() => expect(collegaSchedaAllaVoce).toHaveBeenCalledWith(15, 'p1'));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('error', 'La voce non è del Palazzo della scheda.'));
    expect(screen.getByRole('dialog', { name: 'Collega «Forziere dei 3 Magatama» a una voce' })).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: 'Collega' }));
    await waitFor(() => expect(notifica).toHaveBeenCalledWith('success', '«Forziere dei 3 Magatama» collegata a «Sicura del cancello».'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(creaVoceDallaScheda).not.toHaveBeenCalled();
  });
});

describe('i passaggi del visore della scheda restano nella scheda (AP3-2)', () => {
  /** Il Palazzo di prova col Cortile toccato anche dall'infiltrazione Cancello. */
  const conCortileNelCancello = (): DungeonDettaglioDto => {
    const d = palazzo(true);
    d.areePalazzo = d.areePalazzo!.map((a) => (a.slug === 'cortile' ? { ...a, infiltrazioni: [{ chiave: 'k-01', nome: 'Cancello', ordine: 0 }, ...(a.infiltrazioni ?? [])] } : a));
    return d;
  };
  const arrivo = '/guida/dungeon/kamoshida/area/cortile?infiltrazione=k-01&planimetria=m-cortile&spillo=9';

  it('il visore non mostra le planimetrie vicine; un passaggio verso una planimetria del Palazzo apre la sua area con l’infiltrazione aperta', async () => {
    getDungeon.mockResolvedValue(conCortileNelCancello());
    monta('kamoshida', '/area/cancello?infiltrazione=k-01');
    expect(await screen.findByText(/^Visore: m-cancello/)).toHaveAttribute('data-senza-vicine', 'sì');
    fireEvent.click(screen.getByRole('button', { name: 'Passaggio al Cortile' }));
    await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent(arrivo));
    expect(risolviMappa).not.toHaveBeenCalled();
  });

  it('una chiave che la scheda non conosce si risolve: se la sua casa è un’area del Palazzo si resta nella scheda', async () => {
    getDungeon.mockResolvedValue(conCortileNelCancello());
    risolviMappa.mockResolvedValue({ tipo: 'mappa', mappa: 'm-cortile', casa: '/guida/dungeon/kamoshida/area/cortile' });
    monta('kamoshida', '/area/cancello?infiltrazione=k-01');
    fireEvent.click(await screen.findByRole('button', { name: 'Passaggio interno al Cortile' }));
    await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent(arrivo));
    expect(risolviMappa).toHaveBeenCalledWith('nativo-cortile');
  });
});

it('in «Da raccogliere» il nome di una planimetria porta dritto alla sua area nella scheda, con l’infiltrazione aperta (AP3-4)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida', '/area/cancello?infiltrazione=k-01');
  const colonna = within(await screen.findByRole('complementary', { name: 'Da raccogliere in Cancello' }));
  expect(await colonna.findByRole('link', { name: 'Cancello' })).toHaveAttribute('href', '/guida/dungeon/kamoshida/area/cancello?infiltrazione=k-01&planimetria=m-cancello');
  // una planimetria del resto del Palazzo, in un'area che l'infiltrazione aperta non tocca: la sua area, senza infiltrazione
  expect(colonna.getByRole('link', { name: 'Torre' })).toHaveAttribute('href', '/guida/dungeon/kamoshida/area/torre-alta?planimetria=m-torre');
});

// Regola dell'utente «opacità al 100%» (decisione del PM dopo Test UX di L3): i segni dei chip delle date non sono attenuati
it('i segni dei chip delle date («si apre», «furto», «scade») sono all’opacità piena (UX3-11)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const segni = screen.getAllByText(/^(Si apre|Scade)$/).map((e) => e.parentElement!);
  expect(segni.length).toBeGreaterThan(0);
  for (const s of segni) expect(s.className).not.toMatch(/opacity-/);
});

// LAY3-4 (decisione del PM, strada (b)): una «data» della guida che è una frase (Shido, Maruki) non si tronca nel chip: da 1024 px il
// chip dice l'etichetta e la frase intera sta nei «Dettagli dalla guida»; le date vere restano date
it('una data che è una frase: da 1024 px il chip dice l’etichetta, la frase intera sta nei «Dettagli dalla guida» (LAY3-4)', async () => {
  const frase = 'Nella tabella di marcia ottimizzata della guida: invio della lettera di sfida il 12/12';
  getDungeon.mockResolvedValue({ ...palazzo(true), date: { sblocco: '12 Aprile', scadenza: '2 maggio', furtoConsigliato: frase } });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const chipFurto = screen.getByTitle(`Furto consigliato: ${frase}`);
  // da 1024 px l'etichetta intera; sotto, un'etichetta breve che ha senso da sola, presa dal tipo della data e non dalla prima parola
  // (UX3-12: «Si» per «Si apre» non si capiva); niente puntini
  expect(within(chipFurto).getByText('Furto consigliato', { selector: '.hidden.lg\\:inline' })).toBeInTheDocument();
  expect(within(chipFurto).getByText('Furto', { selector: '.lg\\:hidden' })).toBeInTheDocument();
  expect(chipFurto.querySelector('.lg\\:truncate')).toBeNull();
  // una data vera resta la data
  expect(within(screen.getByTitle('Si apre: 12 Aprile')).getByText('12 Aprile')).toBeInTheDocument();
  // la frase nei «Dettagli dalla guida» (testo ripiegabile: lunga, si apre intera col tocco)
  expect(screen.getAllByText(/^Furto consigliato: Nella tabella di marcia/).length).toBeGreaterThan(0);
});

it('«Si apre» che è una frase: sotto i 1024 px il chip dice «Si apre», mai «Si» (UX3-12)', async () => {
  const frase = 'Il Palazzo diventa esplorabile per la prima volta il 2 gennaio';
  getDungeon.mockResolvedValue({ ...palazzo(true), date: { sblocco: frase, scadenza: '2 maggio', furtoConsigliato: '' } });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const chip = screen.getByTitle(`Si apre: ${frase}`);
  expect(within(chip).getByText('Si apre', { selector: '.lg\\:hidden' })).toBeInTheDocument();
  expect(within(chip).queryByText('Si')).toBeNull();
});

// LAY3-5 (regola dell'utente: intestazione al massimo il 30% della schermata). In jsdom `useMedia` è falso, cioè la scheda sotto i 1024 px:
// l'intestazione è la griglia compatta e «Sulla mappa di Tokyo» e i conteggi stanno nei «Dettagli dalla guida», non nella riga
it('sotto i 1024 px l’intestazione è compatta: «Sulla mappa di Tokyo» e i conteggi nei «Dettagli dalla guida» (LAY3-5)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const intestazione = screen.getByRole('heading', { name: 'Palazzo di Kamoshida' }).closest('header')!;
  expect(intestazione.querySelector(':scope > .grid')).not.toBeNull();
  const dettagli = within(intestazione).getAllByText('Dettagli dalla guida').map((s) => s.closest('details')!);
  const sotto = dettagli.find((x) => x.className.includes('lg:hidden'))!;
  expect(within(sotto).getByRole('button', { name: /Sulla mappa di Tokyo/ })).toBeInTheDocument();
  expect(within(intestazione).getAllByRole('button', { name: /Sulla mappa di Tokyo/ })).toHaveLength(1);
  expect(within(sotto).getByText('3 infiltrazioni')).toBeInTheDocument();
  expect(within(sotto).getByText('Sovrano: Kamoshida')).toBeInTheDocument();
});

// LAY3-6: sotto i 1024 px l'arcana va a capo (al massimo due righe) invece di accorciarsi su una: «Giudizio (Judgement)» di Niijima si
// legge intera a 375; si accorcia solo una frase più lunga di due righe (Maruki), intera nei «Dettagli dalla guida»
it('sotto i 1024 px l’arcana va a capo su due righe al massimo, non si accorcia su una (LAY3-6)', async () => {
  getDungeon.mockResolvedValue({ ...palazzo(true), arcanaSovranoNome: 'Giudizio (Judgement)' });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  const arcana = screen.getByTitle('Giudizio (Judgement)');
  expect(arcana.className).toContain('max-lg:line-clamp-2');
  expect(arcana.className).not.toContain('max-lg:truncate');
});

// UX3-13: da 1280 px «Aree toccate» era una striscia di 51–190 px nella riga dell'infiltrazione che scorreva di lato, già scorsa, con
// l'etichetta tagliata e i chip a metà. Non ci sta (un comando visibile chiede 132 px, a capo sfora R3-41): da 1280 px la riga non
// l'ha più, e le aree toccate sono quelle evidenziate nella colonna delle aree, con la legenda che lo dice per esteso
it('da 1280 px niente striscia «Aree toccate» nella riga: la colonna delle aree le evidenzia, con la legenda per esteso (UX3-13)', async () => {
  media.larghezza = 1280;
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida', '/area/cancello?infiltrazione=k-01');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  expect(document.querySelector('.fila-scorrevole[aria-label^="Aree toccate"]')).toBeNull();
  expect(screen.queryByRole('list', { name: /^Aree toccate da/ })).toBeNull();
  const colonna = within(screen.getByRole('group', { name: 'Aree del Palazzo' }));
  expect(colonna.getByText('Aree toccate da «1. Cancello» · 1, evidenziate.')).toBeInTheDocument();
});

// L4 §8.11: «Segna» sulla voce segna tutti i suoi pin; le altre voci che li condividono possono diventare fatte, e la scheda lo dice
// («Segnate anche: …», dalla risposta del server); «Riapri» lo stesso con «Riaperte anche: …»
it('dopo «Ottenuto» la scheda dice le altre voci segnate dal gesto («Segnate anche: …»), poi rilegge (§8.11)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida');
  fireEvent.click(await screen.findByRole('button', { name: /Sicura del cancello/ }));
  impostaStatoPunto.mockResolvedValue({ chiave: 'p1', ordine: 0, tipo: 'sicura', nome: 'Sicura del cancello', descrizione: '', esauribile: false, dettagli: {}, fonte: '', stato: 'ottenuto', marcatore: null, pin: [],
    effetti: { segnate: [{ chiave: 'k3-sicura', nome: 'Sicura del cortile', infiltrazione: { chiave: 'k-03', nome: 'Cortile' } }], riaperte: [] } });
  fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
  await waitFor(() => expect(notifica).toHaveBeenCalledWith('info', 'Segnate anche: Sicura del cortile — 3ª infiltrazione.'));
});

// L4 §8.6 (O4-2): togliere il segno a un pin di un passo di un Enigma risolto lo riapre: nella scheda («Da raccogliere») e dal popup del
// pin si chiede prima conferma con «Riapre anche l'Enigma «…»»; «Annulla» lascia tutto com'era; con l'Enigma non risolto niente conferma
describe('§8.6: la riapertura di un Enigma risolto si conferma prima, nella scheda e dal popup', () => {
  /** Il Palazzo di prova con l'Enigma «Ogni libro al suo posto» nel Cancello: il passo «Sistema i libri» sta sul pin 1 (raccolto). */
  const conEnigma = (risolto: boolean): DungeonDettaglioDto => {
    const d = palazzo(true);
    const voce = (extra: Partial<PuntoInteresseDto>): PuntoInteresseDto => ({ ...d.aree[0].punti[0], pin: [], contenitore: null, ...extra });
    d.aree[0] = { ...d.aree[0], punti: [...d.aree[0].punti,
      voce({ chiave: 'e1', tipo: 'puzzle', nome: 'Ogni libro al suo posto', stato: risolto ? 'ottenuto' : null }),
      voce({ chiave: 'e1-a', tipo: 'meccanismo', nome: 'Sistema i libri', contenitore: 'e1', stato: 'ottenuto',
        pin: [{ id: 1, nome: 'Forziere', tipo: 'forziere', mappa: 'm-cancello', mappaNome: 'Palazzo di Kamoshida › Cancello' }] })] };
    return d;
  };

  it('«Da raccogliere»: togliendo il segno al pin 1 si chiede conferma; «Annulla» non tocca niente, «Togli il segno» lo toglie', async () => {
    getDungeon.mockResolvedValue(conEnigma(true));
    impostaSpilloRaccolto.mockResolvedValue({});
    monta('kamoshida');
    const colonna = within(await screen.findByRole('complementary', { name: 'Da raccogliere in Cancello' }));
    fireEvent.click(colonna.getByRole('button', { name: /Anche i raccolti/ }));
    fireEvent.click(colonna.getByRole('checkbox', { name: 'Forziere 1 di Cancello aperto' }));
    const finestra = within(await screen.findByRole('dialog', { name: 'Togliere il segno a «Forziere»?' }));
    expect(finestra.getByText('Riapre anche l’Enigma «Ogni libro al suo posto».')).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: 'Annulla' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(impostaSpilloRaccolto).not.toHaveBeenCalled();
    expect(colonna.getByRole('checkbox', { name: 'Forziere 1 di Cancello aperto' })).toBeChecked();
    fireEvent.click(colonna.getByRole('checkbox', { name: 'Forziere 1 di Cancello aperto' }));
    fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Togli il segno' }));
    await waitFor(() => expect(impostaSpilloRaccolto).toHaveBeenCalledWith(4, 1, false));
  });

  it('dal popup del pin la stessa conferma; con l’Enigma non risolto nessuna conferma', async () => {
    getDungeon.mockResolvedValue(conEnigma(true));
    const prima = monta('kamoshida');
    const togli = await screen.findByRole('button', { name: 'Togli il segno al pin 1 dal popup' });
    fireEvent.click(togli);
    fireEvent.click(within(await screen.findByRole('dialog', { name: 'Togliere il segno a «Forziere»?' })).getByRole('button', { name: 'Annulla' }));
    await waitFor(() => expect(togli.dataset.esito).toBe('false'));
    prima.unmount();
    getDungeon.mockResolvedValue(conEnigma(false));
    monta('kamoshida');
    const senza = await screen.findByRole('button', { name: 'Togli il segno al pin 1 dal popup' });
    fireEvent.click(senza);
    await waitFor(() => expect(senza.dataset.esito).toBe('true'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

// L4 §1.4 (regola 1): nella scheda il contesto dello stato dei pin condivisi è l'infiltrazione aperta; il visore la riceve
it('il visore della scheda legge lo stato nell’infiltrazione aperta (§1.4, §4.2)', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  monta('kamoshida', '/area/cortile?infiltrazione=k-03');
  expect(await screen.findByText(/^Visore: m-cortile/)).toHaveAttribute('data-infiltrazione', 'k-03');
});

it('senza schede da sistemare la sezione non c’è (AP3-1)', async () => {
  getDungeon.mockResolvedValue({ ...palazzo(true), schedeDaSistemare: [] });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  expect(screen.queryByText(/^Schede da sistemare/)).not.toBeInTheDocument();
});

it('«Modifica area»: le versioni si riordinano e l’etichetta svuotata si toglie (torna «Planimetria N»), col contenitore del Palazzo', async () => {
  getDungeon.mockResolvedValue(conDueVersioni());
  aggiornaPlanimetrieArea.mockResolvedValue({});
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  await screen.findByRole('group', { name: 'Versioni di Cancello' });
  fireEvent.click(screen.getByRole('button', { name: 'Modifica area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Modifica Cancello' }));
  expect(finestra.getByLabelText('Etichetta di Pianta completa')).toHaveValue('Pianta completa');
  fireEvent.change(finestra.getByLabelText('Etichetta di Pianta completa'), { target: { value: '' } });
  fireEvent.click(finestra.getByRole('button', { name: 'Sposta su Porzione ovest' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaPlanimetrieArea).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'dungeon', chiave: 'kamoshida' }), 'cancello',
    { ordine: ['m-cancello-ovest', 'm-cancello'], etichette: { 'm-cancello': null } }));
  expect(aggiornaAreaMondo).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
});

it('«Modifica area» cambia nome, etichetta e infiltrazioni in un salvataggio, e la scheda si rilegge', async () => {
  const pannello = await apriAree();
  aggiornaAreaMondo.mockResolvedValue({});
  aggiornaPlanimetrieArea.mockResolvedValue({});
  impostaInfiltrazioniArea.mockResolvedValue({});
  await waitFor(() => expect(getArea).toHaveBeenCalled());
  expect(pannello.getByRole('button', { name: /^1\. Cancello/ })).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: 'Modifica area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Modifica Cancello' }));
  const nome = finestra.getByRole('textbox', { name: /^Nome/ });
  expect(nome).toHaveValue('Cancello');
  // le infiltrazioni del Palazzo, nell'ordine del Palazzo, con spuntata quella che tocca l'area
  const caselle = within(finestra.getByRole('group', { name: 'Infiltrazioni in quest’area' })).getAllByRole('checkbox');
  expect(caselle.map((c) => c.closest('label')!.textContent)).toEqual(['1. Cancello', '2. Torre', '3. Cortile']);
  expect(caselle.map((c) => (c as HTMLInputElement).checked)).toEqual([true, false, false]);
  fireEvent.change(nome, { target: { value: 'Ingresso' } });
  fireEvent.change(finestra.getByLabelText('Etichetta di Planimetria 1'), { target: { value: 'Livello 0' } });
  fireEvent.click(caselle[1]);
  getDungeon.mockClear();
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaAreaMondo).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'dungeon', chiave: 'kamoshida' }), 'cancello', { nome: 'Ingresso' }));
  expect(aggiornaPlanimetrieArea).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'dungeon' }), 'cancello', { etichette: { 'm-cancello': 'Livello 0' } });
  expect(impostaInfiltrazioniArea).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'dungeon' }), 'cancello', ['k-01', 'k-02']);
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(getDungeon).toHaveBeenCalled();
});

it('dalla finestra dell’area si elimina una versione (non l’ultima): va nel cestino', async () => {
  getDungeon.mockResolvedValue(conDueVersioni());
  eliminaMappa.mockResolvedValue(undefined);
  monta('kamoshida');
  await screen.findByRole('group', { name: 'Versioni di Cancello' });
  fireEvent.click(screen.getByRole('button', { name: 'Modifica area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Modifica Cancello' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Elimina Porzione ovest' }));
  await waitFor(() => expect(eliminaMappa).toHaveBeenCalledWith('m-cancello-ovest', { conferma: false }));
});

it('«Elimina area» dice che cosa si porta via (versioni, pin, legami; le voci restano) e la manda nel cestino con una richiesta', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  eliminaAreaMondo.mockResolvedValue(undefined);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  // UX3-3 (come UX2-3 nella pagina Area): «Elimina» in vista da 768 a 1023 px e da 1280 px, nel menu «Altro» sotto i 768 e da 1024 a 1279
  const [inVista, nelMenu] = await screen.findAllByRole('button', { name: 'Elimina area' });
  expect(inVista.parentElement).toHaveClass('hidden', 'md:max-lg:inline-flex', 'xl:inline-flex');
  expect(nelMenu.closest('details')).toHaveClass('menu-altro', 'md:max-lg:hidden', 'xl:hidden');
  expect(within(nelMenu.closest('details')!).getByText('Altro ▾')).toBeInTheDocument();
  // dal menu si apre la stessa finestra di conferma
  fireEvent.click(nelMenu);
  const finestra = within(screen.getByRole('dialog', { name: 'Eliminare Cancello?' }));
  expect(finestra.getByText(/la sua planimetria con 2 pin e il legame con 1 infiltrazione\. Le voci della guida restano nelle loro infiltrazioni\./)).toBeInTheDocument();
  expect(finestra.getByText(/Finisce nel cestino \(Impostazioni → Cestino\): da lì la rimetti com’era\./)).toBeInTheDocument();
  fireEvent.click(finestra.getByRole('button', { name: 'Elimina' }));
  await waitFor(() => expect(eliminaAreaMondo).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'dungeon', chiave: 'kamoshida' }), 'cancello', true));
  // la scheda resta sull'infiltrazione aperta
  await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent('/guida/dungeon/kamoshida?infiltrazione=k-01'));
});

describe('un’infiltrazione su più aree, un’area con più infiltrazioni (L3, R3-23: legami molti a molti)', () => {
  it('«Modifica aree» dell’infiltrazione aggiunge un’area in coda, conservando la versione che si apriva per quelle già legate', async () => {
    getDungeon.mockResolvedValue(palazzo(true));
    impostaAreeInfiltrazione.mockResolvedValue({});
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    // le aree toccate dall'infiltrazione aperta, in ordine: toccarne una la apre
    expect(within(screen.getByRole('list', { name: 'Aree toccate da Cancello' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['Cancello']);
    fireEvent.click(screen.getByRole('button', { name: 'Modifica aree' }));
    const finestra = within(await screen.findByRole('dialog', { name: 'Aree toccate da «Cancello»' }));
    // si propongono solo quelle non ancora legate
    expect(within(finestra.getByRole('region', { name: 'Aree da aggiungere' })).getAllByRole('button').map((b) => b.textContent)).toEqual(['+ Torre alta', '+ Cortile']);
    fireEvent.click(finestra.getByRole('button', { name: '+ Torre alta' }));
    fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(impostaAreeInfiltrazione).toHaveBeenCalledWith('k-01', ['cancello', 'torre-alta'], { cancello: 'm-cancello' }, 4));
    // un gesto solo, poi la scheda si rilegge
    expect(impostaAreeInfiltrazione).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(getDungeon).toHaveBeenCalledTimes(2));
  });

  it('«Togli» scollega un’area dall’infiltrazione senza toccare le altre; l’ordine si cambia con ↑/↓', async () => {
    const d = palazzo(true);
    // l'infiltrazione Cancello tocca il Cancello e il Cortile
    d.aree[0] = { ...d.aree[0], areePalazzo: [...d.aree[0].areePalazzo!, { chiave: 'dungeon/kamoshida/cortile', slug: 'cortile', nome: 'Cortile', planimetriaIniziale: null }] };
    getDungeon.mockResolvedValue(d);
    impostaAreeInfiltrazione.mockResolvedValue({});
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    fireEvent.click(screen.getByRole('button', { name: 'Modifica aree' }));
    const finestra = within(await screen.findByRole('dialog', { name: 'Aree toccate da «Cancello»' }));
    fireEvent.click(finestra.getByRole('button', { name: 'Sposta giù Cancello' }));
    fireEvent.click(finestra.getByRole('button', { name: 'Togli Cancello' }));
    fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(impostaAreeInfiltrazione).toHaveBeenCalledWith('k-01', ['cortile'], undefined, 4));
  });

  it('un’infiltrazione senza aree si collega da «Collega aree», in coda all’elenco', async () => {
    getDungeon.mockResolvedValue(palazzo(true));
    impostaAreeInfiltrazione.mockResolvedValue({});
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    fireEvent.click(within(screen.getByRole('region', { name: 'Infiltrazioni senza aree' })).getByRole('button', { name: 'Collega aree a «Torre»' }));
    const finestra = within(await screen.findByRole('dialog', { name: 'Aree toccate da «Torre»' }));
    expect(finestra.getByText('Nessuna: l’infiltrazione non tocca aree.')).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: '+ Cancello' }));
    fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
    await waitFor(() => expect(impostaAreeInfiltrazione).toHaveBeenCalledWith('k-02', ['cancello'], undefined, 4));
  });

  it('l’eliminazione di un’area dice i legami al plurale quando sono più d’uno', async () => {
    const d = palazzo(true);
    d.areePalazzo = d.areePalazzo!.map((a) => (a.slug === 'cancello' ? { ...a, infiltrazioni: [{ chiave: 'k-01', nome: 'Cancello', ordine: 0 }, { chiave: 'k-03', nome: 'Cortile', ordine: 2 }] } : a));
    getDungeon.mockResolvedValue(d);
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    fireEvent.click((await screen.findAllByRole('button', { name: 'Elimina area' }))[0]);
    expect(within(screen.getByRole('dialog', { name: 'Eliminare Cancello?' })).getByText(/i legami con 2 infiltrazioni\./)).toBeInTheDocument();
  });
});

it('mentre un ordine si salva, la maniglia dice perché è ferma', async () => {
  const pannello = await apriAree();
  riordinaAree.mockReturnValue(new Promise(() => {}));
  const maniglia = pannello.getByRole('button', { name: 'Sposta l’area «Cancello»' });
  expect(maniglia).toHaveAttribute('title', 'Trascina per spostare (con la tastiera: frecce su e giù)');
  fireEvent.keyDown(maniglia, { key: 'ArrowDown' });
  await waitFor(() => expect(pannello.getByRole('button', { name: 'Sposta l’area «Cancello»' })).toHaveAttribute('title', 'Un momento: sto salvando l’ultima modifica'));
});

// ---- Stanze e testo delle aree (richiesta dell'utente, 2026-09-30) ----

it('rinominare l’area non cambia il suo indirizzo né le versioni: si manda solo il nome', async () => {
  await apriAree();
  aggiornaAreaMondo.mockResolvedValue({});
  fireEvent.click(await screen.findByRole('button', { name: 'Modifica area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Modifica Cancello' }));
  expect(finestra.getByText('L’indirizzo della pagina non cambia.')).toBeInTheDocument();
  fireEvent.change(finestra.getByRole('textbox', { name: /^Nome/ }), { target: { value: 'Cancello, lato nord' } });
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaAreaMondo).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'dungeon' }), 'cancello', { nome: 'Cancello, lato nord' }));
  expect(aggiornaPlanimetrieArea).not.toHaveBeenCalled();
  expect(impostaInfiltrazioniArea).not.toHaveBeenCalled();
});

it('«Sposta la versione in un’altra area»: l’unica versione si sposta solo confermando che l’area va nel cestino (409 `area-si-svuota`)', async () => {
  await apriAree();
  collocaPlanimetria.mockRejectedValueOnce(new ApiError(409, 'area-si-svuota', 'Cancello resta senza planimetrie: la versione si sposta in Torre alta, Cancello va nel cestino con 1 legame a infiltrazioni.'))
    .mockResolvedValueOnce({ ...dettaglioDi(palazzo(true), 'torre-alta'), infiltrazioni: [] });
  fireEvent.click(await screen.findByRole('button', { name: 'Modifica area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Modifica Cancello' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Sposta Planimetria 1 in un’altra area' }));
  // le altre aree del Palazzo, non la sua; «un'area a sé» solo per un'area con più versioni
  expect(vociSelettore('Sposta in').filter((v) => !v.startsWith('—'))).toEqual(['Torre alta', 'Cortile']);
  scegliVoce('Sposta in', 'Torre alta');
  fireEvent.click(finestra.getByRole('button', { name: 'Sposta' }));
  await waitFor(() => expect(collocaPlanimetria).toHaveBeenCalledWith({ mappa: 'm-cancello', dungeon: 'kamoshida', area: 'torre-alta' }, { conferma: false }));
  expect(await finestra.findByRole('alert')).toHaveTextContent('Cancello resta senza planimetrie');
  fireEvent.click(finestra.getByRole('button', { name: 'Sposta e metti Cancello nel cestino' }));
  await waitFor(() => expect(collocaPlanimetria).toHaveBeenLastCalledWith({ mappa: 'm-cancello', dungeon: 'kamoshida', area: 'torre-alta' }, { conferma: true }));
  // la versione si apre nell'area d'arrivo
  await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent(/^\/guida\/dungeon\/kamoshida\/area\/torre-alta$/));
});

it('una versione di un’area con più versioni diventa «un’area a sé», col nome scelto', async () => {
  getDungeon.mockResolvedValue(conDueVersioni());
  collocaPlanimetria.mockResolvedValue({ ...dettaglioDi(palazzo(true), 'torre-alta'), slug: 'cancello-ovest', nome: 'Cancello ovest', infiltrazioni: [] });
  monta('kamoshida');
  await screen.findByRole('group', { name: 'Versioni di Cancello' });
  fireEvent.click(screen.getByRole('button', { name: 'Modifica area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Modifica Cancello' }));
  fireEvent.click(finestra.getByRole('button', { name: 'Sposta Porzione ovest in un’altra area' }));
  scegliVoce('Sposta in', 'Un’area a sé (nuova)');
  expect(finestra.getByRole('button', { name: 'Sposta' })).toBeDisabled();
  fireEvent.change(finestra.getByLabelText('Nome dell’area nuova'), { target: { value: 'Cancello ovest' } });
  fireEvent.click(finestra.getByRole('button', { name: 'Sposta' }));
  await waitFor(() => expect(collocaPlanimetria).toHaveBeenCalledWith({ mappa: 'm-cancello-ovest', dungeon: 'kamoshida', nuova: { nome: 'Cancello ovest' } }, { conferma: false }));
});

it('il testo di un’infiltrazione si modifica con «Modifica testo», anche di una che non tocca aree', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  aggiornaArea.mockResolvedValue({});
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  // il comando dice che cosa fa, e il nome accessibile comincia dal testo che si vede (chi comanda a voce dice «Modifica testo»)
  expect(screen.getByRole('button', { name: 'Modifica testo: l’infiltrazione «Cancello»' })).toHaveTextContent('Modifica testo');
  // la Torre non tocca aree: la si apre dalla coda dell'elenco
  fireEvent.click(within(screen.getByRole('region', { name: 'Infiltrazioni senza aree' })).getByRole('button', { name: /^2\. Torre/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Modifica testo: l’infiltrazione «Torre»' }));
  const modulo = within(screen.getByRole('form', { name: /Correggi l’infiltrazione/ }));
  fireEvent.change(modulo.getByLabelText('Nome dell’infiltrazione'), { target: { value: 'Torre nord' } });
  fireEvent.change(modulo.getByLabelText('Descrizione'), { target: { value: 'La torre dell’ala nord.' } });
  fireEvent.click(modulo.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaArea).toHaveBeenCalledWith('k-02', expect.objectContaining({ nome: 'Torre nord', descrizione: 'La torre dell’ala nord.' })));
});

it('anche l’infiltrazione aperta si elimina, dal suo modulo di correzione, e la scheda torna sul Palazzo', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  eliminaArea.mockResolvedValue(undefined);
  monta('kamoshida?area=k-03');
  // il titolo dell'infiltrazione (livello 2); l'area aperta, anche lei «Cortile», ha il suo (livello 3)
  expect(await screen.findByRole('heading', { level: 2, name: 'Cortile' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /^Modifica testo: l’infiltrazione/ }));
  const modulo = within(screen.getByRole('form', { name: /Correggi l’infiltrazione/ }));
  fireEvent.click(modulo.getByRole('button', { name: 'Elimina' }));
  expect(modulo.getByText(/Se ne va dalla guida per tutte le partite.*le aree del Palazzo restano.*Finisce nel cestino \(Impostazioni → Cestino\): da lì la rimetti com’era\./)).toBeInTheDocument();
  fireEvent.click(modulo.getByRole('button', { name: 'Confermo' }));
  await waitFor(() => expect(eliminaArea).toHaveBeenCalledWith('k-03'));
  // senza parametri la scheda apre la prima infiltrazione
  expect(await screen.findByRole('heading', { level: 2, name: 'Cancello' })).toBeInTheDocument();
  expect(screen.getByTestId('indirizzo')).toHaveTextContent(/^\/guida\/dungeon\/kamoshida$/);
});

// UX3-1 (§4.4): arrivando dalla proposta non certa di una voce del diario la scheda lo dice; «Chiudi» toglie solo `daVoce`
it('dalla proposta di una voce (`?daVoce=`) la riga «Aperta dalla proposta…»; «Chiudi» toglie il parametro e lascia l’infiltrazione', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  getVocePercorso.mockResolvedValue({ uid: 'v-9', giorno: '04-20', infiltrazioni: [], propostaInfiltrazioni: { infiltrazioni: [{ chiave: 'k-03', nome: 'Cortile' }, { chiave: 'k-01', nome: 'Cancello' }], motivo: 'x', certezza: 'probabile' } });
  monta('kamoshida', '?infiltrazione=k-03&daVoce=v-9');
  expect(await screen.findByText('Aperta dalla proposta della voce del 20 aprile: Cortile, Cancello (probabile)')).toBeInTheDocument();
  expect(getVocePercorso).toHaveBeenCalledWith('v-9', 4);
  fireEvent.click(screen.getByRole('button', { name: 'Chiudi' }));
  await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent(/^\/guida\/dungeon\/kamoshida\?infiltrazione=k-03$/));
  expect(screen.queryByText(/Aperta dalla proposta/)).toBeNull();
});

// ---- L4 «Avanzamento unico»: livelli del Palazzo e «Da verificare» (§1.5, §4.1, §4.3, §8.10) ----

/** Il Palazzo di prova come Kamoshida p1 dopo L4: concluso (Tesoro e boss), 56/71 oggetti permanenti, la sicura «da verificare» sul pin 1. */
const palazzoL4 = (): DungeonDettaglioDto => {
  const p = palazzo(true);
  return { ...p, concluso: 'Tesoro e boss finale', completato: null, daVerificare: 1,
    completamento: { oggetti: 71, fatti: 56, tesoro: true, boss: true, concluso: true, completato: false },
    aree: [{ ...p.aree[0], punti: [{ ...p.aree[0].punti[0], daVerificare: true }] }, ...p.aree.slice(1)] };
};
const divergenzaSicura = { spillo: 1, spilloUid: 'u1', spilloNome: 'Forziere', mappa: 'm-cancello', mappaNome: 'Palazzo di Kamoshida › Cancello', voce: 'p1', voceNome: 'Sicura del cancello', infiltrazione: 'k-01', infiltrazioneNome: 'Cancello', rilevataIl: '2026-10-20' };

// LAY3-5: nei Palazzi il chip riassuntivo (R3-41, scelta 3 del PM) vale a ogni larghezza: livello e «da verificare» in un chip, Tesoro
// e boss per esteso nel suo nome e nei «Dettagli dalla guida»
it('L4: l’anello conta gli oggetti permanenti; il chip riassuntivo dice «Concluso · 1 da verificare» e quel che manca al completamento', async () => {
  getDungeon.mockResolvedValue(palazzoL4());
  getDivergenze.mockResolvedValue([divergenzaSicura]);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  expect(screen.getByRole('progressbar', { name: 'Avanzamento in Palazzo di Kamoshida: 56 oggetti permanenti fatti su 71' })).toBeInTheDocument();
  expect(screen.getByText('78%')).toBeInTheDocument();
  const chip = screen.getByText('Concluso · 1 da verificare');
  expect(chip).toHaveAccessibleName('Concluso: Tesoro raccolto, boss finale sconfitto; 1 da verificare');
  expect(chip).toHaveAttribute('title', 'Tesoro e boss finale · al completamento mancano 15 oggetti permanenti — tocca per i pin da verificare');
  expect(screen.getAllByText(/^Tesoro raccolto · boss finale sconfitto/).length).toBeGreaterThan(0);
});

it('L4: «Da verificare» dalla scheda — il chip apre la sezione, l’elenco apre la finestra, «Segna la voce» segna e rilegge', async () => {
  getDungeon.mockResolvedValue(palazzoL4());
  getDivergenze.mockResolvedValue([divergenzaSicura]);
  impostaStatoPunto.mockResolvedValue({});
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  await waitFor(() => expect(getDivergenze).toHaveBeenCalledWith(4, 'kamoshida'));
  const sezione = screen.getByText('Da verificare (1)').closest('details')!;
  expect(sezione).not.toHaveAttribute('open');
  fireEvent.click(screen.getByRole('button', { name: /; 1 da verificare$/ }));
  expect(sezione).toHaveAttribute('open');
  fireEvent.click(await within(sezione).findByRole('button', { name: /^Forziere/ }));
  const finestra = within(screen.getByRole('dialog', { name: 'Da verificare' }));
  expect(finestra.getByText('Il pin risulta fatto ma la voce no: era così prima dell’aggiornamento.')).toBeInTheDocument();
  fireEvent.click(finestra.getByRole('button', { name: 'Segna la voce' }));
  await waitFor(() => expect(impostaStatoPunto).toHaveBeenCalledWith(4, 'p1', 'ottenuto'));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(getDungeon.mock.calls.length).toBeGreaterThan(1);
});

it('L4: «Da verificare» dalla voce — segno sulla riga e «Sistema…» nella voce aperta, «Togli il fatto al pin» per uid', async () => {
  getDungeon.mockResolvedValue(palazzoL4());
  getDivergenze.mockResolvedValue([divergenzaSicura]);
  togliFattoAlPin.mockResolvedValue(undefined);
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  // la riga della voce nella guida (il suo nome comincia con quello della voce): quando le divergenze arrivano, anche la riga del pin
  // in «Pin da verificare» porta il nome della voce, dopo quello del pin
  const riga = screen.getByRole('button', { name: /^Sicura del cancello/ });
  expect(within(riga).getByText('Da verificare')).toBeInTheDocument();
  fireEvent.click(riga);
  // «Sistema…» è attivo quando le divergenze sono arrivate (prima non saprebbe quale pin)
  const sistema = await screen.findByRole('button', { name: 'Sistema…' });
  await waitFor(() => expect(sistema).toBeEnabled());
  fireEvent.click(sistema);
  fireEvent.click(within(screen.getByRole('dialog', { name: 'Da verificare' })).getByRole('button', { name: 'Togli il fatto al pin' }));
  await waitFor(() => expect(togliFattoAlPin).toHaveBeenCalledWith(4, 'u1'));
});

it('L4: senza divergenze non si chiede niente e non c’è la sezione', async () => {
  getDungeon.mockResolvedValue({ ...palazzoL4(), daVerificare: 0 });
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  expect(getDivergenze).not.toHaveBeenCalled();
  expect(screen.queryByText(/Da verificare \(/)).toBeNull();
  expect(screen.queryByRole('button', { name: /da verificare/ })).toBeNull();
});

// ---- Più infiltrazioni nella stessa planimetria (richiesta dell'utente, 2026-09-29) ----

/** Il Palazzo di prova con «Cancello» che contiene anche «Cortile», e «Torre» legata a una tavola sua. */
const palazzoConPiuAree = (): DungeonDettaglioDto => {
  const p = palazzo(true);
  const cancello = { ...p.planimetrie[0], aree: [{ chiave: 'k-03', nome: 'Cortile', ordine: 2 }, { chiave: 'k-01', nome: 'Cancello', ordine: 0 }] };
  const torre = { ...p.planimetrie[1], aree: [{ chiave: 'k-02', nome: 'Torre', ordine: 1 }] };
  // L3: l'area «Cancello» è toccata da due infiltrazioni (Cancello e Cortile, che arrivano fuori ordine), la «Torre alta» dalla Torre
  const legame = (slug: string, nome: string) => [{ chiave: `dungeon/kamoshida/${slug}`, slug, nome, planimetriaIniziale: null }];
  // (sulle planimetrie l'area può essere null, sulle mappe di un'infiltrazione manca)
  const mappa = (m: typeof cancello) => ({ chiave: m.chiave, nome: m.nome, n: m.n, presi: m.presi, spilli: m.spilli, area: m.area ?? undefined });
  return {
    ...p,
    planimetrie: [cancello, torre],
    aree: [
      { ...p.aree[0], mappe: [mappa(cancello)], areePalazzo: legame('cancello', 'Cancello') },
      { ...p.aree[1], mappe: [mappa(torre)], areePalazzo: legame('torre-alta', 'Torre alta') },
      { ...p.aree[2], mappe: [mappa(cancello)], areePalazzo: legame('cancello', 'Cancello') },
    ],
    areePalazzo: [
      areaPalazzo('cancello', 'Cancello', 'm-cancello', [{ chiave: 'k-03', nome: 'Cortile', ordine: 2 }, { chiave: 'k-01', nome: 'Cancello', ordine: 0 }], { n: 2, presi: 1 }),
      areaPalazzo('torre-alta', 'Torre alta', 'm-torre', [{ chiave: 'k-02', nome: 'Torre', ordine: 1 }], { n: 2, presi: 0 }, { ordine: 1 }),
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
  /** La riga di un'area nell'elenco del Palazzo (L3: le Aree, con le infiltrazioni che le toccano). */
  const rigaArea = (i: number) => within(screen.getByRole('list', { name: 'Aree' })).getAllByRole('listitem')[i];

  it('tutte le voci segnate (Ottenute o Esaurite; le descrittive non contano): spunta sulle infiltrazioni, sull’area che le ha tutte completate e nel pannello del visore', async () => {
    getDungeon.mockResolvedValue(conVoci({
      'k-01': [voceGuida('a', 'sicura', 'ottenuto')],
      'k-03': [voceGuida('b', 'forziere', 'esaurito'), voceGuida('c', 'altro', null)],
    }));
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const riga = rigaArea(0);
    // l'area: la spunta dopo il nome, e «(completata)» per chi usa un lettore di schermo; poi le sue infiltrazioni, in ordine di guida
    expect(within(riga).getAllByRole('button')[1]).toHaveAccessibleName(/Cancello \(completata\).*1\. Cancello \(completata\).*3\. Cortile \(completata\)/);
    // tre spunte: l'area e le sue due infiltrazioni
    expect(riga.querySelectorAll('[data-completata]')).toHaveLength(3);
    // i chip del pannello del visore («Infiltrazioni in quest'area»)
    const chip = within(screen.getByRole('region', { name: 'Infiltrazioni in quest’area' })).getAllByRole('button');
    expect(chip.map((b) => b.textContent)).toEqual(['1. Cancello (completata)', '3. Cortile (completata)']);
    expect(chip.every((b) => b.querySelector('[data-completata]'))).toBe(true);
  });

  it('una voce ancora da fare: niente spunta su quell’infiltrazione né sull’area; un’infiltrazione senza voci da segnare non ha spunta', async () => {
    getDungeon.mockResolvedValue(conVoci({
      'k-01': [voceGuida('a', 'sicura', 'ottenuto')],
      'k-03': [voceGuida('b', 'forziere', 'esaurito'), voceGuida('d', 'boss', null)],
      'k-02': [voceGuida('e', 'altro', null)],
    }));
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const riga = rigaArea(0);
    expect(riga.querySelectorAll('[data-completata]')).toHaveLength(1);
    expect(within(riga).getAllByRole('button')[1]).toHaveAccessibleName(/1\. Cancello \(completata\) ?3\. Cortile$/);
    // la Torre alta ha solo un'infiltrazione con una nota descrittiva, e 2 da prendere: nessuna spunta
    expect(rigaArea(1).querySelectorAll('[data-completata]')).toHaveLength(0);
    const chip = within(screen.getByRole('region', { name: 'Infiltrazioni in quest’area' })).getAllByRole('button');
    expect(chip.map((b) => b.textContent)).toEqual(['1. Cancello (completata)', '3. Cortile']);
  });

  it('un’infiltrazione senza aree, completata, ha la spunta sulla sua riga in coda all’elenco', async () => {
    const d = palazzo(true);
    // la Torre (k-02) non tocca aree: sta fra le infiltrazioni in coda
    d.aree[1] = { ...d.aree[1], punti: [voceGuida('t', 'miniboss', 'ottenuto')] };
    getDungeon.mockResolvedValue(d);
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const senza = within(screen.getByRole('region', { name: 'Infiltrazioni senza aree' }));
    const torre = senza.getByRole('button', { name: /2\. Torre \(completata\)/ });
    expect(torre.closest('li')!.querySelectorAll('[data-completata]')).toHaveLength(1);
    // le aree non ne sono toccate: Cancello e Torre alta hanno ancora da fare; il Cortile non ha niente da raccogliere, quindi è completo
    expect(rigaArea(0).querySelectorAll('[data-completata]')).toHaveLength(0);
    expect(rigaArea(1).querySelectorAll('[data-completata]')).toHaveLength(0);
    expect(rigaArea(2)).toHaveTextContent('niente da raccogliere · completa');
  });

  it('in un’area con più versioni la spunta compare sull’area e sulle sue infiltrazioni, una volta sola (le versioni si scelgono nella fila)', async () => {
    const dungeon = conDueVersioni();
    // l'infiltrazione Cancello è completata; l'area ha ancora 1 su 2 da raccogliere, ma è completa per infiltrazioni
    dungeon.aree[0] = { ...dungeon.aree[0], punti: [voceGuida('a', 'sicura', 'ottenuto')] };
    getDungeon.mockResolvedValue(dungeon);
    monta('kamoshida');
    await screen.findByRole('group', { name: 'Versioni di Cancello' });
    const riga = rigaArea(0);
    expect(riga).toHaveTextContent('2 versioni · 1 da prendere su 2');
    expect(riga.querySelectorAll('[data-completata]')).toHaveLength(2);
    expect(within(riga).getAllByRole('button')[1]).toHaveAccessibleName(/^1\. Cancello \(completata\)/);
  });

  it('un’area senza niente da raccogliere è completa (2026-10-11): testo, ✓, chip delle complete; senza partita resta solo «niente da raccogliere»', async () => {
    const p = palazzo(true);
    // la Torre alta (2 da raccogliere) diventa vuota; il server conta fra le complete la sua planimetria e quella del Cortile
    const conVuota: DungeonDettaglioDto = { ...p, raccolta: { ...p.raccolta, totale: 2, mappeComplete: 2 },
      planimetrie: [p.planimetrie[0], { ...p.planimetrie[1], n: 0, presi: 0, spilli: [] }, p.planimetrie[2]],
      areePalazzo: p.areePalazzo!.map((a) => (a.slug === 'torre-alta' ? { ...a, raccolta: { n: 0, presi: 0 } } : a)) };
    getDungeon.mockResolvedValue(conVuota);
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    // il chip della riga sotto il titolo (da 1024 a 1279 px lo stesso testo sta anche nei «Dettagli dalla guida», R3-41)
    const chipAree = () => screen.getByTitle(/^Le aree del Palazzo, con le loro versioni/);
    expect(chipAree()).toHaveTextContent('3 aree · 3 planimetrie · 2 complete');
    const torre = rigaArea(1);
    expect(torre).toHaveTextContent('niente da raccogliere · completa');
    expect(torre.querySelectorAll('[data-completata]')).toHaveLength(1);
    // segnando l'ultimo collezionabile del Cancello il chip si aggiorna subito, con la stessa regola: anche le vuote contano
    impostaSpilloRaccolto.mockResolvedValue({});
    getDungeon.mockImplementation(() => new Promise<DungeonDettaglioDto>(() => {}));
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Forziere 2 di Cancello aperto' })[0]);
    await waitFor(() => expect(chipAree()).toHaveTextContent('3 aree · 3 planimetrie · 3 complete'));
    cleanup();
    getDungeon.mockReset();
    getArea.mockImplementation(areaDellaPrimaLettura);
    // senza partita niente è completo
    const senza = palazzo(false);
    getDungeon.mockResolvedValue({ ...senza, areePalazzo: senza.areePalazzo!.map((a) => (a.slug === 'torre-alta' ? { ...a, raccolta: { n: 0, presi: null } } : a)) });
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    const torreSenza = rigaArea(1);
    expect(torreSenza).toHaveTextContent('niente da raccogliere');
    expect(torreSenza).not.toHaveTextContent('· completa');
    expect(torreSenza.querySelectorAll('[data-completata]')).toHaveLength(0);
  });

  it('segnando l’ultima voce dalla guida la spunta compare subito, prima della rilettura; riaprendola sparisce subito', async () => {
    // le riletture dopo ogni gesto restano in sospeso: quello che si vede viene solo dall'aggiornamento immediato della pagina
    getDungeon.mockResolvedValueOnce(palazzo(true)).mockImplementation(() => new Promise<DungeonDettaglioDto>(() => {}));
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    // il Cancello non ha ancora spunte (il Cortile, senza niente da raccogliere, ha la sua)
    expect(rigaArea(0).querySelectorAll('[data-completata]')).toHaveLength(0);
    // la Sicura del cancello è l'unica voce dell'infiltrazione Cancello
    fireEvent.click(screen.getByRole('button', { name: /Sicura del cancello/ }));
    impostaStatoPunto.mockResolvedValueOnce(voceGuida('p1', 'sicura', 'ottenuto'));
    fireEvent.click(screen.getByRole('button', { name: 'Ottenuto' }));
    await waitFor(() => expect(impostaStatoPunto).toHaveBeenCalledWith(4, 'p1', 'ottenuto'));
    // spunta sull'infiltrazione e sull'area, che ha solo quella
    await waitFor(() => expect(rigaArea(0).querySelectorAll('[data-completata]')).toHaveLength(2));
    impostaStatoPunto.mockResolvedValueOnce(voceGuida('p1', 'sicura', null));
    fireEvent.click(screen.getByRole('button', { name: 'Riapri' }));
    await waitFor(() => expect(impostaStatoPunto).toHaveBeenLastCalledWith(4, 'p1', null));
    await waitFor(() => expect(rigaArea(0).querySelectorAll('[data-completata]')).toHaveLength(0));
  });

  it('senza partita le voci non hanno stato: nessuna spunta', async () => {
    usePartitaStore.setState({ attiva: null });
    getDungeon.mockResolvedValue(conVoci({ 'k-01': [voceGuida('a', 'sicura', null)] }));
    monta('kamoshida');
    await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
    expect(document.querySelectorAll('[data-completata]')).toHaveLength(0);
  });
});

it('un’area con più infiltrazioni le mostra in ordine di guida: nell’elenco del Palazzo e nel pannello del visore, dove toccarne una la apre restando sull’area', async () => {
  getDungeon.mockResolvedValue(palazzoConPiuAree());
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  // la riga dell'area: le infiltrazioni nell'ordine della guida, non in quello in cui arrivano
  expect(within(screen.getByRole('list', { name: 'Aree' })).getAllByRole('listitem')[0].querySelector('[data-infiltrazioni-di]')!.textContent).toBe('1. Cancello3. Cortile');
  // il pannello del visore: le infiltrazioni dell'area aperta; toccarne una cambia l'infiltrazione, l'area e la versione restano
  const pannello = within(screen.getByRole('region', { name: 'Infiltrazioni in quest’area' }));
  const voci = pannello.getAllByRole('button');
  expect(voci.map((b) => b.textContent)).toEqual(['1. Cancello', '3. Cortile']);
  expect(voci[0]).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(voci[1]);
  expect(await screen.findByRole('heading', { level: 2, name: 'Cortile' })).toBeInTheDocument();
  expect(screen.getByTestId('indirizzo')).toHaveTextContent('/guida/dungeon/kamoshida/area/cancello?infiltrazione=k-03&planimetria=m-cancello');
  expect(screen.getByText(/^Visore: m-cancello/)).toBeInTheDocument();
});

it('le infiltrazioni di un’area si scelgono insieme nella finestra dell’area: in ordine di guida, e si salva l’insieme (L3, R3-24)', async () => {
  getDungeon.mockResolvedValue(palazzoConPiuAree());
  impostaInfiltrazioniArea.mockResolvedValue({});
  monta('kamoshida');
  await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' });
  fireEvent.click(await screen.findByRole('button', { name: 'Modifica area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Modifica Cancello' }));
  const caselle = within(finestra.getByRole('group', { name: 'Infiltrazioni in quest’area' })).getAllByRole('checkbox');
  // tutte le infiltrazioni del Palazzo, in ordine di guida, con spuntate quelle che toccano l'area
  expect(caselle.map((c) => c.closest('label')!.textContent)).toEqual(['1. Cancello', '2. Torre', '3. Cortile']);
  expect(caselle.map((c) => (c as HTMLInputElement).checked)).toEqual([true, false, true]);
  // spuntare un'infiltrazione che tocca anche altre aree la aggiunge qui senza toglierla da lì: i legami sono molti a molti
  fireEvent.click(caselle[1]);
  fireEvent.click(caselle[0]);
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(impostaInfiltrazioniArea).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'dungeon' }), 'cancello', ['k-02', 'k-03']));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(aggiornaAreaMondo).not.toHaveBeenCalled();
});

// ---- Le correzioni della guida (rilievi della revisione, 2026-09-18) ----

it('la bozza di correzione appartiene al pezzo che stai correggendo, non alla schermata', async () => {
  getDungeon.mockResolvedValue(palazzo(true));
  aggiornaArea.mockResolvedValue({});
  monta('kamoshida');
  expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();

  // scrivo nel modulo dell'area, poi cambio area senza salvare
  fireEvent.click(screen.getByRole('button', { name: /^Modifica testo: l’infiltrazione/ }));
  const modulo = screen.getByRole('form', { name: /Correggi l’infiltrazione/ });
  fireEvent.change(within(modulo).getByLabelText('Nome dell’infiltrazione'), { target: { value: 'Scritto per sbaglio' } });
  // si cambia infiltrazione dall'elenco: «Torre» non tocca aree, sta in coda
  fireEvent.click(within(screen.getByRole('region', { name: 'Infiltrazioni senza aree' })).getByRole('button', { name: /^2\. Torre/ }));
  await screen.findByRole('heading', { level: 2, name: 'Torre' });

  // il modulo si è chiuso con la sua bozza: riaprendolo sull'altra area c'è il nome dell'altra area
  fireEvent.click(screen.getByRole('button', { name: /^Modifica testo: l’infiltrazione/ }));
  expect(within(screen.getByRole('form', { name: /Correggi l’infiltrazione/ })).getByLabelText('Nome dell’infiltrazione')).toHaveValue('Torre');
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

it('la finestra dell’area salva solo quel che cambia: la sola etichetta non tocca nome né infiltrazioni', async () => {
  await apriAree();
  aggiornaPlanimetrieArea.mockResolvedValue({});
  fireEvent.click(await screen.findByRole('button', { name: 'Modifica area' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Modifica Cancello' }));
  fireEvent.change(finestra.getByLabelText('Etichetta di Planimetria 1'), { target: { value: 'Livello 0' } });
  fireEvent.click(finestra.getByRole('button', { name: 'Salva' }));
  await waitFor(() => expect(aggiornaPlanimetrieArea).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'dungeon' }), 'cancello', { etichette: { 'm-cancello': 'Livello 0' } }));
  expect(aggiornaAreaMondo).not.toHaveBeenCalled();
  expect(impostaInfiltrazioniArea).not.toHaveBeenCalled();
});

// ---- Un'infiltrazione nuova (richiesta dell'utente, 2026-10-01; L3: con le aree che tocca, R3-22) ----

it('«Aggiungi infiltrazione» crea un’infiltrazione con le aree che tocca: il modulo si apre dal nome', async () => {
  await apriAree();
  creaArea.mockResolvedValue({ chiave: 'kamoshida-torre-di-guardia', nome: 'Torre di guardia', ordine: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi infiltrazione' }));
  const modulo = within(within(await screen.findByRole('dialog', { name: 'Nuova infiltrazione' })).getByRole('form', { name: 'Nuova infiltrazione' }));
  // il modulo si apre dal nome
  expect(modulo.getByLabelText('Nome dell’infiltrazione')).toHaveFocus();
  fireEvent.change(modulo.getByLabelText('Nome dell’infiltrazione'), { target: { value: 'Torre di guardia' } });
  fireEvent.change(modulo.getByLabelText('Descrizione'), { target: { value: 'In cima alle scale.' } });
  // le Aree del Palazzo fra cui scegliere quelle toccate
  fireEvent.click(modulo.getByRole('checkbox', { name: 'Torre alta' }));
  fireEvent.click(modulo.getByRole('button', { name: 'Crea l’infiltrazione' }));
  // di partenza dopo l'infiltrazione aperta (Cancello)
  await waitFor(() => expect(creaArea).toHaveBeenCalledWith('kamoshida', { nome: 'Torre di guardia', descrizione: 'In cima alle scale.', dopo: 'k-01', areePalazzo: ['torre-alta'] }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(getDungeon).toHaveBeenCalledTimes(2);
});

it('l’infiltrazione nuova propone il posto subito dopo quella aperta; senza aree toccate non manda il campo', async () => {
  await apriAree();
  creaArea.mockResolvedValue({ chiave: 'kamoshida-garitta', nome: 'Garitta', ordine: 1 });
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi infiltrazione' }));
  const modulo = within(within(await screen.findByRole('dialog', { name: 'Nuova infiltrazione' })).getByRole('form', { name: 'Nuova infiltrazione' }));
  expect(modulo.getByText('Dopo «1. Cancello»')).toBeInTheDocument();
  fireEvent.change(modulo.getByLabelText('Nome dell’infiltrazione'), { target: { value: 'Garitta' } });
  fireEvent.click(modulo.getByRole('button', { name: 'Crea l’infiltrazione' }));
  await waitFor(() => expect(creaArea).toHaveBeenCalledWith('kamoshida', { nome: 'Garitta', descrizione: '', dopo: 'k-01' }));
});

it('senza nome l’infiltrazione nuova non si crea', async () => {
  await apriAree();
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi infiltrazione' }));
  const dialogo = await screen.findByRole('dialog', { name: 'Nuova infiltrazione' });
  const modulo = within(within(dialogo).getByRole('form', { name: 'Nuova infiltrazione' }));
  expect(modulo.getByRole('button', { name: 'Crea l’infiltrazione' })).toBeDisabled();
  fireEvent.submit(within(dialogo).getByRole('form', { name: 'Nuova infiltrazione' }));
  expect(creaArea).not.toHaveBeenCalled();
});

it('un’infiltrazione nuova all’inizio del Palazzo: creata, la scheda la apre', async () => {
  // l'infiltrazione nuova in fondo alla risposta: se la scheda non la aprisse, resterebbe aperta la prima (Cancello)
  const conAtrio = (): DungeonDettaglioDto => { const p = palazzo(true); return { ...p, aree: [...p.aree, { ...p.aree[1], chiave: 'kamoshida-atrio', nome: 'Atrio', ordine: 3, punti: [] }] }; };
  await apriAree();
  getDungeon.mockResolvedValue(conAtrio());
  creaArea.mockResolvedValue({ chiave: 'kamoshida-atrio', nome: 'Atrio', ordine: 0 });
  fireEvent.click(screen.getByRole('button', { name: 'Aggiungi infiltrazione' }));
  const finestra = within(await screen.findByRole('dialog', { name: 'Nuova infiltrazione' }));
  fireEvent.change(finestra.getByLabelText('Nome dell’infiltrazione'), { target: { value: 'Atrio' } });
  // il posto: «All'inizio del Palazzo»
  fireEvent.click(finestra.getByRole('combobox', { name: 'Dove va nella guida' }));
  fireEvent.click(screen.getByRole('option', { name: 'All’inizio del Palazzo' }).querySelector('button')!);
  fireEvent.click(finestra.getByRole('button', { name: 'Crea l’infiltrazione' }));
  await waitFor(() => expect(creaArea).toHaveBeenCalledWith('kamoshida', { nome: 'Atrio', descrizione: '', dopo: null }));
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  // la finestra si chiude prima della rilettura: l'indirizzo cambia dopo
  await waitFor(() => expect(screen.getByTestId('indirizzo')).toHaveTextContent('/guida/dungeon/kamoshida?infiltrazione=kamoshida-atrio'));
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

describe('intestazione con l’illustrazione (L1, scelta dell’utente «Illustrazione anche nelle schede», 2026-10-20)', () => {
  // L1 e UX3-6 (regola dell'utente: mai velata dietro al testo): piena nel suo spazio; da 1280 px in riga con l'anello (R3-41)
  it('un Palazzo con l’illustrazione caricata la mostra, piena, nelle tre misure dell’intestazione (da 1024 a 1279 px solo lo stemma), mai come sfondo; senza resta lo stemma', async () => {
    getDungeon.mockResolvedValue({ ...palazzo(true), illustrazione: { immagineUrl: '/api/immagini/mappa/dungeon-kamoshida/file?v=1', asset: null } });
    const conIllustrazione = monta('kamoshida');
    expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
    const figure = screen.getAllByAltText('Illustrazione di Palazzo di Kamoshida');
    expect(figure).toHaveLength(3);
    // ogni misura chiede la miniatura della sua larghezza (`sizes` uguale al riquadro), non l'originale
    // LAY3-5: sotto i 1024 px più piccola ma piena (96 px sul telefono, 128 sul tablet; erano 150 e 176)
    expect(figure.map((f) => f.getAttribute('sizes'))).toEqual(['96px', '128px', '104px']);
    // da 1024 a 1279 px lo stemma da solo (UX-1): la fascia `lg:block xl:hidden` non ha l'illustrazione
    expect(document.querySelector('header .lg\\:block.xl\\:hidden .illustrazione-segno')).toBeNull();
    // da 1280 px in riga con l'anello (non più in colonna, R3-41), e nessuna immagine velata dietro al testo
    expect(figure[2].closest('.xl\\:flex-col')).toBeNull();
    expect(document.querySelector('header > img')).toBeNull();
    for (const f of figure) {
      expect(f).toHaveAttribute('src', '/api/immagini/mappa/dungeon-kamoshida/file?v=1&l=320');
      // il segno sopra è nascosto ai lettori di schermo: l'alt dice già quale posto è
      expect(f.parentElement?.querySelector('.illustrazione-segno__segno')).toHaveAttribute('aria-hidden', 'true');
    }
    conIllustrazione.unmount();
    getDungeon.mockResolvedValue(palazzo(true));
    monta('kamoshida');
    expect(await screen.findByRole('heading', { name: 'Palazzo di Kamoshida' })).toBeInTheDocument();
    expect(screen.queryByAltText('Illustrazione di Palazzo di Kamoshida')).toBeNull();
  });
  it('i Memento restano col loro stemma anche se la scheda porta un’illustrazione', async () => {
    getDungeon.mockResolvedValue({ ...mementos(), illustrazione: { immagineUrl: '/illustrazione-memento.png', asset: null } });
    monta('mementos');
    expect(await screen.findByRole('heading', { name: 'Memento' })).toBeInTheDocument();
    expect(screen.queryByAltText('Illustrazione di Memento')).toBeNull();
  });
});
