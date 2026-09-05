import { useState } from 'react';
import { usePartitaStore } from '../../stores/partitaStore';
import { useSuggerimentiStore } from '../../stores/suggerimentiStore';
import { useCarica } from '../../hooks/useCarica';
import { getStatiPartita,salvaStatoPartita,type FattoGioco } from '../../services/api/condizioni';
import { NuovoStato } from '../guida/CondizioniEditor';
import { notifica } from '../../stores/notificationStore';
function Valore({f,id,onSalvato}:{f:FattoGioco;id:number;onSalvato:()=>void}){
  const [valore,setValore]=useState(f.valore?.toString()??''),[occupato,setOccupato]=useState(false);
  return <div className="regole-riga"><label className="editor-mappa__campo">{f.nome}{f.unita&&` (${f.unita})`}<input className="form-input" type="number" min={0} max={9999999} value={valore} onChange={e=>setValore(e.target.value)}/></label><span className="text-sm">{f.categoria==='evento'||f.categoria==='attivita'||f.categoria==='quartiere'?'1 = avvenuto/sbloccato; 0 = non avvenuto/bloccato. ':''}Vuoto = non registrato.</span><button className="btn touch" disabled={occupato||(valore!==''&&(!Number.isInteger(Number(valore))||Number(valore)<0||Number(valore)>9999999))} onClick={()=>{setOccupato(true);void salvaStatoPartita(id,f.chiave,valore===''?null:Number(valore)).then(()=>{useSuggerimentiStore.getState().invalida();onSalvato();notifica('success','Stato della partita salvato.');}).catch(e=>notifica('error',String(e))).finally(()=>setOccupato(false));}}>Salva stato</button></div>;
}
export function StatiPartita(){
  const id=usePartitaStore(s=>s.attiva?.id);const dati=useCarica(()=>id?getStatiPartita(id):Promise.resolve([]),[id]);
  return <section className="card"><h2>Stati della partita</h2><p>Registra eventi, attività, quantità e gradi usati dalle condizioni. Ogni partita mantiene i propri valori.</p>{!id?<p>Seleziona una partita per registrarne lo stato.</p>:dati.errore?<p role="alert">{dati.errore}</p>:dati.dati?.map(f=><Valore key={`${id}/${f.chiave}/${f.valore}`} id={id} f={f} onSalvato={()=>void dati.ricarica()}/>)}<NuovoStato onCreato={()=>void dati.ricarica()}/></section>;
}
