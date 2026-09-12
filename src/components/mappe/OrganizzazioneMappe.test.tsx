import { usePreferenzeStore } from '../../stores/preferenzeStore';
import { useAssetStore } from '../../stores/assetStore';
import { SelettoreContestoMappa } from './SelettoreContestoMappa';
/** @vitest-environment jsdom */
import { render, screen, within } from '@testing-library/react';
import { scegliVoce, valoreSelettore, vociSelettore } from '../../../test/selettore';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { MappaRiassuntoDto } from '../../types';
import { MappaIncorporata } from './MappaIncorporata';
import { AlberoLuoghi } from './AlberoLuoghi';
import { RisolviMappa } from './RisolviMappa';
import { ContenutiGuidaMappa } from './ContenutiGuidaMappa';
const api = vi.hoisted(() => ({risolviMappa:vi.fn(),getContenutiMappa:vi.fn(),getMappa:vi.fn()}));
vi.mock('../../services/api', () => api);
function m(chiave:string,genitore:string|null,nome=chiave):MappaRiassuntoDto { return {chiave,genitore,nome,tipo:'luogo',ordine:0,immagineUrl:null,asset:null,entita:null,origine:'utente',numeroSpilli:0,numeroFigli:0,updatedAt:''}; }
function Indirizzo(){ const p=useLocation();return <div>{p.pathname}{p.search}</div>; }
beforeEach(()=>{vi.resetAllMocks();usePreferenzeStore.setState({graficaPredefinita:true});useAssetStore.setState({manifest:null,caricato:true,mancanti:{}});});
it('rende ogni profondità e mantiene distinti gli omonimi senza icone di passaggio',()=>{
  render(<MemoryRouter><AlberoLuoghi mappe={[m('tokyo',null),m('scuola','tokyo'),m('edificio','scuola'),m('piano','edificio','Primo piano'),m('palazzo',null),m('altro','palazzo','Primo piano')]} /></MemoryRouter>);
  const nomi=screen.getAllByRole('link',{name:'Primo piano'});expect(nomi).toHaveLength(2);
  expect(nomi.map(n=>n.getAttribute('href'))).toEqual(['/guida/mappe/piano','/guida/mappe/altro']);
  expect(screen.getAllByRole('link')).toHaveLength(6);
});
it('un vecchio URL editoriale apre la sezione del palazzo e non carica una planimetria falsa',async()=>{
  api.risolviMappa.mockResolvedValue({tipo:'guida',area:'castello/biblioteca',dungeon:'castello',mappaPalazzo:'palazzo',nome:'Biblioteca'});
  const child=vi.fn(()=> <div>Planimetria falsa</div>);
  render(<MemoryRouter initialEntries={['/vecchia']}><Routes><Route path="/vecchia" element={<RisolviMappa chiave="vecchia">{child}</RisolviMappa>}/><Route path="/guida/mappe/:id" element={<Indirizzo/>}/></Routes></MemoryRouter>);
  expect(await screen.findByText('/guida/mappe/palazzo?area=castello%2Fbiblioteca')).toBeInTheDocument();expect(child).not.toHaveBeenCalled();
});
it('i contenuti mantengono testo e punti senza inventare coordinate o attività',async()=>{
  api.getContenutiMappa.mockResolvedValue({mappa:'palazzo',aree:[{chiave:'biblioteca',nome:'Biblioteca',descrizione:'Descrizione conservata',note:'Nota conservata',mappe:[],punti:[{id:7,nome:'Libro',descrizione:'Descrizione del libro',tipo:'nota',riferimento:null,collezionabile:true,soloPosizione:false}]}]});
  render(<MemoryRouter><ContenutiGuidaMappa mappa="palazzo" area="biblioteca" dungeon="castello"/></MemoryRouter>);
  const sezione=await screen.findByRole('region',{name:'Contenuti della guida'});
  expect(within(sezione).getByText('Descrizione conservata')).toBeInTheDocument();expect(within(sezione).getByText('Nota conservata')).toBeInTheDocument();expect(within(sezione).getByText('Libro')).toBeInTheDocument();
  expect(within(sezione).queryByRole('button')).not.toBeInTheDocument();expect(within(sezione).getByRole('link')).toHaveAttribute('href','/guida/dungeon/castello');
  expect(within(sezione).getByText('Biblioteca').closest('details')).toHaveAttribute('open');
});

