/** @vitest-environment jsdom */
// ============================================================
// Test CollezioniImmagini — famiglie di immagini nell'albero dei luoghi e nella raccolta: intestazione, numerazione stabile, discendenti, omonimi
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ImmaginiLuogo } from './ImmaginiLuogo';
import type { MappaRiassuntoDto } from '../../types';
/** Riassunto di una mappa di tipo «area» con immagine `/<chiave>.png`; se c'è `indice` fa parte di una collezione di immagini (posizione, totale e ambito). */
function m(chiave:string, genitore:string|null, nome:string, indice?:number, totale=3, ambito='museo'): MappaRiassuntoDto {
  return {chiave,genitore,nome,nomeRivisto:false,tipo:'area',ordine:0,immagineUrl:`/${chiave}.png`,asset:null,entita:null,origine:'seed',numeroSpilli:0,numeroFigli:0,updatedAt:'',area:null,casa:`/guida/mappe/${chiave}`,...(indice?{immagineCollezione:{indice,totale,ambito}}:{})};
}
// SUPERATO da L11/B5 (R11-12/5): `AlberoLuoghi` è eliminato (le famiglie di immagini non sono più nodi dell'albero: l'albero dei luoghi è
// `AlberoGerarchia`). Corpo originale tolto per compilare; non eseguito (zero test).
it.skip('SUPERATO da L11/B5: una famiglia ha una intestazione e tutte le immagini indipendenti con anteprima',()=>{});
it('filtrare la raccolta non rinumera le immagini e conserva quella corrente',()=>{
  render(<MemoryRouter><ImmaginiLuogo mappe={[m('c','p','Museo, 2P',3)]} nome="Museo, 2P" attuale="c"/></MemoryRouter>);
  expect(screen.getByRole('link',{name:'Immagine 3 di 3'})).toHaveAttribute('aria-current','page');
  expect(screen.queryByText('Immagine 1 di 1')).not.toBeInTheDocument();
});
// SUPERATI da L11/B5 (R11-12/5): `AlberoLuoghi` è eliminato; corpi originali tolti per compilare; non eseguiti (zero test).
it.skip('SUPERATO da L11/B5: ogni membro conserva i propri discendenti anche nella raccolta espandibile',()=>{});
it.skip('SUPERATO da L11/B5: non fonde omonimi di genitori diversi né nodi privi di famiglia certificata',()=>{});
it.skip('SUPERATO da L11/B5: i nomi sconosciuti mantengono intestazione neutra e identità distinte',()=>{});
it('senza anteprima il membro resta selezionabile e lo spareggio di ordine è stabile',()=>{
  render(<MemoryRouter><ImmaginiLuogo mappe={[{...m('b','p','Covo'),immagineUrl:null},{...m('a','p','Covo'),immagineUrl:null}]} nome="Covo"/></MemoryRouter>);
  expect(screen.getAllByRole('link').map(l=>l.getAttribute('href'))).toEqual(['/guida/mappe/a','/guida/mappe/b']);
});
