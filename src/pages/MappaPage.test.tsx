import { usePreferenzeStore } from '../stores/preferenzeStore';
import { useAssetStore } from '../stores/assetStore';
/**
 * @vitest-environment jsdom
 */
// ============================================================
// Test MappaPage — indice dell'albero e visore con stato «raccolto» della partita attiva (Fase 13.2)
// ============================================================

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ContenutiMappaDto } from '../../shared/organizzazioneMappe';
import { MappaPage } from './MappaPage';
import { usePartitaStore } from '../stores/partitaStore';
import type { MappaDto, MappaRiassuntoDto, PartitaDto, SpilloDto } from '../types';

const { risolviMappa, getContenutiMappa, getAlberoMappe, getMappa, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto } = vi.hoisted(() => ({ risolviMappa: vi.fn(async (mappa: string) => ({tipo:'mappa',mappa})), getContenutiMappa: vi.fn(async (mappa: string): Promise<ContenutiMappaDto> => ({mappa,aree:[]})), getAlberoMappe: vi.fn(), getMappa: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn() }));
vi.mock('../services/api', () => ({ risolviMappa, getContenutiMappa, getAlberoMappe, getMappa, impostaSpilloRaccolto, impostaStatoPunto, impostaAcquisto }));

const riassunto = (extra: Partial<MappaRiassuntoDto> & { chiave: string; nome: string; tipo: MappaRiassuntoDto['tipo'] }): MappaRiassuntoDto => ({ genitore: null, ordine: 0, immagineUrl: null, asset: null, entita: null, origine: 'seed', numeroSpilli: 0, numeroFigli: 0, updatedAt: '', ...extra });
const albero: MappaRiassuntoDto[] = [
  riassunto({ chiave: 'tokyo', nome: 'Tokyo', tipo: 'citta', numeroFigli: 1, asset: 'mappe/tokyo' }),
  riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', numeroSpilli: 2 }),
  riassunto({ chiave: 'dungeon-kamoshida', nome: 'Palazzo di Kamoshida', tipo: 'palazzo', numeroFigli: 1 }),
  riassunto({ chiave: 'kamoshida-01', nome: 'Ingresso', tipo: 'area', genitore: 'dungeon-kamoshida', numeroSpilli: 5 }),
];
const forziere: SpilloDto = { id: 4, mappaChiave: 'citta-shibuya', tipo: 'forziere', tipoNome: 'Forziere', colore: '#eab308', nome: 'Scrigno', descrizione: '', x: 30, y: 40, riferimento: null, collezionabile: true, ordine: 0, origine: 'seed', raccolto: false, dettaglio: null, condizioni: [], immagini: [], updatedAt: '' };
const dettaglio: MappaDto = { ...riassunto({ chiave: 'citta-shibuya', nome: 'Shibuya', tipo: 'quartiere', genitore: 'tokyo', numeroSpilli: 2, immagineUrl: '/pianta-test.png' }), larghezza: 800, altezza: 600, note: '', genitoreNome: 'Tokyo', percorso: [{ chiave: 'tokyo', nome: 'Tokyo' }, { chiave: 'citta-shibuya', nome: 'Shibuya' }], figli: [], spilli: [forziere, { ...forziere, id: 5, nome: 'Passaggio', tipo: 'passaggio', tipoNome: 'Passaggio', collezionabile: false, x: 60, y: 60 }, { ...forziere, id: 6, nome: 'Tesoro del Palazzo', tipo: 'tesoro', tipoNome: 'Tesoro', x: 70, y: 20, riferimento: { tipo: 'punto', chiave: 'kamoshida-01/2' }, dettaglio: { tipo: 'punto', punto: { chiave: 'kamoshida-01/2', tipo: 'tesoro', nome: 'Tesoro del Palazzo', descrizione: '', esauribile: false, dungeon: 'kamoshida', area: 'kamoshida-01', stato: null } } }] };

