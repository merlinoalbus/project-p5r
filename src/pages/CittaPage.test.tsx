/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test CittaPage e QuartierePage — mappa incorporata di Tokyo/quartiere e schede dei luoghi senza posizionamento (Fase 13.4)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError } from '../services/api/_helpers';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CittaPage } from './CittaPage';
import { QuartierePage } from './QuartierePage';
import { usePartitaStore } from '../stores/partitaStore';
import { useAssetStore } from '../stores/assetStore';
import type { AreaRiassuntoDto, DungeonRiassuntoDto, MappaDaCollocareDto, MappaDto, PartitaDto, QuartiereDettaglioDto, QuartiereRiassuntoDto } from '../types';
import { scegliVoce, valoreSelettore, vociSelettore } from '../../test/selettore';

const api = vi.hoisted(() => ({ risolviMappa: vi.fn(async (mappa: string) => ({tipo:'mappa',mappa})), getQuartieri: vi.fn(), getDungeons: vi.fn(async (): Promise<DungeonRiassuntoDto[]> => []), getQuartiere: vi.fn(), getMappa: vi.fn(), scaricaPiantaQuartiere: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn(), getImmagini: vi.fn(() => Promise.resolve([])),
  // le Aree della città e le planimetrie da collocare (L2): di serie nessuna, come nel database dopo la 109 senza staff
  getAreeCitta: vi.fn(async (): Promise<AreaRiassuntoDto[]> => []), getDaCollocare: vi.fn(async (): Promise<MappaDaCollocareDto[]> => []), aggiornaAreaMondo: vi.fn(), eliminaAreaMondo: vi.fn(), collocaPlanimetria: vi.fn() }));
vi.mock('../services/api', (vero) => moduloApi(vero, api));

/** Costruisce la mappa `chiave`: «tokyo» è la città radice, ogni altra un quartiere figlio di Tokyo; ha un solo spillo
 *  di passaggio (Shibuya su Tokyo, Untouchable sui quartieri). */
const mappa = (chiave: string, nome: string): MappaDto => ({ chiave, nome, nomeRivisto: false, tipo: chiave === 'tokyo' ? 'citta' : 'quartiere', genitore: chiave === 'tokyo' ? null : 'tokyo', ordine: 0, immagineUrl: `/asset/mappe/${chiave}.png`, asset: null, radiceDi: null, versione: null, origine: 'seed', numeroSpilli: 1, numeroFigli: 0, updatedAt: '', area: null, casa: chiave === 'tokyo' ? '/guida/citta' : `/guida/mappe/${chiave}`, larghezza: 1000, altezza: 600, note: '', genitoreNome: chiave === 'tokyo' ? null : 'Tokyo', percorso: chiave === 'tokyo' ? [{ chiave: 'tokyo', nome: 'Tokyo' }] : [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave, nome }], figli: [], arrivi: [], pezzi: [],
  spilli: [{ id: 1, mappaChiave: chiave, tipo: 'passaggio', tipoNome: 'Passaggio', colore: '#3b82f6', nome: chiave === 'tokyo' ? 'Shibuya' : 'Untouchable', descrizione: '', x: 30, y: 40, riferimento: null, collezionabile: false, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, voci: [], condizioni: [], immagini: [], updatedAt: '' }] });

// L1 (2026-10-20): sagome e stemmi sono segni della grafica predefinita e si risolvono dal manifesto, come nell'app: qui il
// manifesto li ha con gli stessi indirizzi del database
const SEGNI = ['shibuya', 'shujin-academy', 'ueno', 'akihabara'].map((q) => [`mappe/lmap/tokyo/${q}`, `/api/immagini/mappe/${encodeURIComponent(`lmap/tokyo/${q}`)}/file`]);
const STEMMI = ['kamoshida', 'madarame', 'mementos'].map((k) => [`palazzi/${k}`, `/api/immagini/palazzi/${k}/file`]);
beforeEach(() => {
  useAssetStore.setState({ manifest: { generato: 'T', totale: SEGNI.length + STEMMI.length, file: Object.fromEntries([...SEGNI, ...STEMMI]) }, caricato: true, mancanti: {} });
});

