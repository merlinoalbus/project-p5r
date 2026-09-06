from pathlib import Path
r=Path('C:/Repository/project-p5r-main')
p=r/'src/components/mappe/DestinazioneSpilloEditor.test.tsx'
s=p.read_text(encoding='utf-8')
s=s.replace("fireEvent.click(button,{clientX:120,clientY:80});", "const img=screen.getByAltText('Arrivo: Sala arrivo');\n  Object.defineProperties(img,{naturalWidth:{value:1024},naturalHeight:{value:1024}});fireEvent.load(img);\n  fireEvent.click(button,{clientX:120,clientY:80,detail:1});")
s+='''
it('ignora Invio sulla preview e richiede entrambe le coordinate esplicite da tastiera',async()=>{
  const onCambia=vi.fn(),onPronto=vi.fn();
  render(<DestinazioneSpilloEditor valore={undefined} invalidata={false} disabilitato={false} onCambia={onCambia} onPronto={onPronto}/>);
  await screen.findByRole('option',{name:'Sala arrivo'});fireEvent.change(screen.getByLabelText('Mappa di arrivo'),{target:{value:'arrivo'}});
  const img=await screen.findByAltText('Arrivo: Sala arrivo');Object.defineProperties(img,{naturalWidth:{value:1024},naturalHeight:{value:1024}});fireEvent.load(img);
  onCambia.mockClear();
  fireEvent.click(screen.getByRole('button',{name:'Scegli il punto di arrivo sulla mappa'}),{detail:0});
  expect(onCambia).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Posizione orizzontale (%)'),{target:{value:'25'}});
  expect(onCambia).not.toHaveBeenCalled();expect(onPronto).toHaveBeenLastCalledWith(false);
  fireEvent.change(screen.getByLabelText('Posizione verticale (%)'),{target:{value:'75'}});
  expect(onCambia).toHaveBeenLastCalledWith({mappa:'arrivo',x:25,y:75,zoom:1});
  fireEvent.change(screen.getByLabelText('Posizione verticale (%)'),{target:{value:''}});
  expect(onPronto).toHaveBeenLastCalledWith(false);
});
it('impedisce selezioni prima del caricamento e dopo errore, permette il retry',async()=>{
  const onCambia=vi.fn();
  render(<DestinazioneSpilloEditor valore={undefined} invalidata={false} disabilitato={false} onCambia={onCambia} onPronto={vi.fn()}/>);
  await screen.findByRole('option',{name:'Sala arrivo'});fireEvent.change(screen.getByLabelText('Mappa di arrivo'),{target:{value:'arrivo'}});
  const button=await screen.findByRole('button',{name:'Scegli il punto di arrivo sulla mappa'});
  expect(button).toBeDisabled();onCambia.mockClear();fireEvent.click(button,{detail:1,clientX:20,clientY:30});expect(onCambia).not.toHaveBeenCalled();
  fireEvent.error(screen.getByAltText('Arrivo: Sala arrivo'));expect(button).toBeDisabled();expect(screen.getByRole('alert')).toHaveTextContent('Impossibile caricare');
  fireEvent.click(screen.getByRole('button',{name:'Riprova immagine'}));expect(button).toBeDisabled();
  const img=screen.getByAltText('Arrivo: Sala arrivo');Object.defineProperties(img,{naturalWidth:{value:1024},naturalHeight:{value:1024}});fireEvent.load(img);
  expect(button).toBeEnabled();expect(onCambia).not.toHaveBeenCalled();
});
'''
p.write_text(s,encoding='utf-8')
(r/'src/utils/navigazioneMappa.test.ts').write_text('''import {destinazioneMappaSpillo} from './navigazioneMappa';
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
''',encoding='utf-8')
