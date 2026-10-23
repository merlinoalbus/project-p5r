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
import type { FC } from 'react';
import { MappaIncorporata } from './MappaIncorporata';
import { RisolviMappa } from './RisolviMappa';
import { ContenutiGuidaMappa } from './ContenutiGuidaMappa';
// Segnaposto locale tipizzato, SOLO perché il file compili: `AlberoLuoghi` è stato eliminato da L11/B5 (decisione del PM del 24/10). I casi che
// lo usano sono `it.skip` e non si eseguono; i corpi originali sono conservati qui sotto.
const AlberoLuoghi: FC<{ mappe: MappaRiassuntoDto[]; genitore?: string; espandibile?: boolean }> = () => null;
const api = vi.hoisted(() => ({risolviMappa:vi.fn(),getContenutiMappa:vi.fn(),getMappa:vi.fn()}));
vi.mock('../../services/api', (vero) => moduloApi(vero, api));
/** Riassunto minimo di una mappa di tipo «luogo» con la chiave, il genitore e il nome dati (nome predefinito = chiave), senza immagine né spilli. */
function m(chiave:string,genitore:string|null,nome=chiave):MappaRiassuntoDto { return {chiave,genitore,nome,nomeRivisto:false,tipo:'luogo',ordine:0,immagineUrl:null,asset:null,entita:null,origine:'utente',numeroSpilli:0,numeroFigli:0,updatedAt:'',area:null,casa:`/guida/mappe/${chiave}`}; }
/** Rotta di arrivo dei test: scrive a schermo percorso e query dell'indirizzo corrente, per verificare dove ha portato un reindirizzamento. */
function Indirizzo(){ const p=useLocation();return <div>{p.pathname}{p.search}</div>; }
beforeEach(()=>{vi.resetAllMocks();usePreferenzeStore.setState({graficaPredefinita:true});useAssetStore.setState({manifest:null,caricato:true,mancanti:{}});});
// Saltati (L11 B5): il vecchio albero dei luoghi non esiste più, decisione del PM del 24/10 (l'indice è l'albero della gerarchia,
// `AlberoGerarchia`, dal server). Corpi originali ripristinati, non eseguiti (zero test).
it.skip('rende ogni profondità e mantiene distinti gli omonimi senza icone di passaggio',()=>{
  render(<MemoryRouter><AlberoLuoghi mappe={[m('tokyo',null),m('scuola','tokyo'),m('edificio','scuola'),m('piano','edificio','Primo piano'),m('palazzo',null),m('altro','palazzo','Primo piano')]} /></MemoryRouter>);
  const nomi=screen.getAllByRole('link',{name:'Primo piano'});expect(nomi).toHaveLength(2);
  expect(nomi.map(n=>n.getAttribute('href'))).toEqual(['/guida/mappe/piano','/guida/mappe/altro']);
  expect(screen.getAllByRole('link')).toHaveLength(6);
});
it.skip('L2 (2026-10-20): le versioni di un’Area sono una voce sola col nome dell’Area, verso la sua casa, e il gruppo si chiama «Aree di …»',()=>{
  const area=(versioneOrdine:number,predefinita:boolean)=>({chiave:'citta/shibuya/sottopasso',contenitore:{tipo:'quartiere' as const,chiave:'shibuya',nome:'Shibuya'},slug:'sottopasso',nome:'Sottopasso',versioneEtichetta:null,versioneOrdine,predefinita,casa:'/guida/citta/shibuya/sottopasso'});
  const quartiere={...m('shibuya','tokyo','Shibuya'),tipo:'quartiere' as const,casa:'/guida/citta/shibuya'};
  const v1={...m('shibuya-sottopasso','shibuya','Sottopasso'),numeroSpilli:3,area:area(0,true),casa:'/guida/citta/shibuya/sottopasso'};
  const v2={...m('shibuya-sottopasso-speciale','shibuya','Sottopasso Speciale'),numeroSpilli:2,area:area(1,false),casa:'/guida/citta/shibuya/sottopasso?planimetria=shibuya-sottopasso-speciale'};
  render(<MemoryRouter><AlberoLuoghi genitore="shibuya" mappe={[quartiere,v2,v1,m('shibuya-diner','shibuya','Diner')]}/></MemoryRouter>);
  const gruppo=screen.getByRole('list',{name:'Aree di Shibuya'});
  const voce=within(gruppo).getByRole('link',{name:/^Sottopasso/});
  expect(voce).toHaveAttribute('href','/guida/citta/shibuya/sottopasso');
  // E5: il conteggio accanto alla voce, con la parola dell'indice
  expect(voce.parentElement).toHaveTextContent('2 versioni · 5 pin');
  expect(within(gruppo).queryByRole('link',{name:/Speciale/})).toBeNull();
  expect(within(gruppo).getAllByRole('link')).toHaveLength(2);
});
it.skip('FUN2-7: aperto Tokyo, il gruppo di un quartiere si chiama «Aree di …» e conta le aree, non le planimetrie',()=>{
  const area=(slug:string,nome:string,versioneOrdine:number)=>({chiave:`citta/yongen-jaya/${slug}`,contenitore:{tipo:'quartiere' as const,chiave:'yongen-jaya',nome:'Yongen-Jaya'},slug,nome,versioneEtichetta:null,versioneOrdine,predefinita:versioneOrdine===0,casa:`/guida/citta/yongen-jaya/${slug}`});
  const quartiere={...m('yongen-jaya','tokyo','Yongen-Jaya'),tipo:'quartiere' as const};
  const covo=[0,1,2].map(i=>({...m(`covo-${i}`,'yongen-jaya','Covo'),area:area('covo-dei-ladri','Covo dei Ladri',i)}));
  render(<MemoryRouter><AlberoLuoghi genitore="tokyo" espandibile mappe={[{...m('tokyo',null,'Tokyo'),tipo:'citta'},quartiere,{...m('vicoli','yongen-jaya','Vicoli'),area:area('vicoli','Vicoli',0)},...covo]}/></MemoryRouter>);
  expect(screen.getByText('Aree di Yongen-Jaya (2)')).toBeInTheDocument();
});
// R1 (validatore L2, giro 1): l'area dello staff di Tokyo, in attesa della scelta dell'utente, porta il segno «Da verificare» anche
// nell'indice, con lo stesso aspetto della pagina Area e delle Aree della città; le altre aree no
it.skip('R1: nell’indice un’area da verificare porta il segno «Da verificare», come nella pagina Area',()=>{
  const area=(slug:string,nome:string,daVerificare:boolean)=>({chiave:`citta/tokyo/${slug}`,contenitore:{tipo:'citta' as const,chiave:'tokyo',nome:'Tokyo'},slug,nome,versioneEtichetta:null,versioneOrdine:0,predefinita:true,casa:`/guida/citta/tokyo/${slug}`,daVerificare});
  render(<MemoryRouter><AlberoLuoghi genitore="tokyo" mappe={[{...m('tokyo',null,'Tokyo'),tipo:'citta'},{...m('staff','tokyo','Area riservata allo staff'),area:area('staff','Area riservata allo staff',true)},{...m('torre','tokyo','Torre'),area:area('torre','Torre',false)}]}/></MemoryRouter>);
  const staff=screen.getByRole('link',{name:/^Area riservata allo staff/});
  const segno=within(staff.parentElement!).getByText('Da verificare');
  expect(segno).toHaveClass('chip','chip--attivo','text-[11px]');
  expect(segno).toHaveAttribute('title','Nessuna fonte colloca questa area: decidi se tenerla o rimuoverla');
  expect(within(screen.getByRole('link',{name:/^Torre/}).parentElement!).queryByText('Da verificare')).toBeNull();
});
// E5 (analisi dell'Elenco delle mappe, L2): lo stesso conteggio e la stessa parola su ogni riga — Area con più versioni, Area con una
// versione, quartiere —; dal rilascio di L3 la parola è «pin». E7: l'Area da verificare (lo staff) non sta fra i quartieri ma in un
// gruppo «Da verificare» di Tokyo, accanto all'elenco dei quartieri e non dentro
it.skip('E5 ed E7: ogni riga dell’Elenco dice i suoi pin con la stessa parola; l’Area da verificare sta nel gruppo «Da verificare»',()=>{
  const area=(slug:string,nome:string,genitore:string,versioneOrdine:number,daVerificare=false)=>({chiave:`citta/${genitore}/${slug}`,contenitore:{tipo:(genitore==='tokyo'?'citta':'quartiere') as 'citta'|'quartiere',chiave:genitore,nome:genitore},slug,nome,versioneEtichetta:null,versioneOrdine,predefinita:versioneOrdine===0,casa:`/guida/citta/${genitore}/${slug}`,daVerificare});
  const tokyo={...m('tokyo',null,'Tokyo'),tipo:'citta' as const};
  const shibuya={...m('citta-shibuya','tokyo','Shibuya'),tipo:'quartiere' as const,numeroSpilli:4};
  const ueno={...m('citta-ueno','tokyo','Ueno'),tipo:'quartiere' as const,numeroSpilli:1};
  const staff=[0,1].map(i=>({...m(`staff-${i}`,'tokyo','Area riservata allo staff'),numeroSpilli:0,area:area('staff','Area riservata allo staff','tokyo',i,true)}));
  const sottopasso=[0,1].map(i=>({...m(`sottopasso-${i}`,'citta-shibuya','Sottopasso'),numeroSpilli:3+i,area:area('sottopasso','Sottopasso','citta-shibuya',i)}));
  const diner={...m('diner','citta-shibuya','Diner'),numeroSpilli:1,area:area('diner','Diner','citta-shibuya',0)};
  render(<MemoryRouter><AlberoLuoghi genitore="tokyo" mappe={[tokyo,shibuya,ueno,...staff,...sottopasso,diner]}/></MemoryRouter>);
  // ogni riga col suo conteggio, una sola parola (accanto al collegamento, che si chiama come il posto)
  const riga=(nome:string)=>screen.getByRole('link',{name:nome}).parentElement!;
  expect(riga('Shibuya')).toHaveTextContent(/^Shibuya4 pin$/);
  expect(riga('Ueno')).toHaveTextContent(/^Ueno1 pin$/);
  expect(riga('Sottopasso')).toHaveTextContent(/^Sottopasso2 versioni · 7 pin$/);
  expect(riga('Diner')).toHaveTextContent(/^Diner1 pin$/);
  expect(document.body).not.toHaveTextContent(/spill/);
  // lo staff non è fra i quartieri: i quartieri di Tokyo sono esattamente Shibuya e Ueno (le voci di primo livello dell'elenco), e il
  // gruppo «Da verificare» sta fuori dall'elenco dei quartieri, con lo staff e nient'altro
  const quartieri=screen.getByRole('list',{name:'Quartieri di Tokyo'});
  const vociDeiQuartieri=[...quartieri.children].map(li=>li.querySelector('a')?.textContent);
  expect(vociDeiQuartieri).toEqual(['Shibuya','Ueno']);
  expect(within(quartieri).queryByRole('link',{name:'Area riservata allo staff'})).toBeNull();
  const daVerificare=screen.getByRole('list',{name:'Da verificare'});
  expect(quartieri.contains(daVerificare)).toBe(false);
  expect(within(daVerificare).getAllByRole('link').map(a=>a.textContent)).toEqual(['Area riservata allo staff']);
  expect(within(daVerificare).getByRole('link',{name:'Area riservata allo staff'}).parentElement).toHaveTextContent('2 versioni · nessun pin');
});
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
// Saltato (L11 B5): il vecchio albero dei luoghi non esiste più, decisione del PM del 24/10 (il Covo è un'Area di Yongen-Jaya con le sue cinque
// versioni come planimetrie dell'albero). Corpo originale ripristinato, non eseguito.
it.skip('il Covo presenta cinque immagini selezionabili sotto un solo luogo, senza piani inventati',()=>{
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
// Saltato (L11 B5): il vecchio albero dei luoghi non esiste più, decisione del PM del 24/10 (i nomi dei nodi li dà il server, `NodoGerarchiaDto.nome`).
// Corpo originale ripristinato, non eseguito.
it.skip('il nodo parziale dell’albero usa il padre verificato senza mostrare titolo noto come universale',()=>{
  render(<MemoryRouter><AlberoLuoghi mappe={[m('padre',null,'Palazzo di Madarame'),{...m('risorsa','padre','Area 4 — RMAP 153'),genitoreNome:'Palazzo di Madarame',contesti:[{id:'normale',nome:'Ripostiglio',campo:'F153_004_00',texpack:102},{id:'safe',nome:null,campo:'F153_051_00',texpack:103}]}]}/></MemoryRouter>);
  expect(screen.getByRole('link',{name:'Palazzo di Madarame — Planimetria'})).toHaveAttribute('href','/guida/mappe/risorsa');
  expect(screen.queryByRole('link',{name:'Ripostiglio'})).not.toBeInTheDocument();
  expect(screen.queryByText(/RMAP/)).not.toBeInTheDocument();
});