it('la sezione originale della guida rimane aperta quando il vecchio riquadro era editoriale',async()=>{
  api.risolviMappa.mockResolvedValue({tipo:'guida',area:'biblioteca',dungeon:'castello',mappaPalazzo:'palazzo',nome:'Biblioteca'});
  render(<MemoryRouter><h1>Scheda originale</h1><MappaIncorporata chiave="vecchia-area"/></MemoryRouter>);
  const link=await screen.findByRole('link',{name:'Apri il luogo e i contenuti della guida'});
  expect(link).toHaveAttribute('href','/guida/mappe/palazzo?area=biblioteca');
  expect(screen.getByRole('heading',{name:'Scheda originale'})).toBeInTheDocument();
  expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
});

it('il selettore mostra alternative senza default e cambia il contesto esplicitamente',()=>{
  const mappa={...m('pianta',null),contesti:[{id:'a',nome:'Museo, 1P',campo:'F1',texpack:1},{id:'b',nome:'Museo, 2P',campo:'F2',texpack:2},{id:'c',nome:'Museo, 2P',campo:'F3',texpack:2}]};
  const onCambia=vi.fn();
  const vista=render(<SelettoreContestoMappa mappa={mappa} selezione={null} onCambia={onCambia}/>);
  expect(valoreSelettore('Nome secondo il contesto')).toBe('Mostra tutti i nomi');
  expect(screen.getByRole('list',{name:'Nomi nei contesti del gioco'})).toHaveTextContent('Museo, 1PMuseo, 2P');
  expect(vociSelettore('Nome secondo il contesto').filter((v)=>v==='Museo, 2P')).toHaveLength(1);
  scegliVoce('Nome secondo il contesto','Museo, 2P');expect(onCambia).toHaveBeenCalledWith('b|c');
  vista.rerender(<SelettoreContestoMappa mappa={mappa} selezione="a" onCambia={onCambia}/>);
  expect(valoreSelettore('Nome secondo il contesto')).toBe('Museo, 1P');expect(screen.queryByRole('list')).not.toBeInTheDocument();
  vista.rerender(<SelettoreContestoMappa mappa={mappa} selezione="errato" onCambia={onCambia}/>);
  expect(screen.getByRole('status')).toHaveTextContent('non appartiene');expect(valoreSelettore('Nome secondo il contesto')).toBe('Mostra tutti i nomi');
});
it('il Covo presenta cinque immagini selezionabili sotto un solo luogo, senza piani inventati',()=>{
  const immagini=Array.from({length:5},(_,i)=>({...m(`immagine-${i}`,'covo',`tecnico-${i}`),immagineUrl:`/immagine-${i}.png`,gruppoImmagini:{id:'covo',nome:'Covo dei Ladri',ordine:i}}));
  render(<MemoryRouter><AlberoLuoghi mappe={[m('covo',null,'Covo dei Ladri'),...immagini]}/></MemoryRouter>);
  expect(screen.getAllByRole('link',{name:'Covo dei Ladri'})).toHaveLength(1);
  const gruppo=screen.getByRole('list',{name:'Immagini di Covo dei Ladri'});
  expect(within(gruppo).getAllByRole('link')).toHaveLength(5);
  expect(within(gruppo).getByRole('link',{name:'Immagine 5 di 5'})).toHaveAttribute('href','/guida/mappe/immagine-4');
  expect(screen.queryByText(/tecnico-/)).not.toBeInTheDocument();
});

