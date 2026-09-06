/** @vitest-environment jsdom */
import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {DestinazioneSpilloEditor} from './DestinazioneSpilloEditor';
import {getAlberoMappe,getMappa} from '../../services/api';
vi.mock('../../services/api',()=>({getAlberoMappe:vi.fn(),getMappa:vi.fn()}));
vi.mock('../../stores/assetStore',()=>({useAsset:()=>null}));
beforeEach(()=>{vi.mocked(getAlberoMappe).mockResolvedValue([{chiave:'arrivo',nome:'Sala arrivo'}] as never);vi.mocked(getMappa).mockResolvedValue({chiave:'arrivo',nome:'Sala arrivo',immagineUrl:'/mappa.png'} as never);});
it('richiede una scelta del punto e converte il click in percentuali senza ritagli impliciti',async()=>{
  const onCambia=vi.fn(),onPronto=vi.fn();
  render(<DestinazioneSpilloEditor valore={undefined} invalidata={false} disabilitato={false} onCambia={onCambia} onPronto={onPronto}/>);
  await screen.findByRole('option',{name:'Sala arrivo'});
  fireEvent.change(screen.getByLabelText('Mappa di arrivo'),{target:{value:'arrivo'}});
  expect(onPronto).toHaveBeenLastCalledWith(false);
  expect(onCambia).toHaveBeenLastCalledWith(null);
  const button=await screen.findByRole('button',{name:'Scegli il punto di arrivo sulla mappa'});
  vi.spyOn(button,'getBoundingClientRect').mockReturnValue({left:20,top:30,width:200,height:100} as DOMRect);
  const img=screen.getByAltText('Arrivo: Sala arrivo');
  Object.defineProperties(img,{naturalWidth:{value:1024},naturalHeight:{value:1024}});fireEvent.load(img);
  fireEvent.click(button,{clientX:120,clientY:80,detail:1});
  expect(onCambia).toHaveBeenLastCalledWith({mappa:'arrivo',x:50,y:50,zoom:1});
  expect(onPronto).toHaveBeenLastCalledWith(true);
});
it('rimuove esplicitamente una destinazione invalidata',()=>{
  const onCambia=vi.fn();render(<DestinazioneSpilloEditor valore={undefined} invalidata disabilitato={false} onCambia={onCambia} onPronto={vi.fn()}/>);
  fireEvent.click(screen.getByRole('button',{name:'Rimuovi destinazione'}));expect(onCambia).toHaveBeenCalledWith(null);
});
it('una mappa senza immagine non produce coordinate inventate',async()=>{
  vi.mocked(getMappa).mockResolvedValue({chiave:'arrivo',nome:'Sala arrivo',immagineUrl:null,asset:null} as never);
  const onCambia=vi.fn();render(<DestinazioneSpilloEditor valore={undefined} invalidata={false} disabilitato={false} onCambia={onCambia} onPronto={vi.fn()}/>);
  await screen.findByRole('option',{name:'Sala arrivo'});fireEvent.change(screen.getByLabelText('Mappa di arrivo'),{target:{value:'arrivo'}});
  await waitFor(()=>expect(screen.getByText(/non ha ancora un’immagine/)).toBeInTheDocument());
  expect(onCambia.mock.calls).toEqual([[null]]);
});

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
