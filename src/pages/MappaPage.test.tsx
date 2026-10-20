/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test MappaPage — la pagina delle mappe: indice delle radici, visore con la partita attiva e stato «raccolto» (Fase 13.2),
// «Chiudi», «Torna alla partita» (verso la pagina Partita, scheda Oggi, solo con una partita attiva) e riletture in silenzio
// ============================================================

import { usePreferenzeStore } from '../stores/preferenzeStore';
import { useAssetStore } from '../stores/assetStore';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { scegliVoce } from '../../test/selettore';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import type { ContenutiMappaDto } from '../../shared/organizzazioneMappe';
import { MappaPage } from './MappaPage';
import { annotaNavigazione } from '../utils/ritornoMappe';
import { usePartitaStore } from '../stores/partitaStore';
import type { MappaDto, MappaRiassuntoDto, PartitaDto, SpilloDto } from '../types';

const { risolviMappa, getContenutiMappa, getAlberoMappe, getConteggiAlbero, getMappa, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto } = vi.hoisted(() => ({ getConteggiAlbero: vi.fn(), risolviMappa: vi.fn(async (mappa: string): Promise<{ tipo: string; mappa: string; casa?: string }> => ({tipo:'mappa',mappa})), getContenutiMappa: vi.fn(async (mappa: string): Promise<ContenutiMappaDto> => ({mappa,aree:[]})), getAlberoMappe: vi.fn(), getMappa: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn() }));
vi.mock('../services/api', (vero) => moduloApi(vero, { risolviMappa, getContenutiMappa, getAlberoMappe, getConteggiAlbero, getMappa, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto }));

