/** @vitest-environment jsdom */
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AlberoLuoghi } from './AlberoLuoghi';
import { ImmaginiLuogo } from './ImmaginiLuogo';
import type { MappaRiassuntoDto } from '../../types';
function m(chiave:string, genitore:string|null, nome:string, indice?:number, totale=3, ambito='museo'): MappaRiassuntoDto {
  return {chiave,genitore,nome,tipo:'area',ordine:0,immagineUrl:`/${chiave}.png`,asset:null,entita:null,origine:'seed',numeroSpilli:0,numeroFigli:0,updatedAt:'',...(indice?{immagineCollezione:{indice,totale,ambito}}:{})};
}
it('una famiglia ha una intestazione e tutte le immagini indipendenti con anteprima',()=>{
  render(<MemoryRouter><AlberoLuoghi mappe={[m('palazzo',null,'Palazzo di Madarame'),m('b','palazzo','Museo, 2P',2),m('a','palazzo','Museo, 2P',1),m('c','palazzo','Museo, 2P',3)]}/></MemoryRouter>);
  expect(screen.getAllByRole('heading',{name:'Museo, 2P'})).toHaveLength(1);
  const gruppo=within(screen.getByRole('list',{name:'Immagini di Museo, 2P'}));
  expect(gruppo.getAllByRole('link').map(l=>l.getAttribute('href'))).toEqual(['/guida/mappe/a','/guida/mappe/b','/guida/mappe/c']);
  expect(gruppo.getByRole('link',{name:'Immagine 2 di 3'}).querySelector('img')).toHaveAttribute('src','/b.png');
});
it('filtrare la raccolta non rinumera le immagini e conserva quella corrente',()=>{
  render(<MemoryRouter><ImmaginiLuogo mappe={[m('c','p','Museo, 2P',3)]} nome="Museo, 2P" attuale="c"/></MemoryRouter>);
  expect(screen.getByRole('link',{name:'Immagine 3 di 3'})).toHaveAttribute('aria-current','page');
  expect(screen.queryByText('Immagine 1 di 1')).not.toBeInTheDocument();
});
it('ogni membro conserva i propri discendenti anche nella raccolta espandibile',()=>{
  render(<MemoryRouter><AlberoLuoghi genitore="p" espandibile mappe={[m('a','p','Museo, 2P',1),m('b','p','Museo, 2P',2),m('figlio-a','a','Deposito A'),m('figlio-b','b','Deposito B')]}/></MemoryRouter>);
  const summaries=screen.getAllByText('Luoghi e planimetrie (1)');
  expect(summaries).toHaveLength(2);
  summaries.forEach(s=>fireEvent.click(s));
  expect(screen.getByRole('link',{name:'Deposito A'})).toHaveAttribute('href','/guida/mappe/figlio-a');
  expect(screen.getByRole('link',{name:'Deposito B'})).toHaveAttribute('href','/guida/mappe/figlio-b');
});
it('non fonde omonimi di genitori diversi né nodi privi di famiglia certificata',()=>{
  render(<MemoryRouter><AlberoLuoghi mappe={[m('p',null,'Palazzo A'),m('q',null,'Palazzo B'),m('a','p','Museo',1,2,'famiglia-a'),m('b','q','Museo',1,2,'famiglia-b'),m('altro','p','Museo')]}/></MemoryRouter>);
  expect(screen.getAllByRole('list',{name:'Immagini di Museo'})).toHaveLength(2);
  expect(screen.getByRole('link',{name:'Museo'})).toHaveAttribute('href','/guida/mappe/altro');
  expect(screen.getAllByRole('link',{name:'Immagine 1 di 2'})).toHaveLength(2);
});
it('i nomi sconosciuti mantengono intestazione neutra e identità distinte',()=>{
  const famiglia=[m('a','p','Area tecnica',1,2),m('b','p','Area tecnica',2,2)].map(x=>({...x,genitoreNome:'Palazzo di Madarame',contesti:[{id:x.chiave,nome:null,campo:'F153_051_00',texpack:1}]}));
  render(<MemoryRouter><AlberoLuoghi genitore="p" mappe={famiglia}/></MemoryRouter>);
  expect(screen.getByRole('heading',{name:'Palazzo di Madarame — Planimetria'})).toBeInTheDocument();
  expect(screen.queryByText('Area tecnica')).not.toBeInTheDocument();
  expect(screen.getAllByRole('link')).toHaveLength(2);
});
it('senza anteprima il membro resta selezionabile e lo spareggio di ordine è stabile',()=>{
  render(<MemoryRouter><ImmaginiLuogo mappe={[{...m('b','p','Covo'),immagineUrl:null},{...m('a','p','Covo'),immagineUrl:null}]} nome="Covo"/></MemoryRouter>);
  expect(screen.getAllByRole('link').map(l=>l.getAttribute('href'))).toEqual(['/guida/mappe/a','/guida/mappe/b']);
});