function monta(percorso: string) {
  render(
    <MemoryRouter initialEntries={[percorso]}>
      <Routes>
        <Route path="/guida/mappe" element={<MappaPage />} />
        <Route path="/guida/mappe/:chiave" element={<MappaPage />} />
        {/* La Città vera monta la mappa disegnata e chiama l'API: qui serve solo sapere che ci
            si arriva, non rifarla. */}
        <Route path="/guida/citta" element={<h1>La città</h1>} />
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
    getMappa.mockResolvedValue(dettaglio);
    usePartitaStore.setState({ attiva: { id: 7, nome: 'Prova' } as PartitaDto });
  });

describe('MappaPage', () => {
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
    // è quella disegnata della Città.
    expect(pannello.getByRole('link', { name: /Apri la mappa di Tokyo/ })).toHaveAttribute('href', '/guida/citta');
    expect(within(screen.getByRole('list', { name: 'Aree di Tokyo' })).getByRole('link', { name: /Shibuya/ })).toHaveAttribute('href', '/guida/mappe/citta-shibuya');
    // Una radice per volta: aprendone un'altra, la prima si chiude.
    fireEvent.click(screen.getByRole('button', { name: /^Palazzo di Kamoshida/ }));
    expect(screen.queryByRole('region', { name: 'Dentro Tokyo' })).toBeNull();
    expect(within(screen.getByRole('list', { name: 'Aree di Palazzo di Kamoshida' })).getByRole('link', { name: /Ingresso/ })).toBeInTheDocument();
  });

  it('il visore carica la mappa con la partita attiva e segna un collezionabile raccolto tramite l’API', async () => {
    impostaSpilloRaccolto.mockResolvedValue({ ...forziere, raccolto: true });
    monta('/guida/mappe/citta-shibuya');
    const spillo = await screen.findByRole('button', { name: 'Forziere: Scrigno' });
    expect(getMappa).toHaveBeenCalledWith('citta-shibuya', 7);
    fireEvent.click(spillo);
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Scrigno' })).getByRole('button', { name: 'Raccolto' }));
    expect(impostaSpilloRaccolto).toHaveBeenCalledWith(7, 4, true);
    // lo spillo raccolto sparisce dalla mappa e il progresso passa a 1 su 2
    expect(await screen.findByText('1 di 2 raccolti · 50%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forziere: Scrigno' })).not.toBeInTheDocument();
  });

  it('un punto della Guida segnato «Ottenuto» dalla mappa aggiorna lo stato del punto e conta come raccolto', async () => {
    impostaStatoPunto.mockResolvedValue({ chiave: 'kamoshida-01/2', stato: 'ottenuto' });
    monta('/guida/mappe/citta-shibuya');
    fireEvent.click(await screen.findByRole('button', { name: 'Tesoro: Tesoro del Palazzo' }));
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Tesoro del Palazzo' })).getByRole('button', { name: 'Ottenuto' }));
    expect(impostaStatoPunto).toHaveBeenCalledWith(7, 'kamoshida-01/2', 'ottenuto');
    expect(await screen.findByText('1 di 2 raccolti · 50%')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tesoro: Tesoro del Palazzo' })).not.toBeInTheDocument();
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

it('il contesto URL cambia il titolo del visore e il selettore può ripristinare tutte le alternative',async()=>{
  getAlberoMappe.mockResolvedValue(albero);
  getMappa.mockResolvedValue({...dettaglio,nome:'Area tecnica',contesti:[{id:'a',nome:'Museo, 1P',campo:'F1',texpack:1},{id:'b',nome:'Museo, 2P',campo:'F2',texpack:2}]});
  monta('/guida/mappe/citta-shibuya?contesto=a');
  const img=await screen.findByRole('img',{name:'Mappa: Museo, 1P'});
  const src=img.getAttribute('src');
  // `document.title` lo scrive un effetto, e un effetto non e' ancora corso quando l'immagine e'
  // gia' resa: l'asserzione immediata leggeva a volte il titolo di prima. Era il rosso
  // intermittente che Codex aveva documentato e assegnato a me come proprietario del test —
  // aperto da allora, e ricomparso oggi in una passata sotto carico. `waitFor` aspetta il fatto
  // invece di sperare nell'ordine: e' la differenza fra una prova e una coincidenza.
  await waitFor(()=>expect(document.title).toContain('Museo, 1P'));
  fireEvent.change(screen.getByRole('combobox',{name:'Nome secondo il contesto'}),{target:{value:'b'}});
  expect(await screen.findByRole('img',{name:'Mappa: Museo, 2P'})).toHaveAttribute('src',src);
  fireEvent.change(screen.getByRole('combobox',{name:'Nome secondo il contesto'}),{target:{value:''}});
  expect(await screen.findByRole('img',{name:'Mappa: Museo, 1P / Museo, 2P'})).toHaveAttribute('src',src);
  expect(screen.getByRole('list',{name:'Nomi nei contesti del gioco'})).toBeInTheDocument();
});

const guidaAccessibile: ContenutiMappaDto = {mappa:'citta-shibuya',aree:[{chiave:'biblioteca',nome:'Biblioteca',descrizione:'Contenuto conservato',note:'',mappe:[],punti:[]}]};
it('l’emblema del palazzo senza dimensioni lascia guida e planimetrie accessibili senza visore',async()=>{
  getAlberoMappe.mockResolvedValue(albero);
  getContenutiMappa.mockResolvedValueOnce(guidaAccessibile);
  getAlberoMappe.mockResolvedValue([{...albero[3],genitore:'citta-shibuya'}]);
  getMappa.mockResolvedValue({...dettaglio,nome:'Palazzo di Kamoshida',tipo:'palazzo',immagineUrl:null,assetOriginale:'palazzi/kamoshida',larghezza:null,altezza:null,spilli:[],figli:[albero[3]]});
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
  getMappa.mockResolvedValue({...dettaglio,immagineUrl:null,assetOriginale:'mappe/native/RMAP_153_1_0',larghezza:1536,altezza:1536,spilli:[],contesti:[{id:'a',nome:'Museo, 1P',campo:'F1',texpack:1},{id:'b',nome:'Museo, 2P',campo:'F2',texpack:2}]});
  monta('/guida/mappe/citta-shibuya?contesto=a&area=biblioteca');
  const guida=await screen.findByRole('region',{name:'Contenuti della guida'});
  const visore=screen.getByTestId('visore-mappa');
  const pannello=within(visore).getByRole('complementary',{name:'Pannello della mappa'});
  expect(pannello).toContainElement(guida);
  expect(within(pannello).getByText('Contenuto conservato')).toBeVisible();
  fireEvent.change(within(pannello).getByRole('combobox',{name:'Nome secondo il contesto'}),{target:{value:'b'}});
  expect(await within(visore).findByRole('img',{name:'Mappa: Museo, 2P'})).toBeInTheDocument();
  expect(within(pannello).getByRole('navigation',{name:'Planimetrie del luogo'})).toBeVisible();
  fireEvent.click(within(visore).getByRole('button',{name:'Nascondi pannello'}));
  expect(guida).not.toBeVisible();
  fireEvent.click(within(visore).getByRole('button',{name:'Pannello'}));
  expect(guida).toBeVisible();
});

it('una mappa con asset originale e dimensioni non registrate mantiene la planimetria',async()=>{
  // L'esempio era Tokyo, che ora rimbalza sulla Città: la regola però non è su Tokyo, è che
  // l'asset basta anche quando larghezza e altezza non sono in archivio.
  useAssetStore.setState({manifest:{generato:'T',totale:1,file:{'mappe/dungeon-kamoshida':'/asset/mappe/dungeon-kamoshida.png'}},caricato:true});
  getMappa.mockResolvedValue({...dettaglio,chiave:'dungeon-kamoshida',nome:'Palazzo di Kamoshida',immagineUrl:null,asset:null,assetOriginale:'mappe/dungeon-kamoshida',ruoloImmagine:'illustrazione-editoriale',larghezza:null,altezza:null,spilli:[],percorso:[{chiave:'dungeon-kamoshida',nome:'Palazzo di Kamoshida'}]});
  monta('/guida/mappe/dungeon-kamoshida');
  expect(await screen.findByRole('img',{name:'Mappa: Palazzo di Kamoshida'})).toHaveAttribute('src','/asset/mappe/dungeon-kamoshida.png');
  expect(screen.getByTestId('visore-mappa')).toBeInTheDocument();
});