it.each([{larghezza:null,altezza:null},{larghezza:0,altezza:600},{larghezza:800,altezza:0}])('il riquadro con emblema e dimensioni $larghezza/$altezza apre il luogo senza falsa planimetria',async dimensioni=>{
  api.risolviMappa.mockResolvedValue({tipo:'mappa',mappa:'palazzo'});
  api.getMappa.mockResolvedValue({...m('palazzo',null,'Palazzo di Kamoshida'),assetOriginale:'palazzi/kamoshida',...dimensioni,note:'',genitoreNome:null,percorso:[],figli:[m('ingresso','palazzo','Ingresso')],spilli:[]});
  render(<MemoryRouter><MappaIncorporata chiave="palazzo"/></MemoryRouter>);
  expect(await screen.findByRole('link',{name:'Apri il luogo e i contenuti della guida'})).toHaveAttribute('href','/guida/mappe/palazzo');
  expect(screen.getByRole('link',{name:'Ingresso'})).toHaveAttribute('href','/guida/mappe/ingresso');
  expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
});
it('il riquadro con asset nativo e dimensioni positive conserva il visore reale',async()=>{
  api.risolviMappa.mockResolvedValue({tipo:'mappa',mappa:'pianta'});
  useAssetStore.setState({manifest:{generato:'T',totale:1,file:{'mappe/native/RMAP_151_16_0':'/asset/mappe/native/RMAP_151_16_0.png'}},caricato:true,mancanti:{}});
  api.getMappa.mockResolvedValue({...m('pianta',null,'Sala centrale'),assetOriginale:'mappe/native/RMAP_151_16_0',larghezza:1536,altezza:1536,note:'',genitoreNome:null,percorso:[],figli:[],spilli:[]});
  render(<MemoryRouter><MappaIncorporata chiave="pianta"/></MemoryRouter>);
  const visore=await screen.findByTestId('visore-mappa');
  expect(within(visore).getByRole('img',{name:'Mappa: Sala centrale'})).toBeInTheDocument();
  expect(screen.queryByRole('link',{name:'Apri il luogo e i contenuti della guida'})).not.toBeInTheDocument();
});

it.each(['futaba','iweleth','kamoshida','kaneshiro','madarame','maruki','mementos','niijima','okumura','shido'])('l’emblema %s non diventa una planimetria per il solo asset normalizzato',async nome=>{
  api.risolviMappa.mockResolvedValue({tipo:'mappa',mappa:nome});
  api.getMappa.mockResolvedValue({...m(nome,null),asset:`mappe/${nome}`,assetOriginale:`palazzi/${nome}`,larghezza:null,altezza:null,note:'',genitoreNome:null,percorso:[],figli:[],spilli:[]});
  render(<MemoryRouter><MappaIncorporata chiave={nome}/></MemoryRouter>);
  expect(await screen.findByRole('link',{name:'Apri il luogo e i contenuti della guida'})).toHaveAttribute('href',`/guida/mappe/${nome}`);
  expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
});

it('il contesto senza titolo rimane selezionato e non è segnalato come estraneo',()=>{
  const mappa={...m('risorsa','padre','Area 4 — RMAP 153'),genitoreNome:'Palazzo di Madarame',contesti:[{id:'normale',nome:'Ripostiglio',campo:'F153_004_00',texpack:102},{id:'safe',nome:null,campo:'F153_051_00',texpack:103}]};
  const cambia=vi.fn();
  const vista=render(<SelettoreContestoMappa mappa={mappa} selezione={null} onCambia={cambia}/>);
  expect(valoreSelettore('Nome secondo il contesto')).toBe('Seleziona un contesto');
  scegliVoce('Nome secondo il contesto','Contesto con nome non ricostruito');
  expect(cambia).toHaveBeenCalledWith('safe');
  vista.rerender(<SelettoreContestoMappa mappa={mappa} selezione="safe" onCambia={cambia}/>);
  expect(valoreSelettore('Nome secondo il contesto')).toBe('Contesto con nome non ricostruito');
  expect(screen.getByRole('status')).toHaveTextContent('Nome non ricostruito per questo contesto.');
  expect(screen.getByRole('status')).not.toHaveTextContent('non appartiene');
  vista.rerender(<SelettoreContestoMappa mappa={mappa} selezione="normale" onCambia={cambia}/>);
  expect(valoreSelettore('Nome secondo il contesto')).toBe('Ripostiglio');
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
it('il nodo parziale dell’albero usa il padre verificato senza mostrare titolo noto come universale',()=>{
  render(<MemoryRouter><AlberoLuoghi mappe={[m('padre',null,'Palazzo di Madarame'),{...m('risorsa','padre','Area 4 — RMAP 153'),genitoreNome:'Palazzo di Madarame',contesti:[{id:'normale',nome:'Ripostiglio',campo:'F153_004_00',texpack:102},{id:'safe',nome:null,campo:'F153_051_00',texpack:103}]}]}/></MemoryRouter>);
  expect(screen.getByRole('link',{name:'Palazzo di Madarame — Planimetria'})).toHaveAttribute('href','/guida/mappe/risorsa');
  expect(screen.queryByRole('link',{name:'Ripostiglio'})).not.toBeInTheDocument();
  expect(screen.queryByText(/RMAP/)).not.toBeInTheDocument();
});
