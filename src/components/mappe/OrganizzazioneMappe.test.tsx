// ============================================================
// Test OrganizzazioneMappe — albero dei luoghi, risoluzione dei vecchi indirizzi, contenuti della guida per area, selettore di contesto e mappa incorporata
// ============================================================

import { usePreferenzeStore } from '../../stores/preferenzeStore';
import { useAssetStore } from '../../stores/assetStore';
import { SelettoreContestoMappa } from './SelettoreContestoMappa';
/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { scegliVoce, valoreSelettore, vociSelettore } from '../../../test/selettore';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { MappaRiassuntoDto } from '../../types';
import { MappaIncorporata } from './MappaIncorporata';
import { RisolviMappa } from './RisolviMappa';
import { ContenutiGuidaMappa } from './ContenutiGuidaMappa';
const api = vi.hoisted(() => ({risolviMappa:vi.fn(),getContenutiMappa:vi.fn(),getMappa:vi.fn()}));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
/** Riassunto minimo di una mappa di tipo «luogo» con la chiave, il genitore e il nome dati (nome predefinito = chiave), senza immagine né spilli. */
function m(chiave:string,genitore:string|null,nome=chiave):MappaRiassuntoDto { return {chiave,genitore,nome,nomeRivisto:false,tipo:'luogo',ordine:0,immagineUrl:null,asset:null,entita:null,origine:'utente',numeroSpilli:0,numeroFigli:0,updatedAt:'',area:null,casa:`/guida/mappe/${chiave}`}; }
/** Rotta di arrivo dei test: scrive a schermo percorso e query dell'indirizzo corrente, per verificare dove ha portato un reindirizzamento. */
function Indirizzo(){ const p=useLocation();return <div>{p.pathname}{p.search}</div>; }
beforeEach(()=>{vi.resetAllMocks();usePreferenzeStore.setState({graficaPredefinita:true});useAssetStore.setState({manifest:null,caricato:true,mancanti:{}});});
// SUPERATI da L11/B5 (R11-11, R11-12/5): `AlberoLuoghi` è eliminato e l'indice è l'albero della gerarchia (`AlberoGerarchia`, dal server). Corpi
// originali tolti per compilare; non eseguiti (zero test).
it.skip('SUPERATO da L11/B5: rende ogni profondità e mantiene distinti gli omonimi senza icone di passaggio',()=>{});
it.skip('SUPERATO da L11/B5: L2 (2026-10-20): le versioni di un’Area sono una voce sola col nome dell’Area, verso la sua casa, e il gruppo si chiama «Aree di …»',()=>{});
it.skip('SUPERATO da L11/B5: FUN2-7: aperto Tokyo, il gruppo di un quartiere si chiama «Aree di …» e conta le aree, non le planimetrie',()=>{});
it.skip('SUPERATO da L11/B5: R1: nell’indice un’area da verificare porta il segno «Da verificare», come nella pagina Area',()=>{});
it.skip('SUPERATO da L11/B5: E5 ed E7: ogni riga dell’Elenco dice i suoi pin con la stessa parola; l’Area da verificare sta nel gruppo «Da verificare»',()=>{});
it('un vecchio URL editoriale apre la sezione del palazzo e non carica una planimetria falsa',async()=>{
  api.risolviMappa.mockResolvedValue({tipo:'guida',area:'castello/biblioteca',dungeon:'castello',mappaPalazzo:'palazzo',nome:'Biblioteca'});
  const child=vi.fn(()=> <div>Planimetria falsa</div>);
  render(<MemoryRouter initialEntries={['/vecchia']}><Routes><Route path="/vecchia" element={<RisolviMappa chiave="vecchia">{child}</RisolviMappa>}/><Route path="/guida/mappe/:id" element={<Indirizzo/>}/></Routes></MemoryRouter>);
  expect(await screen.findByText('/guida/mappe/palazzo?area=castello%2Fbiblioteca')).toBeInTheDocument();expect(child).not.toHaveBeenCalled();
});
it('L3: un alias di un’infiltrazione apre la sua casa, la scheda del Palazzo con ?infiltrazione=',async()=>{
  api.risolviMappa.mockResolvedValue({tipo:'guida',area:'kamoshida-01',dungeon:'kamoshida',mappaPalazzo:'palazzo-di-kamoshida',nome:'Vecchio Castello',casa:'/guida/dungeon/kamoshida?infiltrazione=kamoshida-01'});
  const child=vi.fn(()=> <div>Planimetria falsa</div>);
  render(<MemoryRouter initialEntries={['/vecchia']}><Routes><Route path="/vecchia" element={<RisolviMappa chiave="vecchia">{child}</RisolviMappa>}/><Route path="/guida/dungeon/:chiave" element={<Indirizzo/>}/></Routes></MemoryRouter>);
  expect(await screen.findByText('/guida/dungeon/kamoshida?infiltrazione=kamoshida-01')).toBeInTheDocument();expect(child).not.toHaveBeenCalled();
});
it('i contenuti mantengono testo e punti senza inventare coordinate o attività',async()=>{
  api.getContenutiMappa.mockResolvedValue({mappa:'palazzo',aree:[{chiave:'biblioteca',nome:'Biblioteca',descrizione:'Descrizione conservata',note:'Nota conservata',mappe:[],punti:[{id:7,nome:'Libro',descrizione:'Descrizione del libro',tipo:'nota',riferimento:null,collezionabile:true,soloPosizione:false}]}]});
  render(<MemoryRouter><ContenutiGuidaMappa mappa="palazzo" area="biblioteca" dungeon="castello"/></MemoryRouter>);
  const sezione=await screen.findByRole('region',{name:'Contenuti della guida'});
  expect(within(sezione).getByText('Descrizione conservata')).toBeInTheDocument();expect(within(sezione).getByText('Nota conservata')).toBeInTheDocument();expect(within(sezione).getByText('Libro')).toBeInTheDocument();
  // L3 (§4.1): la scheda si apre sull'infiltrazione chiesta
  expect(within(sezione).queryByRole('button')).not.toBeInTheDocument();expect(within(sezione).getByRole('link')).toHaveAttribute('href','/guida/dungeon/castello?infiltrazione=biblioteca');
  expect(within(sezione).getByText('Biblioteca').closest('details')).toHaveAttribute('open');
});

