/** @vitest-environment jsdom */
// ============================================================
// Test CollezioniImmagini — famiglie di immagini nell'albero dei luoghi e nella raccolta: intestazione, numerazione stabile, discendenti, omonimi
// ============================================================

import type { FC } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ImmaginiLuogo } from './ImmaginiLuogo';
import type { MappaRiassuntoDto } from '../../types';
// Segnaposto locale tipizzato, SOLO perché il file compili: `AlberoLuoghi` è stato eliminato da L11/B5 (decisione del PM del 24/10). I casi che
// lo usano sono `it.skip` e non si eseguono; il corpo originale è conservato qui sotto.
const AlberoLuoghi: FC<{ mappe: MappaRiassuntoDto[]; genitore?: string; espandibile?: boolean }> = () => null;
/** Riassunto di una mappa di tipo «area» con immagine `/<chiave>.png`; se c'è `indice` fa parte di una collezione di immagini (posizione, totale e ambito). */
function m(chiave:string, genitore:string|null, nome:string, indice?:number, totale=3, ambito='museo'): MappaRiassuntoDto {
  return {chiave,genitore,nome,nomeRivisto:false,tipo:'area',ordine:0,immagineUrl:`/${chiave}.png`,asset:null,radiceDi:null,versione:null,origine:'seed',numeroSpilli:0,numeroFigli:0,updatedAt:'',area:null,casa:`/guida/mappe/${chiave}`,...(indice?{immagineCollezione:{indice,totale,ambito}}:{})};
}
// Saltato (L11 B5): il vecchio albero dei luoghi non esiste più, decisione del PM del 24/10 (le famiglie di immagini non sono più nodi
// dell'albero: l'albero dei luoghi è `AlberoGerarchia`). Corpo originale ripristinato, non eseguito (zero test).
it.skip('una famiglia ha una intestazione e tutte le immagini indipendenti con anteprima',()=>{
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
// Saltati (L11 B5): il vecchio albero dei luoghi non esiste più, decisione del PM del 24/10. Corpi originali ripristinati, non eseguiti (zero test).
it.skip('ogni membro conserva i propri discendenti anche nella raccolta espandibile',()=>{
  render(<MemoryRouter><AlberoLuoghi genitore="p" espandibile mappe={[m('a','p','Museo, 2P',1),m('b','p','Museo, 2P',2),m('figlio-a','a','Deposito A'),m('figlio-b','b','Deposito B')]}/></MemoryRouter>);
  // il riepilogo dice che cosa c'è dentro e di chi (FUN2-7, 2026-10-20): «Planimetrie di Museo, 2P (1)»
  const summaries=screen.getAllByText(/^Planimetrie di .+ \(1\)$/);
  expect(summaries).toHaveLength(2);
  summaries.forEach(s=>fireEvent.click(s));
  expect(screen.getByRole('link',{name:'Deposito A'})).toHaveAttribute('href','/guida/mappe/figlio-a');
  expect(screen.getByRole('link',{name:'Deposito B'})).toHaveAttribute('href','/guida/mappe/figlio-b');
});
it.skip('non fonde omonimi di genitori diversi né nodi privi di famiglia certificata',()=>{
  render(<MemoryRouter><AlberoLuoghi mappe={[m('p',null,'Palazzo A'),m('q',null,'Palazzo B'),m('a','p','Museo',1,2,'famiglia-a'),m('b','q','Museo',1,2,'famiglia-b'),m('altro','p','Museo')]}/></MemoryRouter>);
  expect(screen.getAllByRole('list',{name:'Immagini di Museo'})).toHaveLength(2);
  expect(screen.getByRole('link',{name:'Museo'})).toHaveAttribute('href','/guida/mappe/altro');
  expect(screen.getAllByRole('link',{name:'Immagine 1 di 2'})).toHaveLength(2);
});
it.skip('i nomi sconosciuti mantengono intestazione neutra e identità distinte',()=>{
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
