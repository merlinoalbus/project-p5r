import { etichettaPlanimetria } from '../../utils/presentazioneMappa';
import { useState } from 'react';
import { getAlberoMappe, getMappa, salvaIngressoQuartiere } from '../../services/api';
import { useCarica } from '../../hooks/useCarica';
import { useAsset } from '../../stores/assetStore';
import type { QuartiereDettaglioDto } from '../../types';
import { notifica } from '../../stores/notificationStore';

export function IngressoQuartiere({quartiere:q,onSalvato,onChiudi}:{quartiere:QuartiereDettaglioDto;onSalvato:()=>Promise<void>;onChiudi:()=>void}) {
 const [mappa,setMappa]=useState(q.ingresso?.mappa??q.mappaChiave??`citta-${q.chiave}`);
 const [ricerca,setRicerca]=useState('');
 const [x,setX]=useState(q.ingresso?.x??50),[y,setY]=useState(q.ingresso?.y??50);
 const [zoom,setZoom]=useState(q.ingresso?.zoom??2.5);
 const [occupato,setOccupato]=useState(false);
 const albero=useCarica(getAlberoMappe,[]),dati=useCarica(()=>getMappa(mappa),[mappa]);
 const asset=useAsset(dati.dati?.asset),originale=useAsset(dati.dati?.assetOriginale);
 const src=dati.dati?.immagineUrl??asset??originale;
 const salva=async(reset=false)=>{setOccupato(true);try {await salvaIngressoQuartiere(q.chiave,reset?null:{mappa,x,y,zoom});await onSalvato();notifica('success',reset?'Ingresso predefinito ripristinato.':'Ingresso del quartiere salvato.');onChiudi();} catch(e){notifica('error',e instanceof Error?e.message:'Salvataggio non riuscito.');} finally {setOccupato(false);}};
 const parole=ricerca.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 const opzioni=(albero.dati??[]).filter(m=>m.chiave===mappa||parole.every(p=>(etichettaPlanimetria(m)).toLocaleLowerCase().includes(p)));
 return <section className="card flex flex-col gap-3" aria-label="Configura ingresso del quartiere">
  <h2 className="m-0 text-lg">Ingresso da Città</h2>
  <p className="m-0 text-sm text-text-secondary">Scegli la mappa e tocca l’immagine nel punto da centrare all’apertura del quartiere.</p>
  <label className="editor-mappa__campo">Cerca una mappa<input className="form-input" value={ricerca} onChange={e=>setRicerca(e.target.value)} placeholder="Nome, area o quartiere" /></label>
  <label className="editor-mappa__campo">Mappa iniziale<select className="form-input" value={mappa} disabled={occupato||albero.caricamento} onChange={e=>{setMappa(e.target.value);setX(50);setY(50);}}>
   {!opzioni.some(v=>v.chiave===mappa)&&<option value={mappa}>{q.ingresso?.nome??q.nome}</option>}
   {opzioni.map(m=><option key={m.chiave} value={m.chiave}>{etichettaPlanimetria(m)}</option>)}
  </select></label>
  {(albero.errore||dati.errore)&&<p role="alert">{albero.errore??dati.errore} <button type="button" className="btn btn-secondary" onClick={()=>{void albero.ricarica();void dati.ricarica();}}>Riprova</button></p>}
  {dati.caricamento?<p role="status">Caricamento della mappa…</p>:src?<div className="ingresso-quartiere__immagine" role="application" aria-label="Punto iniziale: tocca l’immagine o usa le frecce" tabIndex={0}
   onKeyDown={e=>{const delta=e.shiftKey?5:1;if(e.key==='ArrowLeft'){e.preventDefault();setX(v=>Math.max(0,v-delta));}if(e.key==='ArrowRight'){e.preventDefault();setX(v=>Math.min(100,v+delta));}if(e.key==='ArrowUp'){e.preventDefault();setY(v=>Math.max(0,v-delta));}if(e.key==='ArrowDown'){e.preventDefault();setY(v=>Math.min(100,v+delta));}}}
   onClick={e=>{if(occupato)return;const r=e.currentTarget.getBoundingClientRect();setX(Math.round((e.clientX-r.left)/r.width*10000)/100);setY(Math.round((e.clientY-r.top)/r.height*10000)/100);}}>
    <img src={src} alt={`Mappa per l’ingresso: ${dati.dati?.nome??q.nome}`} draggable={false}/>
    <span className="ingresso-quartiere__punto" style={{left:`${x}%`,top:`${y}%`}} aria-hidden="true">+</span>
   </div>:<p>Questa mappa non ha un’immagine. Puoi caricarla dall’editor oppure indicare il punto con le coordinate qui sotto.</p>}
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
   <label className="editor-mappa__campo">Orizzontale (%)<input className="form-input" type="number" min={0} max={100} step={0.01} value={x} onChange={e=>setX(e.target.valueAsNumber)} /></label>
   <label className="editor-mappa__campo">Verticale (%)<input className="form-input" type="number" min={0} max={100} step={0.01} value={y} onChange={e=>setY(e.target.valueAsNumber)} /></label>
   <label className="editor-mappa__campo">Ingrandimento<select className="form-input" value={zoom} onChange={e=>setZoom(Number(e.target.value))}>{[1,1.5,2,2.5,3,4,5,6].map(z=><option key={z} value={z}>{z}×</option>)}</select></label>
  </div>
  <p className="m-0 text-sm" role="status">Punto iniziale: {Number.isFinite(x)?x:'—'}% da sinistra, {Number.isFinite(y)?y:'—'}% dall’alto.</p>
  <div className="flex flex-wrap gap-2">
   <button type="button" className="btn btn-primary touch" disabled={occupato||albero.caricamento||dati.caricamento||!!dati.errore||![x,y].every(v=>Number.isFinite(v)&&v>=0&&v<=100)} onClick={()=>void salva()}>Salva ingresso</button>
   <button type="button" className="btn btn-secondary touch" disabled={occupato} onClick={onChiudi}>Annulla</button>
   {q.ingresso&&<button type="button" className="btn btn-ghost touch" disabled={occupato} onClick={()=>void salva(true)}>Ripristina ingresso predefinito</button>}
  </div>
 </section>;
}