/** Il riassunto di una mappa senza genitore, spilli né figli, con chiave, nome e tipo (e il resto) presi da `extra`. */
const riassunto = (extra: Partial<MappaRiassuntoDto> & { chiave: string; nome: string; tipo: MappaRiassuntoDto['tipo'] }): MappaRiassuntoDto => ({ genitore: null, nomeRivisto: false, ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'seed', numeroSpilli: 0, numeroFigli: 0, updatedAt: '', area: null, casa: `/guida/mappe/${encodeURIComponent(extra.chiave)}`, ...extra });
const albero: MappaRiassuntoDto[] = [
  riassunto({ chiave: 'tokyo', nome: 'Tokyo', tipo: 'citta', numeroFigli: 1, asset: 'mappe/tokyo' }),
  riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', numeroSpilli: 2 }),
  riassunto({ chiave: 'dungeon-kamoshida', nome: 'Palazzo di Kamoshida', tipo: 'palazzo', numeroFigli: 1 }),
  riassunto({ chiave: 'kamoshida-01', nome: 'Ingresso', tipo: 'area', genitore: 'dungeon-kamoshida', numeroSpilli: 5 }),
];
const forziere: SpilloDto = { id: 4, mappaChiave: 'citta-shibuya', tipo: 'forziere', tipoNome: 'Forziere', colore: '#eab308', nome: 'Scrigno', descrizione: '', x: 30, y: 40, riferimento: null, collezionabile: true, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, voci: [], condizioni: [], immagini: [], updatedAt: '' };
const dettaglio: MappaDto = { ...riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', numeroSpilli: 2, immagineUrl: '/pianta-test.png' }), larghezza: 800, altezza: 600, note: '', genitoreNome: 'Tokyo', percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: 'Shibuya' }], figli: [], arrivi: [], pezzi: [], spilli: [forziere, { ...forziere, id: 5, nome: 'Passaggio', tipo: 'passaggio', tipoNome: 'Passaggio', collezionabile: false, x: 60, y: 60 }, { ...forziere, id: 6, nome: 'Tesoro del Palazzo', tipo: 'tesoro-palazzo', tipoNome: 'Tesoro del Palazzo', x: 70, y: 20, voci: [{ chiave: 'kamoshida-01/2', tipo: 'tesoro', nome: 'Tesoro del Palazzo', descrizione: '', esauribile: false, dungeon: 'kamoshida', area: 'kamoshida-01', areaDedalo: null, stato: null }] }] };
/** Il Palazzo di Kamoshida come luogo senza pianta: elenca le sue planimetrie, con «Scheda del Palazzo» e «Modifica mappa». */
const senzaPianta: MappaDto = { ...dettaglio, chiave: 'dungeon-kamoshida', nome: 'Palazzo di Kamoshida', tipo: 'palazzo', genitore: null, immagineUrl: null, asset: null, figli: [albero[3]], spilli: [], percorso: [{ chiave: 'dungeon-kamoshida', nome: 'Palazzo di Kamoshida' }], entita: { tipo: 'dungeon', chiave: 'kamoshida' } };

/** La pagina Partita finta: il titolo e la scheda chiesta nell'indirizzo, per vedere dove arriva «Torna alla partita». */
function PaginaPartita() {
  const scheda = new URLSearchParams(useLocation().search).get('scheda');
  return <><h1>Pagina di partenza</h1><p>scheda: {scheda ?? 'nessuna'}</p></>;
}

/** Monta la pagina delle mappe all'indirizzo `percorso`, con le rotte finte della Città e della pagina Partita (`/partita`,
 *  da cui si apre la mappa e a cui porta «Torna alla partita») per verificare dove portano i collegamenti e «Chiudi». */
/** La casa di una mappa del mondo raggiunta dal reindirizzamento: scrive l'indirizzo con i parametri. */
function CasaRaggiunta() { const l = useLocation(); return <p>Casa: {l.pathname}{l.search}</p>; }
function monta(percorso: string) {
  render(
    <MemoryRouter initialEntries={[percorso]}>
      <Routes>
        <Route path="/guida/mappe" element={<MappaPage />} />
        <Route path="/guida/mappe/:chiave" element={<MappaPage />} />
        {/* La Città vera monta la mappa disegnata e chiama l'API: qui serve solo sapere che ci
            si arriva, non rifarla. */}
        <Route path="/guida/citta" element={<h1>La città</h1>} />
        {/* le case del mondo (L2): un quartiere o un'Area; qui basta sapere a quale indirizzo si arriva */}
        <Route path="/guida/citta/*" element={<CasaRaggiunta />} />
        {/* la pagina da cui si è aperta la mappa: «Chiudi» ci riporta qui; «Torna alla partita» ci porta sulla scheda Oggi */}
        <Route path="/partita" element={<PaginaPartita />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
    usePreferenzeStore.setState({graficaPredefinita:true});
    useAssetStore.setState({manifest:null,caricato:true,mancanti:{}});
    risolviMappa.mockReset().mockImplementation(async (mappa:string)=>({tipo:'mappa',mappa}));
    getContenutiMappa.mockReset().mockImplementation(async (mappa:string)=>({mappa,aree:[]}));
    getAlberoMappe.mockReset(); getMappa.mockReset(); impostaSpilloRaccolto.mockReset(); impostaStatoPunto.mockReset(); impostaAcquisto.mockReset();
    getAlberoMappe.mockResolvedValue(albero);
    // E2 (L3): i conteggi dei pin dell'albero intero, dal server
    getConteggiAlbero.mockReset().mockResolvedValue({ conteggiPin: { contenuto: 5, passaggi: 1, note: 1 } });
    getMappa.mockResolvedValue(dettaglio);
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
  });

describe('MappaPage', () => {
  it('«Chiudi» del visore torna alla pagina da cui si era aperta la mappa; senza, all’elenco delle mappe', async () => {
    annotaNavigazione('/partita?scheda=oggi', '/guida/mappe/citta-shibuya');
    monta('/guida/mappe/citta-shibuya');
    fireEvent.click(await screen.findByRole('button', { name: /^Chiudi/ }));
    expect(await screen.findByRole('heading', { name: 'Pagina di partenza' })).toBeInTheDocument();
  });

  it('«Torna alla partita» porta alla pagina Partita, sulla scheda Oggi, e sta subito prima di «Chiudi» (2026-10-04)', async () => {
    annotaNavigazione('/guida/citta', '/guida/mappe/citta-shibuya');
    monta('/guida/mappe/citta-shibuya');
    const torna = await screen.findByRole('link', { name: /^Torna alla partita/ });
    // nella barra del visore: dopo «Pannello», prima di «Chiudi»
    const strumenti = torna.closest('.visore-mappa__strumenti')!;
    const nomi = [...strumenti.querySelectorAll('a, button')].map((e) => e.textContent?.trim());
    expect(nomi.slice(-3)).toEqual([expect.stringMatching(/[Pp]annello$/), 'Torna alla partita', 'Chiudi']);
    fireEvent.click(torna);
    expect(await screen.findByRole('heading', { name: 'Pagina di partenza' })).toBeInTheDocument();
    expect(screen.getByText('scheda: oggi')).toBeInTheDocument();
  });

  it('senza partita attiva «Torna alla partita» non c’è nel visore', async () => {
    usePartitaStore.setState({ attiva: null });
    monta('/guida/mappe/citta-shibuya');
    expect(await screen.findByRole('button', { name: /^Chiudi/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Torna alla partita/ })).toBeNull();
  });

  it('nel luogo senza pianta «Torna alla partita» sta dopo «Scheda del Palazzo» e «Modifica mappa» e porta alla pagina Partita, scheda Oggi', async () => {
    getMappa.mockResolvedValue(senzaPianta);
    monta('/guida/mappe/dungeon-kamoshida');
    const torna = await screen.findByRole('link', { name: /^Torna alla partita/ });
    // i comandi del luogo: il ritorno è l'ultimo
    expect([...torna.parentElement!.querySelectorAll('a, button')].map((e) => e.textContent?.trim())).toEqual(['Scheda del Palazzo', 'Modifica mappa', 'Torna alla partita']);
    fireEvent.click(torna);
    expect(await screen.findByRole('heading', { name: 'Pagina di partenza' })).toBeInTheDocument();
    expect(screen.getByText('scheda: oggi')).toBeInTheDocument();
  });

  // L0 (2026-10-20): la mappa dei Memento è dei Memento, non di un Palazzo, e non ha planimetrie da aggiungere
  it('la mappa dei Memento dice «Scheda dei Memento», è di tipo «Memento» e non chiede planimetrie', async () => {
    getAlberoMappe.mockResolvedValue([]);
    getMappa.mockResolvedValue({ ...senzaPianta, chiave: 'dungeon-mementos', nome: 'Memento', tipo: 'dedalo', figli: [], percorso: [{ chiave: 'dungeon-mementos', nome: 'Memento' }], entita: { tipo: 'dungeon', chiave: 'mementos' } });
    monta('/guida/mappe/dungeon-mementos');
    expect(await screen.findByRole('link', { name: 'Scheda dei Memento' })).toHaveAttribute('href', '/guida/dungeon/mementos');
    expect(screen.getByText('Memento', { selector: '.chip' })).toBeInTheDocument();
    expect(await screen.findByText('I Memento non hanno planimetrie: i piani si generano a ogni discesa, e i dedali stanno nella loro scheda.')).toBeInTheDocument();
    expect(screen.queryByText(/Puoi aggiungerne una dall’editor/)).toBeNull();
    // niente conteggio di planimetrie né «raccoglie le mappe qui sotto»: sotto non ce ne sono
    expect(screen.queryByText(/nessuna planimetria/)).toBeNull();
    expect(screen.queryByText(/raccoglie le mappe qui sotto/)).toBeNull();
  });

  it('senza partita attiva «Torna alla partita» non c’è nel luogo senza pianta', async () => {
    usePartitaStore.setState({ attiva: null });
    getMappa.mockResolvedValue(senzaPianta);
    monta('/guida/mappe/dungeon-kamoshida');
    expect(await screen.findByRole('link', { name: /^Modifica mappa/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Torna alla partita/ })).toBeNull();
  });

  it('aperta direttamente, «Chiudi» porta all’elenco delle mappe come prima', async () => {
    // nessuna pagina prima: si parte da fuori dalle mappe (annotazione cancellata) e si apre la mappa col primo caricamento
    annotaNavigazione(null, '/home');
    annotaNavigazione(null, '/guida/mappe/citta-shibuya');
    monta('/guida/mappe/citta-shibuya');
    fireEvent.click(await screen.findByRole('button', { name: /^Chiudi/ }));
    expect(await screen.findByRole('button', { name: /^Tokyo/ })).toBeInTheDocument();
  });

  it('l’indice apre una radice nel pannello e ne mostra le mappe', async () => {
    monta('/guida/mappe');
    // Le radici sono **scelte**, non collegamenti: aprono il pannello a fianco. Finché non se ne
    // sceglie una, delle mappe contenute non c'è traccia nella pagina — prima stavano tutte lì,
    // nascoste dentro una piega dentro la carta, e aprirla faceva crescere una cella della
    // griglia di quarantasei righe.
    const tokyo = await screen.findByRole('button', { name: /^Tokyo/ });
    expect(screen.queryByRole('link', { name: /Shibuya/ })).toBeNull();
    fireEvent.click(tokyo);
    const pannello = within(screen.getByRole('region', { name: 'Dentro Tokyo' }));
    // Aprire la mappa è un gesto distinto dallo sbirciare che cosa contiene, e per Tokyo la mappa
    // è quella disegnata della Città. Il gesto porta il nome del posto (L2, M6, 2026-10-20): «Apri Tokyo», non «Apri la mappa di…»
    expect(pannello.getByRole('link', { name: 'Apri Tokyo' })).toHaveAttribute('href', '/guida/citta');
    expect(within(screen.getByRole('list', { name: 'Contenuto di Tokyo' })).getByRole('link', { name: /Shibuya/ })).toHaveAttribute('href', '/guida/mappe/citta-shibuya');
    // Una radice per volta: aprendone un'altra, la prima si chiude.
    fireEvent.click(screen.getByRole('button', { name: /^Palazzo di Kamoshida/ }));
    expect(screen.queryByRole('region', { name: 'Dentro Tokyo' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Contenuto di Palazzo di Kamoshida' })).getByRole('link', { name: /Ingresso/ })).toBeInTheDocument();
  });

  // R1 (L2, decisione del PM): il segno «Da verificare» si vede nell'indice senza aprire niente — sulla carta di Tokyo nella griglia, un
  // chip «1 da verificare» che porta all'area dello staff; la carta resta il pulsante che apre il pannello
  it('R1: la carta di Tokyo dice «1 da verificare» senza aprire niente, e il chip porta all’area da verificare', async () => {
    const staff = (chiave: string, versioneOrdine: number) => riassunto({ chiave, nome: 'Area riservata allo staff', tipo: 'area', genitore: 'tokyo',
      area: { chiave: 'citta/tokyo/staff', contenitore: { tipo: 'citta', chiave: 'tokyo', nome: 'Tokyo' }, slug: 'staff', nome: 'Area riservata allo staff', versioneEtichetta: null, versioneOrdine, predefinita: versioneOrdine === 0, casa: '/guida/citta/tokyo/staff', daVerificare: true } });
    getAlberoMappe.mockResolvedValue([...albero, staff('staff', 0), staff('staff-ovest', 1)]);
    monta('/guida/mappe');
    const tokyo = await screen.findByRole('button', { name: /^Tokyo/ });
    // due planimetrie della stessa area: un'area sola da verificare
    const chip = screen.getByRole('link', { name: '1 da verificare: Area riservata allo staff' });
    expect(chip).toHaveAttribute('href', '/guida/citta/tokyo/staff');
    expect(chip).toHaveClass('chip', 'chip--attivo', 'touch');
    expect(chip).toHaveTextContent('1 da verificare');
    // il Palazzo non ha aree da verificare: niente chip
    expect(screen.getAllByRole('link', { name: /da verificare/ })).toHaveLength(1);
    // la carta apre ancora il pannello
    fireEvent.click(tokyo);
    expect(screen.getByRole('region', { name: 'Dentro Tokyo' })).toBeInTheDocument();
  });

  // E4 (analisi dell'Elenco delle mappe, L2): la carta di Tokyo conta quartieri e aree, non le righe di `mappa` («52 mappe» = 23 quartieri
  // + 29 planimetrie); le versioni di un'Area contano una volta
  it('E4: la carta di Tokyo dice «N quartieri · N aree», non le mappe', async () => {
    const area = (chiave: string, slug: string, nome: string, genitore: string, versioneOrdine: number) => riassunto({ chiave, nome, tipo: 'area', genitore,
      area: { chiave: `citta/${genitore}/${slug}`, contenitore: { tipo: 'quartiere', chiave: genitore, nome: genitore }, slug, nome, versioneEtichetta: null, versioneOrdine, predefinita: versioneOrdine === 0, casa: `/guida/citta/${genitore}/${slug}` } });
    getAlberoMappe.mockResolvedValue([...albero, area('sottopasso', 'sottopasso', 'Sottopasso', 'citta-shibuya', 0), area('sottopasso-est', 'sottopasso', 'Sottopasso', 'citta-shibuya', 1), area('diner', 'diner', 'Diner', 'citta-shibuya', 0)]);
    monta('/guida/mappe');
    const tokyo = await screen.findByRole('button', { name: /^Tokyo/ });
    expect(tokyo).toHaveTextContent('1 quartiere · 2 aree');
    expect(tokyo).not.toHaveTextContent(/mappe/);
    // dal rilascio di L3 la parola dell'indice è «pin»; E3: la carta di un Palazzo dice aree e planimetrie
    expect(document.body).not.toHaveTextContent(/spill/);
  });

  // E2 (L3, deciso dall'utente): l'indice conta i pin di contenuto e, accanto, passaggi e note; i numeri vengono dal server
  // (`conteggiPin` di ogni nodo, `/albero/conteggi` per tutto l'albero), il FE non somma
  it('E2: intestazione «N pin · più N passaggi e N note» e carte coi soli pin di contenuto, dal server', async () => {
    getAlberoMappe.mockResolvedValue(albero.map((m) => (m.chiave === 'tokyo' ? { ...m, conteggiPin: { contenuto: 9, passaggi: 4, note: 2 } }
      : m.chiave === 'dungeon-kamoshida' ? { ...m, conteggiPin: { contenuto: 3, passaggi: 1, note: 1 } } : m)));
    getConteggiAlbero.mockResolvedValue({ conteggiPin: { contenuto: 819, passaggi: 695, note: 228 } });
    monta('/guida/mappe');
    expect(await screen.findByText(/819 pin · più 695 passaggi e 228 note/)).toBeInTheDocument();
    const tokyo = await screen.findByRole('button', { name: /^Tokyo/ });
    expect(tokyo).toHaveTextContent('Città · 9 pin · 1 quartiere');
    const kamoshida = screen.getByRole('button', { name: /^Palazzo di Kamoshida/ });
    expect(kamoshida).toHaveTextContent('Palazzo · 3 pin ·');
    // passaggi e note della radice nel suggerimento della riga dei conteggi
    expect(within(kamoshida).getByTitle('3 pin · più 1 passaggio e 1 nota')).toBeInTheDocument();
  });

  // UX3-8 (L3, segnalazione dell'utente: «ho aggiunto una planimetria di prova» e non la trovava): un'Area o planimetria con un nome
  // vero resta nella griglia anche senza pin, con «nessun pin»; il gruppo chiuso è solo per i fogli dell'estrazione senza nome e senza pin
  it('UX3-8: la planimetria senza pin con un nome vero sta nella griglia; chiusi solo i fogli dell’estrazione senza nome', async () => {
    const tecnico = 'Palazzo di Kamoshida — Immagini native che nessun campo usa';
    getAlberoMappe.mockResolvedValue([...albero.slice(0, 3), { ...albero[3], ordine: 0 },
      riassunto({ chiave: 'foglio-con-pin', nome: tecnico, tipo: 'area', genitore: 'dungeon-kamoshida', numeroSpilli: 3, ordine: 1 }),
      riassunto({ chiave: 'prova', nome: 'Prova', tipo: 'area', genitore: 'dungeon-kamoshida', origine: 'utente', ordine: 2 }),
      riassunto({ chiave: 'foglio-vuoto', nome: tecnico, tipo: 'area', genitore: 'dungeon-kamoshida', ordine: 3 })]);
    monta('/guida/mappe');
    fireEvent.click(await screen.findByRole('button', { name: /^Palazzo di Kamoshida/ }));
    const griglia = within(screen.getByRole('list', { name: 'Contenuto di Palazzo di Kamoshida' }));
    const carte = griglia.getAllByRole('listitem');
    // prima le aree con un nome vero, nel loro ordine (con o senza pin), poi i fogli tecnici con pin
    // (decisione del PM dopo Test UX: i pin si dicono una volta sola, nel riquadro rosso accanto al titolo — «N pin», «1 pin», «nessun
    // pin» —, senza ripeterli nella riga sotto; i due fogli omonimi sono numerati)
    expect(carte.map((c) => c.textContent)).toEqual([expect.stringMatching(/^Ingresso5 pin$/), expect.stringMatching(/^Provanessun pin$/), expect.stringMatching(/^Planimetria non attribuita · \d3 pin$/)]);
    expect(carte.map((c) => c.querySelector('.chip.chip--attivo')?.textContent)).toEqual(['5 pin', 'nessun pin', '3 pin']);
    // il riquadro non sta sopra il disegno (copriva un angolo della pianta): sta nella riga del titolo
    expect(carte[0].querySelector('.relative .chip')).toBeNull();
    const gruppo = within(screen.getByRole('region', { name: 'Fogli dell’estrazione senza nome' }));
    const apri = gruppo.getByRole('button', { name: 'Mostra i fogli dell’estrazione senza nome · 1' });
    expect(apri).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(apri);
    expect(within(gruppo.getByRole('list', { name: 'Fogli dell’estrazione senza nome di Palazzo di Kamoshida' })).getAllByRole('listitem')).toHaveLength(1);
  });

  // UX2-15 (L2, segnalazione dell'utente): in Mappe una sola barra, quella della pagina. Il pannello del luogo non ha riquadri scorrevoli
  // suoi: né la griglia delle planimetrie né l'«Elenco completo», che crescono con la pagina
  it('UX2-15: il pannello del luogo non ha riquadri scorrevoli, né nella griglia né nell’«Elenco completo»', async () => {
    monta('/guida/mappe');
    fireEvent.click(await screen.findByRole('button', { name: /^Tokyo/ }));
    const pannello = screen.getByRole('region', { name: 'Dentro Tokyo' });
    fireEvent.click(within(pannello).getByText('Elenco dei quartieri e delle aree'));
    expect(pannello.querySelectorAll('.area-scorrevole')).toHaveLength(0);
    expect(pannello.querySelector('[class*="max-h-"]')).toBeNull();
  });

  // UX3-7 (L3, scelta (a) del FE): il titolo dell'elenco dice quel che c'è sotto — le aree di un Palazzo, i quartieri con le aree di
  // Tokyo —, non «con tutti i livelli», che prometteva versioni che sotto non ci sono
  it('UX3-7: l’elenco sotto la griglia si chiama come quel che contiene', async () => {
    monta('/guida/mappe');
    fireEvent.click(await screen.findByRole('button', { name: /^Palazzo di Kamoshida/ }));
    const pannello = within(screen.getByRole('region', { name: 'Dentro Palazzo di Kamoshida' }));
    expect(pannello.getByText('Elenco delle aree')).toBeInTheDocument();
    expect(screen.queryByText(/con tutti i livelli/)).toBeNull();
  });

  /** La seconda lettura della mappa (quella in silenzio dopo un'azione) resta in sospeso finché il test non la risolve. */
  const rilettura = () => {
    /** Risolutore della rilettura sospesa: vuoto finché la seconda `getMappa` non parte, poi quello della sua promessa. */
    let risolvi: (m: MappaDto) => void = () => {};
    getMappa.mockResolvedValueOnce(dettaglio).mockImplementationOnce(() => new Promise<MappaDto>((r) => { risolvi = r; }));
    return (m: MappaDto) => act(async () => { risolvi(m); });
  };

  it('il visore carica la mappa con la partita attiva e segna un collezionabile raccolto tramite l’API, poi rilegge la mappa in silenzio', async () => {
    impostaSpilloRaccolto.mockResolvedValue({ ...forziere, raccolto: true });
    const risolviRilettura = rilettura();
    monta('/guida/mappe/citta-shibuya');
    const spillo = await screen.findByRole('button', { name: 'Forziere: Scrigno' });
    expect(getMappa).toHaveBeenCalledWith('citta-shibuya', 7);
    fireEvent.click(spillo);
    // un forziere si «apre» (scelta dell'utente, 2026-10-03)
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Scrigno' })).getByRole('button', { name: 'Aperto' }));
    expect(impostaSpilloRaccolto).toHaveBeenCalledWith(7, 4, true);
    // subito, con la rilettura ancora in corso: lo spillo raccolto sparisce e il progresso passa a 1 su 2
    expect(await screen.findByText('1 di 2 raccolti · 50%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forziere: Scrigno' })).not.toBeInTheDocument();
    // poi la mappa si rilegge (lo stato di un pin può decidere la visibilità degli altri) e lo stato resta quello del server
    await waitFor(() => expect(getMappa).toHaveBeenCalledTimes(2));
    await risolviRilettura({ ...dettaglio, spilli: dettaglio.spilli.map((s) => (s.id === 4 ? { ...s, raccolto: true } : s)) });
    expect(screen.getByText('1 di 2 raccolti · 50%')).toBeInTheDocument();
  });

  it('un punto della Guida segnato «Ottenuto» dalla mappa aggiorna lo stato del punto e conta come raccolto', async () => {
    impostaStatoPunto.mockResolvedValue({ chiave: 'kamoshida-01/2', stato: 'ottenuto' });
    const risolviRilettura = rilettura();
    monta('/guida/mappe/citta-shibuya');
    fireEvent.click(await screen.findByRole('button', { name: 'Tesoro del Palazzo: Tesoro del Palazzo' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Tesoro del Palazzo' })).getByRole('button', { name: 'Ottenuto' }));
    expect(impostaStatoPunto).toHaveBeenCalledWith(7, 'kamoshida-01/2', 'ottenuto');
    expect(await screen.findByText('1 di 2 raccolti · 50%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tesoro del Palazzo: Tesoro del Palazzo' })).not.toBeInTheDocument();
    await waitFor(() => expect(getMappa).toHaveBeenCalledTimes(2));
    await risolviRilettura({ ...dettaglio, spilli: dettaglio.spilli.map((s) => (s.id === 6 ? { ...s, raccolto: true, voci: [{ ...s.voci[0], stato: 'ottenuto' }] } : s)) });
    expect(screen.getByText('1 di 2 raccolti · 50%')).toBeInTheDocument();
  });

  it('le condizioni sono assolute: anche un elemento fisso del gioco con condizioni che non valgono sparisce, come gli altri pin (2026-10-09)', async () => {
    const porta: SpilloDto = { ...forziere, id: 12, tipo: 'porta', tipoNome: 'Porta chiusa', nome: 'Porta del gioco', collezionabile: false, x: 20, y: 70, disponibilita: { stato: 'bloccato', requisiti: [] } };
    const negozio: SpilloDto = { ...forziere, id: 13, tipo: 'negozio', tipoNome: 'Negozio', nome: 'Bottega chiusa', collezionabile: false, x: 80, y: 70, disponibilita: { stato: 'bloccato', requisiti: [] } };
    getMappa.mockReset().mockResolvedValue({ ...dettaglio, spilli: [porta, negozio] });
    monta('/guida/mappe/citta-shibuya');
    // il conteggio dei nascosti conta tutti e due, e nessuno dei due è in vista
    const mostra = await screen.findByRole('button', { name: /Mostra anche i non ancora disponibili \(2\)/ });
    expect(screen.queryByRole('button', { name: /Porta chiusa: Porta del gioco/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Negozio: Bottega chiusa/ })).toBeNull();
    // ricompaiono, grigi, solo se lo si chiede
    fireEvent.click(mostra);
    expect(screen.getByRole('button', { name: 'Porta chiusa: Porta del gioco (non ancora disponibile)' })).toHaveClass('spillo-mappa--bloccato');
    expect(screen.getByRole('button', { name: 'Negozio: Bottega chiusa (non ancora disponibile)' })).toHaveClass('spillo-mappa--bloccato');
  });

  it('due azioni ravvicinate: la rilettura vecchia che arriva per ultima non sovrascrive quella nuova', async () => {
    const leva: SpilloDto = { ...forziere, id: 8, tipo: 'meccanismo', tipoNome: 'Meccanismo', nome: 'Leva', collezionabile: false, x: 20, y: 20 };
    const quadro: SpilloDto = { ...forziere, id: 10, tipo: 'punto-sensibile', tipoNome: 'Punto sensibile', nome: 'Quadro', collezionabile: false, x: 80, y: 20 };
    const prima: MappaDto = { ...dettaglio, spilli: [leva, quadro] };
    const risolutori: Array<(m: MappaDto) => void> = [];
    getMappa.mockReset().mockResolvedValueOnce(prima).mockImplementation(() => new Promise<MappaDto>((r) => { risolutori.push(r); }));
    impostaSpilloRaccolto.mockImplementation(async (_p: number, id: number) => ({ ...(id === 8 ? leva : quadro), raccolto: true }));
    monta('/guida/mappe/citta-shibuya');
    fireEvent.click(await screen.findByRole('button', { name: 'Meccanismo: Leva' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Leva' })).getByRole('button', { name: 'Azionato' }));
    await waitFor(() => expect(risolutori).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Punto sensibile: Quadro' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Quadro' })).getByRole('button', { name: 'Gestito' }));
    await waitFor(() => expect(risolutori).toHaveLength(2));
    // la rilettura nuova (leva e quadro segnati) arriva prima, quella vecchia (solo la leva) dopo: resta la nuova
    await act(async () => { risolutori[1]({ ...prima, spilli: [{ ...leva, raccolto: true }, { ...quadro, raccolto: true }] }); });
    await act(async () => { risolutori[0]({ ...prima, spilli: [{ ...leva, raccolto: true }, quadro] }); });
    expect(screen.getByRole('button', { name: 'Punto sensibile: Quadro (gestito)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Meccanismo: Leva (azionato)' })).toBeInTheDocument();
  });

  it('dopo un’azione la rilettura applica la visibilità calcolata dal server: un pin che dipendeva dallo stato appena segnato sparisce', async () => {
    // la porta è visibile solo finché la leva non è azionata (condizione «Pin di una mappa: non segnato»)
    const leva: SpilloDto = { ...forziere, id: 8, tipo: 'meccanismo', tipoNome: 'Meccanismo', nome: 'Leva', collezionabile: false, x: 20, y: 20 };
    const porta: SpilloDto = { ...forziere, id: 9, tipo: 'porta', tipoNome: 'Porta chiusa', nome: 'Porta del ponte', collezionabile: false, x: 80, y: 80 };
    const prima: MappaDto = { ...dettaglio, spilli: [leva, porta] };
    // (il server, nella rilettura, ha anche un nome nuovo per la leva: la sua copia vince su quella locale)
    getMappa.mockReset().mockResolvedValueOnce(prima).mockResolvedValueOnce({ ...prima, spilli: [{ ...leva, nome: 'Leva del ponte', raccolto: true }, { ...porta, disponibilita: { stato: 'bloccato', requisiti: [] } }] });
    impostaSpilloRaccolto.mockResolvedValue({ ...leva, raccolto: true });
    monta('/guida/mappe/citta-shibuya');
    fireEvent.click(await screen.findByRole('button', { name: 'Meccanismo: Leva' }));
    expect(screen.getByRole('button', { name: 'Porta chiusa: Porta del ponte' })).toBeInTheDocument();
    // il pulsante dice lo stato del meccanismo, non «Raccolto»
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Leva' })).getByRole('button', { name: 'Azionato' }));
    expect(impostaSpilloRaccolto).toHaveBeenCalledWith(7, 8, true);
    await waitFor(() => expect(screen.queryByRole('button', { name: /^Porta chiusa: Porta del ponte/ })).not.toBeInTheDocument());
    // la leva azionata resta sulla mappa (non è un collezionabile), segnata col suo stato, con la copia del server
    expect(screen.getByRole('button', { name: 'Meccanismo: Leva del ponte (azionato)' })).toBeInTheDocument();
  });
});

it('un contenitore senza immagine apre i luoghi figli senza una finta planimetria',async()=>{
  getAlberoMappe.mockResolvedValue(albero);
  getMappa.mockResolvedValue({...dettaglio,chiave:'dungeon-kamoshida',nome:'Palazzo di Kamoshida',immagineUrl:null,asset:null,figli:[albero[3]],spilli:[],percorso:[{chiave:'dungeon-kamoshida',nome:'Palazzo di Kamoshida'}]});
  monta('/guida/mappe/dungeon-kamoshida');
  expect(await screen.findByRole('heading',{name:'Palazzo di Kamoshida'})).toBeInTheDocument();
  expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
  expect(screen.getByRole('link',{name:/^Ingresso/})).toBeInTheDocument();
});

it('la planimetria di Tokyo non è più una destinazione: si finisce sulla mappa della Città',async()=>{
  // Prima qui si apriva un secondo visore di Tokyo, diverso da quello che il lettore aveva
  // appena guardato nella Città. Il reindirizzamento sta nella pagina e non solo nei
  // collegamenti perché i modi di arrivarci sono tanti: le briciole del visore, «Torna a
  // Tokyo», un indirizzo salvato.
  getAlberoMappe.mockResolvedValue(albero);
  monta('/guida/mappe/tokyo');
  expect(await screen.findByRole('heading',{name:'La città'})).toBeInTheDocument();
  expect(getMappa).not.toHaveBeenCalled();
});

it('anche un alias che risolve a Tokyo finisce sulla mappa della Città',async()=>{
  // `RisolviMappa` traduce le chiavi storiche: se l'alias arriva a `tokyo`, il rimbalzo deve
  // scattare dopo la risoluzione, non solo prima.
  getAlberoMappe.mockResolvedValue(albero);
  risolviMappa.mockResolvedValue({tipo:'mappa',mappa:'tokyo'});
  monta('/guida/mappe/mappa-globale');
  expect(await screen.findByRole('heading',{name:'La città'})).toBeInTheDocument();
  expect(getMappa).not.toHaveBeenCalled();
});

it('LAY2-5: da 1024 px lo spazio fra intestazione ed elenco è 12 px (a 1024×690 l’indice sforava di 3 px)', async () => {
  getAlberoMappe.mockResolvedValue(albero);
  monta('/guida/mappe');
  const elenco = await screen.findByRole('list', { name: 'Mappe' });
  expect(elenco.closest('div.flex-col')).toHaveClass('gap-4', 'lg:gap-3');
});

// ---- L2 (2026-10-20): ogni mappa ha una casa sola ----
it('un vecchio indirizzo di una planimetria porta alla sua casa (la pagina dell’Area sulla versione) con spillo e punto, senza aprire il visore', async () => {
  risolviMappa.mockResolvedValue({ tipo: 'mappa', mappa: 'shibuya-sottopasso-speciale', casa: '/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale' });
  monta('/guida/mappe/shibuya-sottopasso-speciale?spillo=7&x=10&y=20&zoom=2&altro=1');
  const arrivo = await screen.findByText(/^Casa: /);
  const url = new URL(arrivo.textContent!.replace('Casa: ', ''), 'http://x');
  expect(url.pathname).toBe('/guida/citta/shibuya/sottopasso');
  expect(Object.fromEntries(url.searchParams)).toEqual({ planimetria: 'shibuya-sottopasso-speciale', spillo: '7', x: '10', y: '20', zoom: '2' });
  expect(getMappa).not.toHaveBeenCalled();
});

it('un quartiere si apre nella sua pagina; una mappa la cui casa è il visore resta nel visore', async () => {
  risolviMappa.mockResolvedValueOnce({ tipo: 'mappa', mappa: 'citta-shibuya', casa: '/guida/citta/shibuya' });
  monta('/guida/mappe/citta-shibuya');
  expect(await screen.findByText('Casa: /guida/citta/shibuya')).toBeInTheDocument();
  cleanup();
  getAlberoMappe.mockResolvedValue(albero);
  getMappa.mockResolvedValue({ ...dettaglio, chiave: 'mementos-1', nome: 'Memento, area 1', casa: '/guida/mappe/mementos-1' });
  risolviMappa.mockResolvedValueOnce({ tipo: 'mappa', mappa: 'mementos-1', casa: '/guida/mappe/mementos-1' });
  monta('/guida/mappe/mementos-1');
  await waitFor(() => expect(getMappa.mock.calls.map((c) => c[0])).toContain('mementos-1'));
  expect(screen.queryByText(/^Casa: /)).toBeNull();
});

it('il contesto URL cambia il titolo del visore e il selettore può ripristinare tutte le alternative',async()=>{
  getAlberoMappe.mockResolvedValue(albero);
  getMappa.mockResolvedValue({...dettaglio,nome:'Area tecnica',contesti:[{id:'a',nome:'Museo, 1P',campo:'F1',texpack:1},{id:'b',nome:'Museo, 2P',campo:'F2',texpack:2}]});
  monta('/guida/mappe/citta-shibuya?contesto=a');
  const img=await screen.findByRole('img',{name:'Illustrazione di Museo, 1P'});
  const src=img.getAttribute('src');
  // `document.title` lo scrive un effetto, e un effetto non e' ancora corso quando l'immagine e'
  // gia' resa: l'asserzione immediata leggeva a volte il titolo di prima. Era il rosso
  // intermittente che Codex aveva documentato e assegnato a me come proprietario del test —
  // aperto da allora, e ricomparso oggi in una passata sotto carico. `waitFor` aspetta il fatto
  // invece di sperare nell'ordine: e' la differenza fra una prova e una coincidenza.
  await waitFor(()=>expect(document.title).toContain('Museo, 1P'));
  scegliVoce('Nome secondo il contesto','Museo, 2P');
  expect(await screen.findByRole('img',{name:'Illustrazione di Museo, 2P'})).toHaveAttribute('src',src);
  scegliVoce('Nome secondo il contesto','Mostra tutti i nomi');
  expect(await screen.findByRole('img',{name:'Illustrazione di Museo, 1P / Museo, 2P'})).toHaveAttribute('src',src);
  expect(screen.getByRole('list',{name:'Nomi nei contesti del gioco'})).toBeInTheDocument();
});

const guidaAccessibile: ContenutiMappaDto = {mappa:'citta-shibuya',aree:[{chiave:'biblioteca',nome:'Biblioteca',descrizione:'Contenuto conservato',note:'',mappe:[],punti:[]}]};
it('l’emblema del palazzo senza dimensioni lascia guida e planimetrie accessibili senza visore',async()=>{
  getAlberoMappe.mockResolvedValue(albero);
  getContenutiMappa.mockResolvedValueOnce(guidaAccessibile);
  getAlberoMappe.mockResolvedValue([{...albero[3],genitore:'citta-shibuya'}]);
  getMappa.mockResolvedValue({...dettaglio,nome:'Palazzo di Kamoshida',tipo:'palazzo',immagineUrl:null,asset:'palazzi/kamoshida',larghezza:null,altezza:null,spilli:[],figli:[albero[3]]});
  monta('/guida/mappe/citta-shibuya?area=biblioteca');
  const guida=await screen.findByRole('region',{name:'Contenuti della guida'});
  expect(guida).toBeVisible();
  expect(within(guida).getByText('Contenuto conservato')).toBeVisible();
  expect(screen.getByRole('link',{name:/^Ingresso/})).toBeVisible();
  expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
  const summary=within(guida).getByText('Biblioteca');
  fireEvent.click(summary);
  expect(summary.closest('details')).not.toHaveAttribute('open');
  fireEvent.click(summary);
  expect(summary.closest('details')).toHaveAttribute('open');
});
it('la planimetria nativa mantiene contesto e guida dentro il pannello reale del visore',async()=>{
  getAlberoMappe.mockResolvedValue(albero);
  getContenutiMappa.mockResolvedValueOnce(guidaAccessibile);
  useAssetStore.setState({manifest:{generato:'T',totale:1,file:{'mappe/native/RMAP_153_1_0':'/asset/mappe/native/RMAP_153_1_0.png'}},caricato:true,mancanti:{}});
  getMappa.mockResolvedValue({...dettaglio,immagineUrl:null,asset:'mappe/native/RMAP_153_1_0',larghezza:1536,altezza:1536,spilli:[],contesti:[{id:'a',nome:'Museo, 1P',campo:'F1',texpack:1},{id:'b',nome:'Museo, 2P',campo:'F2',texpack:2}]});
  monta('/guida/mappe/citta-shibuya?contesto=a&area=biblioteca');
  const guida=await screen.findByRole('region',{name:'Contenuti della guida'});
  const visore=screen.getByTestId('visore-mappa');
  const pannello=within(visore).getByRole('complementary',{name:'Pannello della mappa'});
  expect(pannello).toContainElement(guida);
  expect(within(pannello).getByText('Contenuto conservato')).toBeVisible();
  scegliVoce('Nome secondo il contesto','Museo, 2P',pannello);
  expect(await within(visore).findByRole('img',{name:'Illustrazione di Museo, 2P'})).toBeInTheDocument();
  expect(within(pannello).getByRole('navigation',{name:'Altri quartieri'})).toBeVisible();
  fireEvent.click(within(visore).getByRole('button',{name:'Nascondi pannello'}));
  expect(guida).not.toBeVisible();
  fireEvent.click(within(visore).getByRole('button',{name:'Pannello'}));
  expect(guida).toBeVisible();
});

it('una mappa con asset originale e dimensioni non registrate mantiene la planimetria',async()=>{
  // L'esempio era Tokyo, che ora rimbalza sulla Città: la regola però non è su Tokyo, è che
  // l'asset basta anche quando larghezza e altezza non sono in archivio.
  useAssetStore.setState({manifest:{generato:'T',totale:1,file:{'mappe/dungeon-kamoshida':'/asset/mappe/dungeon-kamoshida.png'}},caricato:true});
  getMappa.mockResolvedValue({...dettaglio,chiave:'dungeon-kamoshida',nome:'Palazzo di Kamoshida',immagineUrl:null,asset:'mappe/dungeon-kamoshida',ruoloImmagine:'illustrazione-editoriale',larghezza:null,altezza:null,spilli:[],percorso:[{chiave:'dungeon-kamoshida',nome:'Palazzo di Kamoshida'}]});
  monta('/guida/mappe/dungeon-kamoshida');
  expect(await screen.findByRole('img',{name:'Illustrazione di Palazzo di Kamoshida'})).toHaveAttribute('src','/asset/mappe/dungeon-kamoshida.png');
  expect(screen.getByTestId('visore-mappa')).toBeInTheDocument();
});
