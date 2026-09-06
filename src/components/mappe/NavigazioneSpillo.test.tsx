/** @vitest-environment jsdom */
import {render,screen,fireEvent} from '@testing-library/react';
import {NavigazioneSpillo} from './NavigazioneSpillo';
import {urlMappa} from '../../utils/navigazioneMappa';
import type {SpilloDto} from '../../types';

const base:SpilloDto={id:1,mappaChiave:'origine',tipo:'passaggio',tipoNome:'Passaggio',nome:'Collegamento',colore:'#fff',descrizione:'',x:10,y:20,riferimento:{tipo:'mappa',chiave:'vecchia'},collezionabile:false,condizioni:[],ordine:0,origine:'utente',raccolto:false,immagini:[],updatedAt:'2026-09-06',dettaglio:{tipo:'mappa',mappa:{chiave:'vecchia',nome:'Vecchia',tipo:'area'}},destinazione:{mappa:'nuova',x:23,y:67,zoom:2.5}};

it.each(['passaggio','treno','attivita','rampino','scorciatoia','porta'] as const)('%s raggiunge il punto esplicito preservando la destinazione rispetto al riferimento',tipo=>{
  const onNaviga=vi.fn();render(<NavigazioneSpillo spillo={{...base,tipo}} partitaId={null} onNaviga={onNaviga}/>);
  fireEvent.click(screen.getByRole('button',{name:'Raggiungi il punto di arrivo'}));
  expect(onNaviga).toHaveBeenCalledWith('nuova',{x:23,y:67,zoom:2.5});
  expect(screen.queryByRole('button',{name:/Apri: Vecchia/})).not.toBeInTheDocument();
});
it('blocca lo spostamento nella partita corrente, anche con una destinazione precisa',()=>{
  const onNaviga=vi.fn();
  render(<NavigazioneSpillo spillo={{...base,disponibilita:{stato:'bloccato',requisiti:[]}}} partitaId={7} onNaviga={onNaviga}/>);
  const button=screen.getByRole('button');expect(button).toBeDisabled();fireEvent.click(button);expect(onNaviga).not.toHaveBeenCalled();
});
it('destinazione eliminata non ripiega sul riferimento precedente',()=>{
  const onNaviga=vi.fn();render(<NavigazioneSpillo spillo={{...base,destinazione:null,destinazioneNonDisponibile:true}} partitaId={null} onNaviga={onNaviga}/>);
  expect(screen.getByRole('status')).toHaveTextContent('non è più disponibile');expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
it('conserva i vecchi collegamenti senza punto di arrivo',()=>{
  const onNaviga=vi.fn();render(<NavigazioneSpillo spillo={{...base,destinazione:null}} partitaId={null} onNaviga={onNaviga}/>);
  fireEvent.click(screen.getByRole('button',{name:'Apri: Vecchia'}));expect(onNaviga).toHaveBeenCalledWith('vecchia');
});
it('codifica mappa e punto di arrivo senza mescolare query e identità',()=>{
  expect(urlMappa('stessa mappa',{x:0,y:100,zoom:6})).toBe('/guida/mappe/stessa%20mappa?x=0&y=100&zoom=6');
  expect(urlMappa('stessa mappa')).toBe('/guida/mappe/stessa%20mappa');
});

it.each([null,7])('posizione con partita %s non autorizza trasferimento nemmeno se ha un arrivo',partitaId=>{
 const onNaviga=vi.fn();render(<NavigazioneSpillo spillo={{...base,soloPosizione:true}} partitaId={partitaId} onNaviga={onNaviga}/>);
 expect(screen.queryByRole('button')).not.toBeInTheDocument();
 expect(screen.getByText(/Posizione del luogo/)).toBeInTheDocument();
 expect(onNaviga).not.toHaveBeenCalled();
});