it('L3 (AP3-4): una planimetria dell’infiltrazione porta dritto alla sua casa nella scheda del Palazzo, con l’infiltrazione', async () => {
  api.getContenutiMappa.mockResolvedValue({ mappa: 'palazzo', aree: [{ chiave: 'biblioteca', nome: 'Biblioteca', descrizione: '', note: '', mappe: [{ chiave: 'nativo-biblioteca', nome: 'Biblioteca 1' }], punti: [] }] });
  api.risolviMappa.mockResolvedValue({ tipo: 'mappa', mappa: 'castello-biblioteca-1', casa: '/guida/dungeon/castello/area/biblioteca' });
  render(<MemoryRouter initialEntries={['/guida/mappe/palazzo']}><Routes>
    <Route path="/guida/mappe/:chiave" element={<ContenutiGuidaMappa mappa="palazzo" dungeon="castello" />} />
    <Route path="/guida/dungeon/:chiave/area/:slug" element={<Indirizzo />} />
  </Routes></MemoryRouter>);
  fireEvent.click(within(await screen.findByRole('list', { name: 'Planimetrie di Biblioteca' })).getByRole('link', { name: 'Biblioteca 1' }));
  expect(await screen.findByText('/guida/dungeon/castello/area/biblioteca?infiltrazione=biblioteca&planimetria=castello-biblioteca-1')).toBeInTheDocument();
  expect(api.risolviMappa).toHaveBeenCalledWith('nativo-biblioteca');
});

it('i passi di un Enigma rientrano sotto di lui (095), le altre voci no', async () => {
  /** Costruisce un punto della guida di tipo «nota» con id `punto:…` e il contenitore indicato (null = voce di primo livello, altrimenti l'Enigma di cui è un passo). */
  const voce = (id: string, nome: string, contenitore: string | null) => ({ id, nome, descrizione: '', tipo: 'nota', riferimento: { tipo: 'punto', chiave: id.slice(6) }, collezionabile: false, soloPosizione: false, ruolo: 'punto', contenitore });
  api.getContenutiMappa.mockResolvedValue({ mappa: 'palazzo', aree: [{ chiave: 'sala', nome: 'Sala', descrizione: '', note: '', mappe: [], punti: [voce('punto:e', 'La porta della torre', null), voce('punto:a', 'Tira la leva', 'punto:e'), voce('punto:f', 'Forziere', null)] }] });
  render(<MemoryRouter><ContenutiGuidaMappa mappa="palazzo" area="sala" /></MemoryRouter>);
  const elementi = within(await screen.findByRole('list', { name: 'Elementi di Sala' })).getAllByRole('listitem');
  expect(elementi.map((li) => [li.textContent, li.getAttribute('data-passo-di')])).toEqual([['La porta della torre', null], ['Tira la leva', 'punto:e'], ['Forziere', null]]);
  expect(elementi[1].className).toContain('ml-4');
  expect(elementi[0].className).not.toContain('ml-4');
});

