/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CittaPage e QuartierePage — mappa incorporata di Tokyo/quartiere e schede dei luoghi senza posizionamento (Fase 13.4)
// ============================================================

import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CittaPage } from './CittaPage';
import { QuartierePage } from './QuartierePage';
import { usePartitaStore } from '../stores/partitaStore';
import type { DungeonRiassuntoDto, MappaDto, PartitaDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../types';

const api = vi.hoisted(() => ({ risolviMappa: vi.fn(async (mappa: string) => ({tipo:'mappa',mappa})), getQuartieri: vi.fn(), getDungeons: vi.fn(async (): Promise<DungeonRiassuntoDto[]> => []), getQuartiere: vi.fn(), getMappa: vi.fn(), scaricaPiantaQuartiere: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn(), urlImmagine: vi.fn((ambito: string, chiave: string) => `/api/immagini/${ambito}/${encodeURIComponent(chiave)}/file`), getImmagini: vi.fn(() => Promise.resolve([])) }));
vi.mock('../services/api', () => api);

const mappa = (chiave: string, nome: string): MappaDto => ({ chiave, nome, tipo: chiave === 'tokyo' ? 'citta' : 'quartiere', genitore: chiave === 'tokyo' ? null : 'tokyo', ordine: 0, immagineUrl: `/asset/mappe/${chiave}.png`, asset: null, entita: null, origine: 'seed', numeroSpilli: 1, numeroFigli: 0, updatedAt: '', larghezza: 1000, altezza: 600, note: '', genitoreNome: chiave === 'tokyo' ? null : 'Tokyo', percorso: chiave === 'tokyo' ? [{ chiave: 'tokyo', nome: 'Tokyo' }] : [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave, nome }], figli: [],
  spilli: [{ id: 1, mappaChiave: chiave, tipo: 'passaggio', tipoNome: 'Passaggio', colore: '#3b82f6', nome: chiave === 'tokyo' ? 'Shibuya' : 'Untouchable', descrizione: '', x: 30, y: 40, riferimento: null, collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '' }] });

