/** @vitest-environment jsdom */
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ContenutiGuidaMappa } from './ContenutiGuidaMappa';
import { usePartitaStore } from '../../stores/partitaStore';
import type { PartitaDto } from '../../types';
import type { ContenutiMappaDto, SchedaContenutoGuidaDto } from '../../../shared/organizzazioneMappe';

const api = vi.hoisted(() => ({
  getContenutiMappa: vi.fn(), aggiornaSpillo: vi.fn(), impostaSpilloRaccolto: vi.fn(), impostaStatoPunto: vi.fn(), impostaAcquisto: vi.fn(),
  aggiungiImmagineSpillo: vi.fn(), aggiornaImmagineSpillo: vi.fn(), eliminaImmagineSpillo: vi.fn(),
  getConfidenti: vi.fn(), getQuartieri: vi.fn(), getRichieste: vi.fn(), getDungeons: vi.fn(),
}));
vi.mock('../../services/api', () => api);
vi.mock('../../services/api/condizioni', () => ({getElenchiRegole:vi.fn(async()=>({articoli:[],letture:[],arcani:[],persone:[],abilita:[],squadra:[],attivita:[],negozi:[],eventi:[],contatori:[]}))}));

const ID = 427;
let descrizione: string;
const raccolti = new Set<number>();
function scheda(partita?: number): SchedaContenutoGuidaDto {
  return {
    id:ID,areaGuida:'castello-biblioteca',tipo:'forziere',tipoNome:'Forziere',colore:'#eab308',nome:'Scrigno della biblioteca',descrizione,
    riferimento:null,collezionabile:true,soloPosizione:false,ordine:0,origine:'utente',raccolto:partita!==undefined&&raccolti.has(partita),dettaglio:null,
    condizioni:[{tipo:'fascia',fascia:'sera',testo:'Solo la sera'}],
    ...(partita ? {disponibilita:{stato:partita===7?'bloccato' as const:'disponibile' as const,requisiti:[{indice:0,tipo:'fascia' as const,testo:'Solo la sera',stato:partita===7?'rosso' as const:'verde' as const,dettaglio:partita===7?'La partita è nel momento di giorno':'',manuale:false,confermato:false}]}}:{}),
    immagini:[{id:91,url:'/api/immagini/spillo/conservata/file',asset:null,didascalia:'Schermata conservata',ordine:0}],updatedAt:'2026-09-06T00:00:00Z',
  };
}
function contenuti(partita?:number):ContenutiMappaDto {
  const s=scheda(partita);
  return {mappa:'palazzo-castello',aree:[{chiave:s.areaGuida,nome:'Biblioteca',descrizione:'Testo della guida conservato',note:'',mappe:[],punti:[{id:ID,nome:s.nome,descrizione:s.descrizione,tipo:s.tipo,riferimento:s.riferimento,collezionabile:true,soloPosizione:false,ruolo:'punto',scheda:s}]}]};
}
function partita(id:number):PartitaDto {return {id,nome:`Partita ${id}`,dataGioco:'04-20',fasciaGioco:id===7?'giorno':'sera'} as PartitaDto;}
function monta(){return render(<MemoryRouter><ContenutiGuidaMappa mappa="palazzo-castello" area="castello-biblioteca" dungeon="castello"/></MemoryRouter>);}
async function apri(){fireEvent.click(await screen.findByRole('button',{name:'Scrigno della biblioteca'}));return screen.findByRole('region',{name:'Scheda: Scrigno della biblioteca'});}

beforeEach(()=>{
  vi.clearAllMocks();descrizione='Descrizione originale del punto';raccolti.clear();raccolti.add(8);
  usePartitaStore.setState({attiva:partita(7)});
  api.getContenutiMappa.mockImplementation(async (_mappa:string,id?:number)=>contenuti(id));
  api.getConfidenti.mockResolvedValue([]);api.getQuartieri.mockResolvedValue([]);api.getRichieste.mockResolvedValue({richieste:[]});api.getDungeons.mockResolvedValue([]);
});
afterEach(()=>usePartitaStore.setState({attiva:null}));

