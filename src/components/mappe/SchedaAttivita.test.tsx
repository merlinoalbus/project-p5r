/** @vitest-environment jsdom */
import {render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {SchedaSpillo} from './VisoreMappa';
import type {SpilloDto} from '../../types';

it.each(['attivita','luogo'] as const)('mostra la scheda Attività con riferimento %s',tipo=>{
  const spillo:SpilloDto={id:1,mappaChiave:'scuola',tipo:'attivita',tipoNome:'Attività',colore:'#fff',nome:'Interazione',descrizione:'',x:20,y:30,riferimento:{tipo,chiave:'scuola/biblioteca'},collezionabile:false,condizioni:[],ordine:0,origine:'utente',raccolto:false,immagini:[],updatedAt:'2026-09-06',dettaglio:{tipo,luogo:{chiave:'scuola/biblioteca',quartiere:'shujin-academy',tipo:'attivita',nome:'Biblioteca',cosaOffre:'Consulta i libri',quando:'Dopo scuola'}}};
  render(<MemoryRouter><SchedaSpillo spillo={spillo} partitaId={null} occupato={false} onNaviga={vi.fn()} onChiudi={vi.fn()} onCentra={vi.fn()}/></MemoryRouter>);
  expect(screen.getByText(/Consulta i libri/)).toBeInTheDocument();
  expect(screen.getByText(/Dopo scuola/)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'scheda del quartiere'})).toHaveAttribute('href','/guida/citta/shujin-academy');
});
