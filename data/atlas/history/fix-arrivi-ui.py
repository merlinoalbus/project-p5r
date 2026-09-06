from pathlib import Path
r=Path('C:/Repository/project-p5r-main')
p=r/'src/components/mappe/DestinazioneSpilloEditor.tsx'
s=p.read_text(encoding='utf-8')
a=s.index('      {src&&<div')
b=s.index('      {!src',a)
s=s[:a]+'''      {src&&<SelettoreArrivo key={`${scelta}:${src}`} src={src} nome={mappa.dati?.nome??''} punto={punto} onPronto={onPronto} onPunto={(x,y)=>{onCambia({mappa:scelta,x,y,zoom:punto?.zoom??1});onPronto(true);}}/>}
'''+s[b:]
s+='''
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
'''
p.write_text(s,encoding='utf-8')
p=r/'src/utils/navigazioneMappa.ts'
s=p.read_text(encoding='utf-8').replace('DestinazioneSpillo }','DestinazioneSpillo, SpilloDto }')
s+='''
/** Stessa precedenza del visore, senza ripiegare su riferimenti invalidati. */
export function destinazioneMappaSpillo(s: SpilloDto): string | null {
  if(s.destinazioneNonDisponibile)return null;
  if(s.destinazione)return s.destinazione.mappa;
  return s.dettaglio?.tipo==='mappa'?s.dettaglio.mappa?.chiave??null:null;
}
'''
p.write_text(s,encoding='utf-8')
p=r/'src/pages/EditorMappaPage.tsx'
s=p.read_text(encoding='utf-8')
s="import { destinazioneMappaSpillo } from '../utils/navigazioneMappa';\n"+s
s=s.replace("s.riferimento?.tipo === 'mappa' && s.riferimento.chiave === destinazione","destinazioneMappaSpillo(s) === destinazione")
p.write_text(s,encoding='utf-8')