it('apre lo stesso ID migrato e conserva immagini, condizioni e stato senza controlli geografici',async()=>{
  monta();const regione=await apri();const s=within(regione);
  expect(api.getContenutiMappa).toHaveBeenCalledWith('palazzo-castello',7);
  expect(s.getByText('Descrizione originale del punto')).toBeInTheDocument();
  expect(s.getByRole('group',{name:'Condizioni di visibilità'})).toHaveTextContent('Solo la sera');
  expect(s.getByRole('img',{name:'Condizione non soddisfatta'})).toBeInTheDocument();
  expect(s.getByText('La partita è nel momento di giorno')).toBeInTheDocument();
  const schermate=s.getByRole('list',{name:'Schermate di Scrigno della biblioteca'});
  expect(schermate.querySelector('img')).toHaveAttribute('src','/api/immagini/spillo/conservata/file');
  fireEvent.click(s.getByRole('button',{name:'Ingrandisci: Schermata conservata'}));
  expect(await screen.findByRole('img',{name:'Schermata conservata'})).toHaveAttribute('src','/api/immagini/spillo/conservata/file');
  expect(s.queryByRole('button',{name:'Centra'})).not.toBeInTheDocument();
  expect(s.queryByRole('button',{name:/Apri mappa|Vai a|Passaggio|Raggiungi/})).not.toBeInTheDocument();
  expect(regione.querySelector('a[href*="/guida/mappe/"]')).toBeNull();
  expect(scheda(7)).not.toHaveProperty('x');expect(scheda(7)).not.toHaveProperty('mappaChiave');
});

it('salva la descrizione sullo stesso ID e ricarica la scheda senza cancellare le altre proprietà',async()=>{
  api.aggiornaSpillo.mockImplementation(async (_id:number,dati:{descrizione:string})=>{descrizione=dati.descrizione;return scheda(7);});
  monta();await apri();
  fireEvent.click(screen.getByRole('button',{name:'Modifica contenuto'}));
  const form=screen.getByRole('form',{name:'Modifica contenuto della guida'});
  fireEvent.change(within(form).getByRole('textbox',{name:'Descrizione'}),{target:{value:'Descrizione aggiornata e conservata'}});
  fireEvent.click(within(form).getByRole('button',{name:'Salva contenuto'}));
  await waitFor(()=>expect(api.aggiornaSpillo).toHaveBeenCalledWith(ID,expect.objectContaining({descrizione:'Descrizione aggiornata e conservata',nome:'Scrigno della biblioteca',collezionabile:true,condizioni:expect.arrayContaining([expect.objectContaining({tipo:'fascia',fascia:'sera'})])})));
  await waitFor(()=>expect(api.getContenutiMappa).toHaveBeenCalledTimes(2));
  const s=within(await screen.findByRole('region',{name:'Scheda: Scrigno della biblioteca'}));
  expect(s.getByText('Descrizione aggiornata e conservata')).toBeInTheDocument();
  expect(s.getByRole('list',{name:'Schermate di Scrigno della biblioteca'}).querySelector('img')).toHaveAttribute('src','/api/immagini/spillo/conservata/file');
  expect(api.aggiornaSpillo.mock.calls[0][1]).not.toHaveProperty('x');expect(api.aggiornaSpillo.mock.calls[0][1]).not.toHaveProperty('mappa');
});

it('cambiando partita ricarica stato e condizioni del contenuto mantenendo la selezione',async()=>{
  monta();await apri();
  expect(screen.getByRole('button',{name:'Raccolto'})).toBeInTheDocument();
  act(()=>usePartitaStore.setState({attiva:partita(8)}));
  await waitFor(()=>expect(api.getContenutiMappa).toHaveBeenLastCalledWith('palazzo-castello',8));
  const s=within(await screen.findByRole('region',{name:'Scheda: Scrigno della biblioteca'}));
  expect(s.getByRole('button',{name:'Riapri'})).toBeInTheDocument();
  expect(s.getByRole('img',{name:'Condizione soddisfatta'})).toBeInTheDocument();
  expect(s.queryByText('La partita è nel momento di giorno')).not.toBeInTheDocument();
  expect(api.impostaSpilloRaccolto).not.toHaveBeenCalled();
});

it('aggiorna lo stato del medesimo ID nella partita e ricarica il contenuto',async()=>{
  api.impostaSpilloRaccolto.mockImplementation(async(id:number,spilloId:number,valore:boolean)=>{expect(spilloId).toBe(ID);if(valore)raccolti.add(id);else raccolti.delete(id);return scheda(id);});
  monta();await apri();fireEvent.click(screen.getByRole('button',{name:'Raccolto'}));
  await waitFor(()=>expect(api.impostaSpilloRaccolto).toHaveBeenCalledWith(7,ID,true));
  expect(await screen.findByRole('button',{name:'Riapri'})).toBeInTheDocument();
  expect(api.getContenutiMappa).toHaveBeenCalledTimes(2);
});

it('senza partita conserva la consultazione senza offrire modifiche allo stato di una partita',async()=>{
  usePartitaStore.setState({attiva:null});monta();const s=within(await apri());
  expect(api.getContenutiMappa).toHaveBeenCalledWith('palazzo-castello',undefined);
  expect(s.getByText('Solo la sera')).toBeInTheDocument();
  expect(s.queryByRole('button',{name:'Raccolto'})).not.toBeInTheDocument();expect(s.queryByRole('button',{name:'Riapri'})).not.toBeInTheDocument();
  expect(s.queryByRole('button',{name:'Centra'})).not.toBeInTheDocument();
});