it('la sezione originale della guida rimane aperta quando il vecchio riquadro era editoriale',async()=>{
  api.risolviMappa.mockResolvedValue({tipo:'guida',area:'biblioteca',dungeon:'castello',mappaPalazzo:'palazzo',nome:'Biblioteca'});
  render(<MemoryRouter><h1>Scheda originale</h1><MappaIncorporata chiave="vecchia-area"/></MemoryRouter>);
  const link=await screen.findByRole('link',{name:'Apri la planimetria e i contenuti della guida'});
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
// SUPERATO da L11/B5: `AlberoLuoghi` è eliminato; il Covo è un'Area di Yongen-Jaya con le sue cinque versioni come planimetrie dell'albero. Non eseguito.
it.skip('SUPERATO da L11/B5: il Covo presenta cinque immagini selezionabili sotto un solo luogo, senza piani inventati',()=>{});

it.each([{larghezza:null,altezza:null},{larghezza:0,altezza:600},{larghezza:800,altezza:0}])('il riquadro con emblema e dimensioni $larghezza/$altezza apre il luogo senza falsa planimetria',async dimensioni=>{
  api.risolviMappa.mockResolvedValue({tipo:'mappa',mappa:'palazzo'});
  api.getMappa.mockResolvedValue({...m('palazzo',null,'Palazzo di Kamoshida'),asset:'palazzi/kamoshida',...dimensioni,note:'',genitoreNome:null,percorso:[],figli:[m('ingresso','palazzo','Ingresso')],spilli:[]});
  render(<MemoryRouter><MappaIncorporata chiave="palazzo"/></MemoryRouter>);
  expect(await screen.findByRole('link',{name:'Apri Palazzo di Kamoshida'})).toHaveAttribute('href','/guida/mappe/palazzo');
  expect(screen.getByRole('link',{name:'Ingresso'})).toHaveAttribute('href','/guida/mappe/ingresso');
  // le stanze in un'area scorrevole sua, con confine e contenimento: decine di nomi non escono dal riquadro
  expect(screen.getByRole('list',{name:'Planimetrie di Palazzo di Kamoshida'})).toHaveClass('area-scorrevole','min-h-0');
  expect(screen.queryByTestId('visore-mappa')).not.toBeInTheDocument();
});
it('il riquadro con asset nativo e dimensioni positive conserva il visore reale',async()=>{
  api.risolviMappa.mockResolvedValue({tipo:'mappa',mappa:'pianta'});
  useAssetStore.setState({manifest:{generato:'T',totale:1,file:{'mappe/native/RMAP_151_16_0':'/asset/mappe/native/RMAP_151_16_0.png'}},caricato:true,mancanti:{}});
  api.getMappa.mockResolvedValue({...m('pianta',null,'Sala centrale'),asset:'mappe/native/RMAP_151_16_0',larghezza:1536,altezza:1536,note:'',genitoreNome:null,percorso:[],figli:[],spilli:[]});
  render(<MemoryRouter><MappaIncorporata chiave="pianta"/></MemoryRouter>);
  const visore=await screen.findByTestId('visore-mappa');
  expect(within(visore).getByRole('img',{name:'Planimetria di Sala centrale'})).toBeInTheDocument();
  expect(screen.queryByRole('link',{name:/^Apri /})).not.toBeInTheDocument();
});

it.each(['futaba','iweleth','kamoshida','kaneshiro','madarame','maruki','mementos','niijima','okumura','shido'])('l’emblema %s non diventa una planimetria per il solo asset normalizzato',async nome=>{
  api.risolviMappa.mockResolvedValue({tipo:'mappa',mappa:nome});
  api.getMappa.mockResolvedValue({...m(nome,null),asset:`palazzi/${nome}`,larghezza:null,altezza:null,note:'',genitoreNome:null,percorso:[],figli:[],spilli:[]});
  render(<MemoryRouter><MappaIncorporata chiave={nome}/></MemoryRouter>);
  expect(await screen.findByRole('link',{name:`Apri ${nome}`})).toHaveAttribute('href',`/guida/mappe/${nome}`);
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
// SUPERATO da L11/B5: `AlberoLuoghi` è eliminato; i nomi dei nodi dell'albero li dà il server (`NodoGerarchiaDto.nome`). Non eseguito.
it.skip('SUPERATO da L11/B5: il nodo parziale dell’albero usa il padre verificato senza mostrare titolo noto come universale',()=>{});
