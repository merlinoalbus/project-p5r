import { etichettaPlanimetria } from '../../utils/presentazioneMappa';
import {useState} from 'react';
import type {DestinazioneSpillo} from '../../types';
import {getAlberoMappe,getMappa} from '../../services/api';
import {useCarica} from '../../hooks/useCarica';
import {useAsset} from '../../stores/assetStore';

interface Props {valore:DestinazioneSpillo|null|undefined;invalidata:boolean;disabilitato:boolean;onCambia:(v:DestinazioneSpillo|null)=>void;onPronto:(v:boolean)=>void}
export function DestinazioneSpilloEditor({valore,invalidata,disabilitato,onCambia,onPronto}:Props){
  const [scelta,setScelta]=useState(valore?.mappa??'');
  const albero=useCarica(()=>getAlberoMappe(),[]);
  const mappa=useCarica(()=>scelta?getMappa(scelta):Promise.resolve(null),[scelta]);
  const asset=useAsset(mappa.dati?.asset);
  const src=mappa.dati?.immagineUrl??asset;
  const punto=valore?.mappa===scelta?valore:null;
  return <fieldset disabled={disabilitato} className="flex flex-col gap-2 border-0 p-0 m-0">
    <legend className="text-[13px] font-semibold">Mappa e punto di arrivo</legend>
    {invalidata&&valore===undefined&&<p role="status">La destinazione precedente è stata eliminata. Scegli un nuovo arrivo oppure rimuovi il collegamento.</p>}
    {albero.errore?<p role="alert">{albero.errore}<button type="button" onClick={()=>void albero.ricarica()}>Riprova</button></p>:<label className="text-[12px]">Mappa di arrivo
      <select className="form-input w-full" value={scelta} onChange={e=>{setScelta(e.target.value);onCambia(null);onPronto(!e.target.value);}}>
        <option value="">Nessuna destinazione</option>
        {(albero.dati??[]).map(m=><option key={m.chiave} value={m.chiave}>{etichettaPlanimetria(m)}</option>)}
      </select>
    </label>}
    {(valore||invalidata)&&<button type="button" className="btn btn-secondary" onClick={()=>{setScelta('');onCambia(null);onPronto(true);}}>Rimuovi destinazione</button>}
    {scelta&&<>
      <p className="text-[12px]">Tocca il punto di arrivo sulla mappa. Il collegamento vale solo nella direzione scelta.</p>
      {mappa.errore&&<p role="alert">{mappa.errore}<button type="button" onClick={()=>void mappa.ricarica()}>Riprova</button></p>}
      {mappa.caricamento&&<p role="status">Caricamento della mappa…</p>}
      {src&&<SelettoreArrivo key={`${scelta}:${src}`} src={src} nome={mappa.dati?.nome??''} punto={punto} onPronto={onPronto} onPunto={(x,y)=>{onCambia({mappa:scelta,x,y,zoom:punto?.zoom??1});onPronto(true);}}/>}
      {!src&&!mappa.caricamento&&!mappa.errore&&<p role="status">Questa mappa non ha ancora un’immagine. Caricala per scegliere il punto di arrivo.</p>}
      {punto&&<label className="text-[12px]">Ingrandimento all’arrivo
        <input className="w-full" type="range" min="1" max="6" step="0.1" value={punto.zoom} onChange={e=>onCambia({...punto,zoom:Number(e.target.value)})}/>
        <span>{Math.round(punto.zoom*100)}%</span>
      </label>}
      {!punto&&<p role="status">Scegli il punto prima di salvare lo spillo.</p>}
    </>}
  </fieldset>;
}

/** Coordinate esplicite anche da tastiera; l'immagine deve essere realmente caricata. */
function SelettoreArrivo({src,nome,punto,onPunto,onPronto}:{src:string;nome:string;punto:DestinazioneSpillo|null;onPunto:(x:number,y:number)=>void;onPronto:(v:boolean)=>void}) {
  const [caricata,setCaricata]=useState(false);
  const [errore,setErrore]=useState(false);
  const [tentativo,setTentativo]=useState(0);
  const [x,setX]=useState(punto?String(punto.x):'');
  const [y,setY]=useState(punto?String(punto.y):'');
  const scegli=(px:number,py:number)=>{setX(String(px));setY(String(py));onPunto(px,py);};
  const modifica=(asse:'x'|'y',v:string)=>{
    const nx=asse==='x'?v:x,ny=asse==='y'?v:y;
    if(asse==='x')setX(v);else setY(v);
    if(nx.trim()&&ny.trim()&&Number.isFinite(Number(nx))&&Number.isFinite(Number(ny))&&Number(nx)>=0&&Number(nx)<=100&&Number(ny)>=0&&Number(ny)<=100)onPunto(Number(nx),Number(ny));
    else onPronto(false);
  };
  return <>
    {errore&&<p role="alert">Impossibile caricare l’immagine di arrivo. <button type="button" onClick={()=>{setErrore(false);setCaricata(false);setTentativo(t=>t+1);}}>Riprova immagine</button></p>}
    <div className="max-h-80 overflow-auto border border-border"><div className="relative">
      <button type="button" disabled={!caricata} className="block w-full border-0 p-0 bg-transparent cursor-crosshair" aria-label="Scegli il punto di arrivo sulla mappa" onClick={e=>{
        if(!caricata||e.detail===0)return;
        const r=e.currentTarget.getBoundingClientRect();if(!r.width||!r.height)return;
        scegli(Math.max(0,Math.min(100,100*(e.clientX-r.left)/r.width)),Math.max(0,Math.min(100,100*(e.clientY-r.top)/r.height)));
      }}><img key={tentativo} src={src} alt={`Arrivo: ${nome}`} className="block w-full h-auto" draggable={false}
        onLoad={e=>{const valida=e.currentTarget.naturalWidth>0&&e.currentTarget.naturalHeight>0;setCaricata(valida);setErrore(!valida);}}
        onError={()=>{setCaricata(false);setErrore(true);}}/></button>
      {punto&&caricata&&<span className="absolute pointer-events-none text-primary text-xl" style={{left:`${punto.x}%`,top:`${punto.y}%`,transform:'translate(-50%,-50%)'}} aria-label="Punto di arrivo scelto">⊕</span>}
    </div></div>
    <p className="text-[12px]">Puoi anche inserire la posizione in percentuale: da sinistra e dall’alto.</p>
    <label>Posizione orizzontale (%)<input type="number" min="0" max="100" step="any" disabled={!caricata} value={x} onChange={e=>modifica('x',e.target.value)}/></label>
    <label>Posizione verticale (%)<input type="number" min="0" max="100" step="any" disabled={!caricata} value={y} onChange={e=>modifica('y',e.target.value)}/></label>
  </>;
}