describe('CittaPage', () => {
  it('mostra una sola Tokyo — quella disegnata — e le piastrelle dei quartieri', async () => {
    // La pagina montava anche `MappaIncorporata chiave="tokyo"`: la stessa città due volte, con
    // due interazioni e nessun modo di capire quale fosse quella buona. La prova che conta è
    // che il visore dell'atlante non ci sia più e che di Tokyo ce ne sia **una**.
    api.getQuartieri.mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: 'Il centro.' }] as QuartiereRiassuntoDto[]);
    api.getMappa.mockResolvedValue(mappa('tokyo', 'Tokyo'));
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    expect(await screen.findByRole('img', { name: /^Mappa di Tokyo con/ })).toBeInTheDocument();
    expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
    expect(api.getMappa).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Modifica mappa' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Quartieri' })).getByRole('link', { name: /Shibuya/ })).toHaveAttribute('href', '/guida/citta/shibuya');
  });

  it('sulla mappa disegnata il quartiere porta alla sua mappa, non a un secondo visore di Tokyo', async () => {
    api.getQuartieri.mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: 'Il centro.' }] as QuartiereRiassuntoDto[]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const tokyo = await screen.findByRole('img', { name: /^Mappa di Tokyo con/ });
    const cartellino = within(tokyo).getByTitle('Shibuya');
    expect(cartellino).toHaveAttribute('href', '/guida/mappe/citta-shibuya');
  });

  it('il clic su un quartiere apre l’ingresso configurato, non sempre il nodo d’atlante', async () => {
    // «devo poter scegliere il punto di apertura del click»: l'ingresso si configura dalla scheda
    // del quartiere e porta mappa + punto + ingrandimento. Era già salvato, ma questa mappa lo
    // ignorava: si poteva sceglierlo e non vederlo mai usato.
    api.getQuartieri.mockResolvedValue([
      { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: '',
        ingresso: { mappa: 'shibuya-sottopasso', nome: 'Sottopasso di Shibuya', x: 42.5, y: 61, zoom: 3 } },
      { chiave: 'ueno', nome: 'Ueno', mappaChiave: 'citta-ueno', luoghi: 3, verificati: 3, sblocco: null, descrizione: '' },
    ] as QuartiereRiassuntoDto[]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const mappa = await screen.findByRole('img', { name: /^Mappa di Tokyo con/ });
    expect(within(mappa).getByTitle('Shibuya')).toHaveAttribute('href', '/guida/mappe/shibuya-sottopasso?x=42.5&y=61&zoom=3');
    // e chi non l'ha configurato continua ad aprire il proprio nodo, com'è giusto
    expect(within(mappa).getByTitle('Ueno')).toHaveAttribute('href', '/guida/mappe/citta-ueno');
  });

  it('i Memento stanno sulla mappa di Tokyo, dentro la loro finestra e non prima', async () => {
    // Li avevo tolti riusando `soloPalazzi`, il filtro dell'*elenco* dei Palazzi, per decidere
    // anche il contenuto della mappa: due domande diverse con una risposta sola. L'utente li
    // aveva chiesti per nome («il Covo dei Ladri e i mementos possono essere posizionati in aree
    // libere»), e la loro finestra — dal 9 maggio, e non si chiude — esiste già nel seed.
    api.getQuartieri.mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: '' }] as QuartiereRiassuntoDto[]);
    api.getDungeons.mockResolvedValue([
      { chiave: 'mementos', tipo: 'mementos', nome: 'Memento', finestra: { dal: '05-09', al: null } },
      { chiave: 'kamoshida', tipo: 'palazzo', nome: 'Palazzo di Kamoshida', finestra: { dal: '04-12', al: '05-02' } },
    ] as DungeonRiassuntoDto[]);

    // il giorno prima: non ci sono, come il Palazzo già chiuso
    usePartitaStore.setState({ attiva: { id: 1, nome: 'Prova', dataGioco: '05-08' } as PartitaDto });
    const primo = render(<MemoryRouter><CittaPage /></MemoryRouter>);
    let mappa = await screen.findByRole('img', { name: /^Mappa di Tokyo con/ });
    // Il `title` dice nome **e** finestra («Memento — dal 05-09»): si cerca per inizio, non
    // esatto, o la prova fallisce per un trattino e sembra un difetto che non c'è.
    expect(within(mappa).queryByTitle(/^Memento/)).toBeNull();
    expect(within(mappa).queryByTitle(/^Palazzo di Kamoshida/)).toBeNull();
    primo.unmount();

    // il giorno dopo: ci sono, con la targa corta e il collegamento alla loro mappa
    usePartitaStore.setState({ attiva: { id: 1, nome: 'Prova', dataGioco: '05-09' } as PartitaDto });
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    mappa = await screen.findByRole('img', { name: /^Mappa di Tokyo con/ });
    const memento = await within(mappa).findByTitle(/^Memento/);
    expect(memento).toHaveAttribute('href', '/guida/mondo/dungeon/mementos');
    expect(memento.querySelector('img')).toHaveAttribute('src', '/api/immagini/palazzi/mementos/file');
  });

  it('la scheda del quartiere mostra la stessa sagoma della mappa composta', async () => {
    // Shujin è il caso che smaschera una tabella di corrispondenza inventata: la chiave del
    // quartiere è `shujin-academy` ed è anche il nome del file. Se la scheda cercasse
    // `citta-shujin-academy` — la vecchia anteprima del nodo d'atlante — resterebbe vuota.
    api.getQuartieri.mockResolvedValue([
      { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: 'Il centro.' },
      { chiave: 'shujin-academy', nome: 'Shujin Academy', mappaChiave: null, luoghi: 4, verificati: 4, sblocco: null, descrizione: '' },
    ] as QuartiereRiassuntoDto[]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const schede = within(await screen.findByRole('list', { name: 'Quartieri' }));
    expect(schede.getByAltText('Sagoma di Shibuya sulla mappa di Tokyo')).toHaveAttribute('src', '/api/immagini/mappe/lmap%2Ftokyo%2Fshibuya/file');
    expect(schede.getByAltText('Sagoma di Shujin Academy sulla mappa di Tokyo')).toHaveAttribute('src', '/api/immagini/mappe/lmap%2Ftokyo%2Fshujin-academy/file');
    // niente più anteprime del nodo d'atlante nella griglia
    expect(document.querySelector('.miniatura-mappa')).toBeNull();
  });

  it('mappa e schede sono una selezione sola: si accendono a vicenda', async () => {
    api.getQuartieri.mockResolvedValue([
      { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: '' },
      { chiave: 'ueno', nome: 'Ueno', mappaChiave: 'citta-ueno', luoghi: 3, verificati: 3, sblocco: null, descrizione: '' },
    ] as QuartiereRiassuntoDto[]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const mappa = await screen.findByRole('img', { name: /^Mappa di Tokyo con/ });
    const scheda = within(screen.getByRole('list', { name: 'Quartieri' })).getByRole('link', { name: /Shibuya/ });
    const cartellino = within(mappa).getByTitle('Shibuya');
    const sagomaSulla = (el: HTMLElement) => el.querySelector('img')!.getAttribute('style') ?? '';

    // a riposo: contorno bianco da tutte e due le parti
    expect(sagomaSulla(cartellino)).toContain('#fff)');
    fireEvent.mouseEnter(scheda);
    // dalla scheda si accende il cartellino
    expect(sagomaSulla(cartellino)).toContain('#ffd23f)');
    expect(sagomaSulla(scheda)).toContain('#ffd23f)');
    // e non si accende quello di Ueno: l'oro dice *quale*, e se si accendesse tutto non direbbe niente
    expect(sagomaSulla(within(mappa).getByTitle('Ueno'))).toContain('#fff)');
    fireEvent.mouseLeave(scheda);
    expect(sagomaSulla(cartellino)).toContain('#fff)');

    // e dalla mappa si accende la scheda
    fireEvent.mouseEnter(cartellino);
    expect(sagomaSulla(scheda)).toContain('#ffd23f)');
  });

  it('quel che è chiuso sulla mappa è un pallino col nome, non una figura', async () => {
    // Due chiusure diverse, e devono comportarsi allo stesso modo: Ikebukuro apre il 1° settembre
    // e oggi è l'11 aprile; Ginza non è chiusa dal calendario, ma nella guida non ha una scheda,
    // quindi non si può aprire. Una sagoma con la targa dice «vieni qui»: dirlo dove non si può
    // entrare è una promessa che la mappa non mantiene.
    usePartitaStore.setState({ attiva: { id: 3, nome: 'Prova', dataGioco: '04-11' } as PartitaDto });
    api.getQuartieri.mockResolvedValue([
      { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, sbloccoData: null, descrizione: '' },
      { chiave: 'ikebukuro', nome: 'Ikebukuro', mappaChiave: 'citta-ikebukuro', luoghi: 2, verificati: 2, sblocco: '1 settembre', sbloccoData: '09-01', descrizione: '' },
    ] as QuartiereRiassuntoDto[]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const mappa = await screen.findByRole('img', { name: /^Mappa di Tokyo con/ });
    expect(within(mappa).getByTitle('Shibuya')).toBeInTheDocument();
    expect(within(mappa).queryByTitle('Ikebukuro')).toBeNull();
    expect(within(mappa).queryByTitle('Ginza')).toBeNull();
    // il nome resta comunque leggibile, sul pallino
    const nomiPallini = [...mappa.querySelectorAll('circle > title')].map((t) => t.textContent);
    expect(nomiPallini).toContain('Ikebukuro — dal 09-01');
    expect(nomiPallini).toContain('Ginza');
    // e la scheda del quartiere chiuso lo dice, perché lassù non c'è niente da accendere
    const scheda = within(screen.getByRole('list', { name: 'Quartieri' })).getByRole('link', { name: /Ikebukuro/ });
    expect(within(scheda).getByText(/Non ancora aperto/)).toBeInTheDocument();
    usePartitaStore.setState({ attiva: null });
  });
});

describe('QuartierePage', () => {
  it('mostra la mappa del quartiere incorporata e i luoghi senza i pulsanti di posizionamento (ora nell’editor)', async () => {
    // `mappaChiave` la dà il backend (cittaService), non la costruisce la pagina: il mock deve dirla
    const q: QuartiereDettaglioDto = { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', sblocco: null, descrizione: '', fonte: '', mappa: true, pianta: null, piantaAssente: null,
      luoghi: [{ chiave: 'shibuya/untouchable', ordine: 0, tipo: 'negozio', nome: 'Untouchable', cosaOffre: 'Armi', quando: 'entrambe', giorni: null, sblocco: null, confidenti: [{ chiave: 'iwai', nome: 'Munehisa Iwai' }], attivita: [], negozi: [{ chiave: 'untouchable', nome: 'Untouchable' }], negozio: 'untouchable', origine: 'seed', piatti: null, note: null, fonte: '', verificato: true, marcatore: null, condizioni: null, disponibilita: null } as QuartiereDettaglioDto['luoghi'][number]] };
    api.getQuartiere.mockResolvedValue(q);
    api.getMappa.mockResolvedValue(mappa('citta-shibuya', 'Shibuya'));
    render(<MemoryRouter initialEntries={['/guida/citta/shibuya']}><Routes><Route path="/guida/citta/:chiave" element={<QuartierePage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('application', { name: 'Mappa: Tokyo › Shibuya' })).toBeInTheDocument();
    expect(api.getMappa).toHaveBeenCalledWith('citta-shibuya', undefined);
    const luoghi = within(screen.getByRole('list', { name: 'Luoghi' }));
    expect(luoghi.getByText('Untouchable')).toBeInTheDocument();
    expect(luoghi.queryByRole('button', { name: /Posiziona/ })).not.toBeInTheDocument();
    expect(luoghi.getByRole('link', { name: 'Articoli in vendita' })).toHaveAttribute('href', '/guida/negozi/untouchable');
    expect(api.scaricaPiantaQuartiere).not.toHaveBeenCalled();
  });
});
