import {destinazioneMappaSpillo} from './navigazioneMappa';
import type {SpilloDto} from '../types';
const legacy={riferimento:{tipo:'mappa',chiave:'vecchia'},dettaglio:{tipo:'mappa',mappa:{chiave:'vecchia'}}} as SpilloDto;
it('riconosce il collegamento esplicito al posto del vecchio riferimento',()=>{
  expect(destinazioneMappaSpillo({...legacy,destinazione:{mappa:'nuova',x:25,y:75,zoom:2}})).toBe('nuova');
});
it('non considera raggiungibile un arrivo invalidato',()=>{
  expect(destinazioneMappaSpillo({...legacy,destinazioneNonDisponibile:true})).toBeNull();
});
it('mantiene il collegamento legacy risolto e scarta quello non risolto',()=>{
  expect(destinazioneMappaSpillo(legacy)).toBe('vecchia');
  expect(destinazioneMappaSpillo({...legacy,dettaglio:null})).toBeNull();
});