describe('CittaPage', () => {
  it('mostra una sola Tokyo — quella disegnata — e le piastrelle dei quartieri', async () => {
    // La pagina montava anche `MappaIncorporata chiave="tokyo"`: la stessa città due volte, con
    // due interazioni e nessun modo di capire quale fosse quella buona. La prova che conta è
    // che il visore dell'atlante non ci sia più e che di Tokyo ce ne sia **una**.
    api.getQuartieri.mockResolvedValue([{ chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: 'Il centro.' }] as QuartiereRiassuntoDto[]);
    api.getMappa.mockResolvedValue(mappa('tokyo', 'Tokyo'));
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    expect(await screen.findByRole('group', { name: /^Mappa di Tokyo con/ })).toBeInTheDocument();
    expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
    expect(api.getMappa).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: 'Modifica mappa' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Quartieri' })).getByRole('link', { name: /Shibuya/ })).toHaveAttribute('href', '/guida/citta/shibuya');
  });

  it('sulla mappa disegnata ogni quartiere porta alla sua pagina, con `ingresso=1` (L2, R2-15): l’unica che apre il quartiere', async () => {
    // Prima la metro apriva il visore dell'atlante (il nodo del quartiere, o la planimetria d'ingresso con il punto): un quartiere
    // aveva due pagine. Ora la pagina è una sola; arrivando dalla metro apre l'area d'ingresso in una finestra (QuartierePage).
    api.getQuartieri.mockResolvedValue([
      { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: '',
        ingresso: { mappa: 'shibuya-sottopasso', nome: 'Sottopasso di Shibuya', x: 42.5, y: 61, zoom: 3, area: { slug: 'sottopasso', nome: 'Sottopasso' } } },
      { chiave: 'ueno', nome: 'Ueno', mappaChiave: 'citta-ueno', luoghi: 3, verificati: 3, sblocco: null, descrizione: '' },
    ] as QuartiereRiassuntoDto[]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const mappa = await screen.findByRole('group', { name: /^Mappa di Tokyo con/ });
    expect(within(mappa).getByTitle('Shibuya')).toHaveAttribute('href', '/guida/citta/shibuya?ingresso=1');
    expect(within(mappa).getByTitle('Ueno')).toHaveAttribute('href', '/guida/citta/ueno?ingresso=1');
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
    let mappa = await screen.findByRole('group', { name: /^Mappa di Tokyo con/ });
    // Il `title` dice nome **e** finestra («Memento — dal 05-09»): si cerca per inizio, non
    // esatto, o la prova fallisce per un trattino e sembra un difetto che non c'è.
    expect(within(mappa).queryByTitle(/^Memento/)).toBeNull();
    expect(within(mappa).queryByTitle(/^Palazzo di Kamoshida/)).toBeNull();
    primo.unmount();

    // il giorno dopo: ci sono, con la targa corta e il collegamento alla loro mappa
    usePartitaStore.setState({ attiva: { id: 1, nome: 'Prova', dataGioco: '05-09' } as PartitaDto });
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    mappa = await screen.findByRole('group', { name: /^Mappa di Tokyo con/ });
    const memento = await within(mappa).findByTitle(/^Memento/);
    // senza una regola d'atterraggio, la scheda (L3, §4.1; prima `/guida/mondo/dungeon/<k>`)
    expect(memento).toHaveAttribute('href', '/guida/dungeon/mementos');
    expect(memento.querySelector('img')).toHaveAttribute('src', '/api/immagini/palazzi/mementos/file');
    // i Palazzi si chiedono con la partita: un Palazzo completato non c'è più (rilievo dell'utente, 2026-10-01)
    expect(api.getDungeons).toHaveBeenCalledWith(1);
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
    const mappa = await screen.findByRole('group', { name: /^Mappa di Tokyo con/ });
    const scheda = within(screen.getByRole('list', { name: 'Quartieri' })).getByRole('link', { name: /Shibuya/ });
    const cartellino = within(mappa).getByTitle('Shibuya');
    /** Lo stile della sagoma (l'`img` interna) dell'elemento: contiene il colore del contorno, bianco a riposo e oro se acceso. */
    const sagomaSulla =(el: HTMLElement) => el.querySelector('img')!.getAttribute('style') ?? '';

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
    const mappa = await screen.findByRole('group', { name: /^Mappa di Tokyo con/ });
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

  it('la scheda mostra l’illustrazione della mappa del quartiere con la sagoma sopra; senza illustrazione la sola sagoma (L1, 2026-10-20)', async () => {
    api.getQuartieri.mockResolvedValue([
      { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', luoghi: 11, verificati: 11, sblocco: null, descrizione: '', illustrazione: { immagineUrl: '/api/immagini/mappa/citta-shibuya/file?v=1', asset: 'mappe/citta-shibuya' } },
      { chiave: 'ueno', nome: 'Ueno', mappaChiave: 'citta-ueno', luoghi: 3, verificati: 3, sblocco: null, descrizione: '', illustrazione: { immagineUrl: null, asset: 'mappe/citta-ueno' } },
      { chiave: 'akihabara', nome: 'Akihabara', mappaChiave: 'citta-akihabara', luoghi: 3, verificati: 3, sblocco: null, disponibile: false, descrizione: '', illustrazione: { immagineUrl: '/api/immagini/mappa/citta-akihabara/file?v=1', asset: null } },
    ] as QuartiereRiassuntoDto[]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const schede = within(await screen.findByRole('list', { name: 'Quartieri' }));
    const shibuya = within(schede.getByRole('link', { name: /Shibuya/ }));
    // la miniatura, non l'originale da ~2 MB: `src` da 320 px come ripiego, `srcset` con le quattro misure e `sizes` della scheda
    const figura = shibuya.getByAltText('Illustrazione di Shibuya');
    expect(figura).toHaveAttribute('src', '/api/immagini/mappa/citta-shibuya/file?v=1&l=320');
    expect(figura.getAttribute('srcset')).toBe(['160', '320', '640', '1024'].map((l) => `/api/immagini/mappa/citta-shibuya/file?v=1&l=${l} ${l}w`).join(', '));
    expect(figura).toHaveAttribute('sizes', '(min-width: 1280px) 112px, 128px');
    // la sagoma sta sopra, come segno, nascosta ai lettori di schermo (l'alt e il nome dicono già il quartiere)
    const segno = shibuya.getByAltText('Illustrazione di Shibuya').parentElement!.querySelector('.illustrazione-segno__segno')!;
    expect(segno).toHaveAttribute('aria-hidden', 'true');
    expect(segno.querySelector('img')).toHaveAttribute('src', SEGNI[0][1]);
    // Ueno: l'asset dichiarato non è nel manifesto, quindi niente illustrazione e la sagoma piena com'era
    const ueno = within(schede.getByRole('link', { name: /Ueno/ }));
    expect(ueno.queryByAltText('Illustrazione di Ueno')).toBeNull();
    expect(ueno.getByAltText('Sagoma di Ueno sulla mappa di Tokyo')).toBeInTheDocument();
    // il quartiere non ancora aperto: illustrazione attenuata
    expect(within(schede.getByRole('link', { name: /Akihabara/ })).getByAltText('Illustrazione di Akihabara').parentElement).toHaveClass('illustrazione-segno--spenta');
  });
});

describe('CittaPage — Aree della città (L2, 2026-10-20)', () => {
  it('l’area dello staff, da verificare, ha la sua pagina, «Tieni» e «Rimuovi»; «Tieni» la toglie dalle aree da verificare', async () => {
    const staff = { chiave: 'citta/tokyo/staff', contenitore: { tipo: 'citta', chiave: 'tokyo', nome: 'Tokyo' }, slug: 'staff', nome: 'Staff', nomeRivisto: false, ordine: 0, predefinita: 'staff', illustrazione: { immagineUrl: null, asset: null },
      numeroPlanimetrie: 1, numeroSpilli: 0, passaggio: null, ingresso: false, origine: 'seed', modificata: false, daVerificare: true, casa: '/guida/citta/tokyo/staff' } as AreaRiassuntoDto;
    api.getQuartieri.mockResolvedValue([]);
    api.getAreeCitta.mockResolvedValueOnce([staff]).mockResolvedValue([{ ...staff, daVerificare: false }]);
    api.aggiornaAreaMondo.mockResolvedValue({ ...staff, daVerificare: false });
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const sezione = within(await screen.findByRole('region', { name: 'Aree della città' }));
    expect(sezione.getByRole('link', { name: 'Staff' })).toHaveAttribute('href', '/guida/citta/tokyo/staff');
    expect(sezione.getByText('Da verificare')).toBeInTheDocument();
    expect(sezione.getByRole('button', { name: /Rimuovi/ })).toBeInTheDocument();
    fireEvent.click(sezione.getByRole('button', { name: /Tieni/ }));
    await waitFor(() => expect(api.aggiornaAreaMondo).toHaveBeenCalledWith('tokyo', 'staff', { daVerificare: false }));
    await waitFor(() => expect(sezione.queryByText('Da verificare')).toBeNull());
  });

  it('UX2-7: la colonna del testo non scende sotto i 10rem, così «Tieni» e «Rimuovi» vanno a capo invece di schiacciarla', async () => {
    const staff = { chiave: 'citta/tokyo/staff', contenitore: { tipo: 'citta', chiave: 'tokyo', nome: 'Tokyo' }, slug: 'staff', nome: 'Area riservata allo staff', nomeRivisto: false, ordine: 0, predefinita: 'staff', illustrazione: { immagineUrl: null, asset: null },
      numeroPlanimetrie: 2, numeroSpilli: 0, passaggio: null, ingresso: false, origine: 'seed', modificata: false, daVerificare: true, casa: '/guida/citta/tokyo/staff' } as AreaRiassuntoDto;
    api.getQuartieri.mockResolvedValue([]);
    api.getAreeCitta.mockReset().mockResolvedValue([staff]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const nome = await screen.findByRole('link', { name: 'Area riservata allo staff' });
    const colonna = nome.closest('span.flex-col')!;
    expect(colonna).toHaveClass('min-w-[10rem]', 'flex-1');
    expect(colonna.parentElement).toHaveClass('flex-wrap');
    expect(within(colonna.parentElement!).getByRole('button', { name: /Tieni/ }).closest('span')).toHaveClass('ml-auto');
  });

  it('«Rimuovi» nella finestra è la conferma (UX2-8): una sola richiesta, con la conferma', async () => {
    const staff = { chiave: 'citta/tokyo/staff', contenitore: { tipo: 'citta', chiave: 'tokyo', nome: 'Tokyo' }, slug: 'staff', nome: 'Staff', nomeRivisto: false, ordine: 0, predefinita: 'staff', illustrazione: { immagineUrl: null, asset: null },
      numeroPlanimetrie: 2, numeroSpilli: 0, passaggio: null, ingresso: false, origine: 'seed', modificata: false, daVerificare: true, casa: '/guida/citta/tokyo/staff' } as AreaRiassuntoDto;
    api.getQuartieri.mockResolvedValue([]);
    api.getAreeCitta.mockReset().mockResolvedValueOnce([staff]).mockResolvedValue([]);
    api.getDaCollocare.mockReset().mockResolvedValue([]);
    api.eliminaAreaMondo.mockReset().mockResolvedValue(undefined);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    fireEvent.click(within(await screen.findByRole('region', { name: 'Aree della città' })).getByRole('button', { name: /Rimuovi/ }));
    const finestra = within(await screen.findByRole('dialog', { name: 'Rimuovere Staff?' }));
    expect(finestra.getByText(/le sue 2 planimetrie e i passaggi che portano qui/)).toBeInTheDocument();
    fireEvent.click(finestra.getByRole('button', { name: 'Rimuovi' }));
    await waitFor(() => expect(api.eliminaAreaMondo).toHaveBeenCalledWith('tokyo', 'staff', true));
    expect(api.eliminaAreaMondo).toHaveBeenCalledTimes(1);
  });

  it('senza Aree della città né planimetrie da collocare le due sezioni non ci sono', async () => {
    api.getQuartieri.mockResolvedValue([]);
    // il test di prima lascia l'area dello staff nel mock: qui le liste vuote si dicono, e si aspetta che le promesse siano risolte
    api.getAreeCitta.mockReset().mockResolvedValue([]);
    api.getDaCollocare.mockReset().mockResolvedValue([]);
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    await waitFor(() => expect(api.getDaCollocare).toHaveBeenCalled());
    await Promise.all([api.getAreeCitta.mock.results[0]?.value, api.getDaCollocare.mock.results[0]?.value]);
    await screen.findByRole('heading', { level: 1 });
    expect(screen.queryByRole('region', { name: 'Aree della città' })).toBeNull();
    expect(screen.queryByText(/Planimetrie da collocare/)).toBeNull();
  });

  // R6 (validatore L2, giro 1) e FUN2-9: la lista non vuota, la finestra «Colloca» che propone il quartiere del genitore (non il
  // primo dell'elenco: per una planimetria di Kichijoji proponeva Yongen-Jaya), l'invio e la lista riletta
  it('«Colloca» propone il quartiere del genitore con le sue aree, invia a collocaPlanimetria e rilegge la lista', async () => {
    api.getQuartieri.mockResolvedValue([
      { chiave: 'yongen-jaya', nome: 'Yongen-Jaya', mappaChiave: 'citta-yongen-jaya', luoghi: 0, verificati: 0, sblocco: null, descrizione: '' },
      { chiave: 'kichijoji', nome: 'Kichijoji', mappaChiave: 'citta-kichijoji', luoghi: 0, verificati: 0, sblocco: null, descrizione: '' },
    ] as QuartiereRiassuntoDto[]);
    api.getAreeCitta.mockReset().mockResolvedValue([]);
    const sciolta: MappaDaCollocareDto = { chiave: 'kichijoji-negozio', nome: 'Negozio di dischi', genitore: 'citta-kichijoji', genitoreNome: 'Kichijoji', numeroSpilli: 2, immagineUrl: null, asset: null };
    api.getDaCollocare.mockReset().mockResolvedValueOnce([sciolta]).mockResolvedValue([]);
    // le aree del quartiere scelto: Kichijoji ha la Piazza, Yongen-Jaya i Vicoli
    api.getQuartiere.mockImplementation(async (k: string) => ({ chiave: k, nome: k, aree: k === 'kichijoji' ? [{ slug: 'piazza', nome: 'Piazza' }] : [{ slug: 'vicoli', nome: 'Vicoli' }] }));
    api.collocaPlanimetria.mockReset().mockResolvedValue({});
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    const lista = await screen.findByRole('group', { name: 'Planimetrie da collocare' });
    expect(within(lista).getByText('Planimetrie da collocare (1)')).toBeInTheDocument();
    expect(within(lista).getByText('Kichijoji · 2 pin')).toBeInTheDocument();
    fireEvent.click(within(lista).getByRole('button', { name: /Colloca/ }));
    const finestra = await screen.findByRole('dialog', { name: 'Colloca Negozio di dischi' });
    // il quartiere proposto è quello del genitore, e le aree offerte sono le sue
    expect(valoreSelettore('Quartiere', finestra)).toBe('Kichijoji');
    await waitFor(() => expect(api.getQuartiere).toHaveBeenCalledWith('kichijoji'));
    await waitFor(() => expect(within(finestra).getByRole('combobox', { name: 'Area' })).toBeEnabled());
    expect(vociSelettore('Area', finestra)).toEqual(['Piazza', 'Un’area nuova…']);
    scegliVoce('Area', 'Piazza', finestra);
    fireEvent.change(within(finestra).getByRole('textbox', { name: /Etichetta della planimetria/ }), { target: { value: 'Interno' } });
    fireEvent.click(within(finestra).getByRole('button', { name: 'Colloca' }));
    await waitFor(() => expect(api.collocaPlanimetria).toHaveBeenCalledWith({ mappa: 'kichijoji-negozio', quartiere: 'kichijoji', area: 'piazza', etichetta: 'Interno' }));
    // collocata: la finestra si chiude e la lista, riletta vuota, sparisce
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(api.getDaCollocare).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.queryByText(/Planimetrie da collocare/)).toBeNull());
  });

  it('«Colloca» per una planimetria il cui genitore non è un quartiere propone il primo quartiere', async () => {
    api.getQuartieri.mockResolvedValue([
      { chiave: 'yongen-jaya', nome: 'Yongen-Jaya', mappaChiave: 'citta-yongen-jaya', luoghi: 0, verificati: 0, sblocco: null, descrizione: '' },
      { chiave: 'kichijoji', nome: 'Kichijoji', mappaChiave: 'citta-kichijoji', luoghi: 0, verificati: 0, sblocco: null, descrizione: '' },
    ] as QuartiereRiassuntoDto[]);
    api.getAreeCitta.mockReset().mockResolvedValue([]);
    api.getDaCollocare.mockReset().mockResolvedValue([{ chiave: 'tokyo-torre', nome: 'Torre', genitore: 'tokyo', genitoreNome: 'Tokyo', numeroSpilli: 0, immagineUrl: null, asset: null }]);
    api.getQuartiere.mockImplementation(async (k: string) => ({ chiave: k, nome: k, aree: [] }));
    render(<MemoryRouter><CittaPage /></MemoryRouter>);
    fireEvent.click(within(await screen.findByRole('group', { name: 'Planimetrie da collocare' })).getByRole('button', { name: /Colloca/ }));
    const finestra = await screen.findByRole('dialog', { name: 'Colloca Torre' });
    expect(valoreSelettore('Quartiere', finestra)).toBe('Yongen-Jaya');
  });
});

describe('QuartierePage', () => {
  it('mostra la mappa del quartiere incorporata e i luoghi senza i pulsanti di posizionamento (ora nell’editor)', async () => {
    // `mappaChiave` la dà il backend (cittaService), non la costruisce la pagina: il mock deve dirla
    const q: QuartiereDettaglioDto = { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', sblocco: null, fonte: '', descrizione: '', mappa: true, illustrazione: { immagineUrl: null, asset: null }, aree: [],
      luoghi: [{ chiave: 'shibuya/untouchable', ordine: 0, tipo: 'negozio', nome: 'Untouchable', cosaOffre: 'Armi', quando: 'entrambe', giorni: [], giorniTesto: '', sblocco: null, confidenti: [{ chiave: 'iwai', nome: 'Munehisa Iwai' }], attivita: [], negozi: [{ chiave: 'untouchable', nome: 'Untouchable' }], negozio: 'untouchable', origine: 'seed', piatti: null, note: null, verificato: true, marcatore: null, condizioni: null, disponibilita: null } as QuartiereDettaglioDto['luoghi'][number]] };
    api.getQuartiere.mockResolvedValue(q);
    api.getMappa.mockResolvedValue(mappa('citta-shibuya', 'Shibuya'));
    render(<MemoryRouter initialEntries={['/guida/citta/shibuya']}><Routes><Route path="/guida/citta/:chiave" element={<QuartierePage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('application', { name: 'Quartiere: Tokyo › Shibuya' })).toBeInTheDocument();
    expect(api.getMappa).toHaveBeenCalledWith('citta-shibuya', undefined);
    const luoghi = within(screen.getByRole('list', { name: 'Luoghi' }));
    expect(luoghi.getByText('Untouchable')).toBeInTheDocument();
    expect(luoghi.queryByRole('button', { name: /Posiziona/ })).not.toBeInTheDocument();
    // il modulo del luogo si apre da qui: «Aggiungi un luogo» nella sezione e «Correggi» in ogni card (voce 11)
    expect(within(screen.getByRole('region', { name: 'Luoghi del quartiere' })).getByRole('button', { name: /Aggiungi un luogo/ })).toBeInTheDocument();
    expect(luoghi.getByRole('button', { name: /Correggi/ })).toBeInTheDocument();
    expect(luoghi.getByRole('link', { name: 'Articoli in vendita' })).toHaveAttribute('href', '/guida/negozi/untouchable');
    expect(api.scaricaPiantaQuartiere).not.toHaveBeenCalled();
  });

  it('l’intestazione mostra l’illustrazione del quartiere con la sagoma sopra; senza, la sagoma grande (L1, 2026-10-20)', async () => {
    const q = { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', sblocco: null, fonte: '', descrizione: '', mappa: true, aree: [], pianta: null, piantaAssente: null, luoghi: [] } as Omit<QuartiereDettaglioDto, 'illustrazione'>;
    api.getQuartiere.mockResolvedValue({ ...q, illustrazione: { immagineUrl: '/api/immagini/mappa/citta-shibuya/file?v=3', asset: 'mappe/citta-shibuya' } });
    api.getMappa.mockResolvedValue(mappa('citta-shibuya', 'Shibuya'));
    const con = render(<MemoryRouter initialEntries={['/guida/citta/shibuya']}><Routes><Route path="/guida/citta/:chiave" element={<QuartierePage />} /></Routes></MemoryRouter>);
    const intestazione = within((await screen.findByRole('heading', { name: 'Shibuya' })).closest('header')!);
    const figura = intestazione.getByAltText('Illustrazione di Shibuya');
    expect(figura).toHaveAttribute('src', '/api/immagini/mappa/citta-shibuya/file?v=3&l=320');
    expect(figura).toHaveAttribute('sizes', '(min-width: 1024px) 200px, (min-width: 640px) 220px, min(420px, calc(100vw - 64px))');
    expect(figura.parentElement!.querySelector('.illustrazione-segno__segno img')).toHaveAttribute('src', SEGNI[0][1]);
    con.unmount();
    api.getQuartiere.mockResolvedValue({ ...q, illustrazione: { immagineUrl: null, asset: null } });
    render(<MemoryRouter initialEntries={['/guida/citta/shibuya']}><Routes><Route path="/guida/citta/:chiave" element={<QuartierePage />} /></Routes></MemoryRouter>);
    const senza = within((await screen.findByRole('heading', { name: 'Shibuya' })).closest('header')!);
    expect(senza.queryByAltText('Illustrazione di Shibuya')).toBeNull();
    expect(senza.getByAltText('Sagoma di Shibuya sulla mappa di Tokyo')).toBeInTheDocument();
  });

  // Superato dal lotto L11 (R11-02/8, migrazione 210): lo scarico automatico della pianta all'apertura del quartiere non esiste più.
  it.skip('lo scarico automatico della pianta su una mappa con pezzi (409 `mappa-con-pezzi`, L1 F5) non sostituisce niente e non mostra errori', async () => {
    const q = { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', sblocco: null, fonte: '', descrizione: '', mappa: false, illustrazione: { immagineUrl: null, asset: null }, aree: [],
      pianta: { url: 'https://esempio.test/shibuya.png', fonte: 'Guida', pagina: null }, piantaAssente: null, luoghi: [] } as unknown as QuartiereDettaglioDto;
    api.getQuartiere.mockResolvedValue(q);
    api.getMappa.mockResolvedValue(mappa('citta-shibuya', 'Shibuya'));
    api.scaricaPiantaQuartiere.mockRejectedValue(new ApiError(409, 'mappa-con-pezzi', 'La mappa ha 2 pezzi ritagliati dall’immagine.', { pezzi: 2 }));
    render(<MemoryRouter initialEntries={['/guida/citta/shibuya']}><Routes><Route path="/guida/citta/:chiave" element={<QuartierePage />} /></Routes></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Shibuya' })).toBeInTheDocument();
    await waitFor(() => expect(api.scaricaPiantaQuartiere).toHaveBeenCalledWith('shibuya'));
    // nessuna conferma da qui (sostituire è una scelta dell'editor) e nessun «Riprova», che c'è solo se lo scarico fallisce davvero
    expect(api.scaricaPiantaQuartiere).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText(/scaricamento in corso/)).toBeNull());
    expect(screen.queryByRole('button', { name: /Riprova/ })).toBeNull();
    expect(screen.queryByText(/2 pezzi ritagliati/)).toBeNull();
  });

  // ---- L'area d'ingresso nella sua finestra (L2, 2026-10-20; decisione del PM su R2-15 e R2-22) ----
  const conIngresso = { chiave: 'shibuya', nome: 'Shibuya', mappaChiave: 'citta-shibuya', sblocco: null, fonte: '', descrizione: '', mappa: true, illustrazione: { immagineUrl: null, asset: null }, aree: [], pianta: null, piantaAssente: null, luoghi: [],
    ingresso: { mappa: 'shibuya-central-street', nome: 'Central Street', x: 41, y: 63, zoom: 2, area: { slug: 'central-street', nome: 'Central Street' } } } as unknown as QuartiereDettaglioDto;
  /** L'indirizzo corrente sotto la pagina, per vedere che «Chiudi» toglie `ingresso=1`. */
  function Indirizzo() { const l = useLocation(); return <p data-testid="indirizzo">{l.pathname}{l.search}</p>; }
  const montaQuartiere = (indirizzo: string) => render(<MemoryRouter initialEntries={[indirizzo]}><Routes><Route path="/guida/citta/:chiave" element={<><QuartierePage /><Indirizzo /></>} /></Routes></MemoryRouter>);

  it('dalla metro (`?ingresso=1`) si apre la finestra dell’area d’ingresso; «Apri l’area» porta alla sua pagina sul punto, «Chiudi» toglie il parametro', async () => {
    api.getQuartiere.mockResolvedValue(conIngresso);
    api.getMappa.mockImplementation(async (k: string) => mappa(k, k === 'citta-shibuya' ? 'Shibuya' : 'Central Street'));
    montaQuartiere('/guida/citta/shibuya?ingresso=1');
    const finestra = within(await screen.findByRole('dialog', { name: 'Central Street — ingresso di Shibuya' }));
    expect(finestra.getByRole('link', { name: 'Apri l’area' })).toHaveAttribute('href', '/guida/citta/shibuya/central-street?x=41&y=63&zoom=2');
    await waitFor(() => expect(api.getMappa).toHaveBeenCalledWith('shibuya-central-street', undefined));
    // il pulsante «Chiudi» fra le azioni (la × della finestra ha lo stesso nome)
    fireEvent.click(finestra.getAllByRole('button', { name: 'Chiudi' }).find((b) => b.textContent === 'Chiudi')!);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByTestId('indirizzo')).toHaveTextContent(/^\/guida\/citta\/shibuya$/);
  });

  it('con uno spillo nell’indirizzo vince lo spillo: la finestra d’ingresso non si apre, e «Entra» la apre a richiesta', async () => {
    api.getQuartiere.mockResolvedValue(conIngresso);
    api.getMappa.mockImplementation(async (k: string) => mappa(k, 'Shibuya'));
    montaQuartiere('/guida/citta/shibuya?ingresso=1&spillo=1');
    const entra = await screen.findByRole('button', { name: /Entra: Central Street/ });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(entra);
    expect(await screen.findByRole('dialog', { name: 'Central Street — ingresso di Shibuya' })).toBeInTheDocument();
  });

  it('UX2-6: sul telefono il visore dell’illustrazione è alto quanto la figura (classe dell’ospite, proporzione dal visore)', async () => {
    api.getQuartiere.mockResolvedValue(conIngresso);
    api.getMappa.mockImplementation(async (k: string) => mappa(k, 'Shibuya'));
    montaQuartiere('/guida/citta/shibuya');
    const visore = await screen.findByTestId('visore-mappa');
    expect(visore.parentElement).toHaveClass('visore-alto-quanto-immagine');
    expect(visore.style.getPropertyValue('--proporzione-immagine')).toBe('1000 / 600');
  });

  it('un quartiere senza ingresso (Kichijoji): dalla metro nessuna finestra, niente «Entra», «Ingresso» da scegliere', async () => {
    api.getQuartiere.mockResolvedValue({ ...conIngresso, chiave: 'kichijoji', nome: 'Kichijoji', mappaChiave: 'citta-kichijoji', ingresso: null });
    api.getMappa.mockImplementation(async (k: string) => mappa(k, 'Kichijoji'));
    montaQuartiere('/guida/citta/kichijoji?ingresso=1');
    expect(await screen.findByRole('heading', { name: 'Kichijoji' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('button', { name: /Entra/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Ingresso/ })).toHaveTextContent('da scegliere');
  });
});
