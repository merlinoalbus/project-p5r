import { useState } from 'react';
import { CondizioniSpilloEditor } from '../mappe/CondizioniSpillo';
import { descriviRequisitoSpillo, type RequisitoSpillo } from '../../../shared/condizioniSpillo';
import { useCarica } from '../../hooks/useCarica';
import { getConfidenti, getDungeons, getQuartieri, getRichieste } from '../../services/api/compendio';
import { creaStato, getElenchiRegole, type ElenchiRegole } from '../../services/api/condizioni';
import { ELENCHI_VUOTI, nomiDaElenchi, type ElenchiCondizioni } from '../../utils/condizioniSpillo';
import { notifica } from '../../stores/notificationStore';

export function NuovoStato({onCreato}:{onCreato:()=>void}) {
  const [nome,setNome]=useState(''),[categoria,setCategoria]=useState('evento'),[unita,setUnita]=useState(''),[occupato,setOccupato]=useState(false);
  return <details><summary className="touch">Definisci un nuovo stato da registrare</summary>
    <p className="text-sm">Un fatto o un valore della partita, per esempio “Pesca effettuata” oppure “Punti cliente”. La condizione confronterà il valore registrato, senza interpretare il nome.</p>
    <label className="editor-mappa__campo">Nome dello stato<input className="form-input" value={nome} maxLength={160} onChange={e=>setNome(e.target.value)} /></label>
    <label className="editor-mappa__campo">Categoria dello stato<select className="form-input" value={categoria} onChange={e=>setCategoria(e.target.value)}>{Object.entries({evento:'Evento di trama',attivita:'Attività svolta',oggetto:'Oggetto posseduto',grado:'Grado cliente',contatore:'Contatore',quartiere:'Area sbloccata'}).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label>
    <label className="editor-mappa__campo">Unità di misura (facoltativa)<input className="form-input" value={unita} maxLength={40} onChange={e=>setUnita(e.target.value)} /></label>
    <button className="btn touch" type="button" disabled={!nome.trim()||occupato} onClick={()=>{setOccupato(true);void creaStato({nome,categoria,unita}).then(()=>{setNome('');onCreato();}).catch(e=>notifica('error',String(e))).finally(()=>setOccupato(false));}}>Crea stato</button>
  </details>;
}

function AggiungiRequisito({onAggiungi,elenchi,extra,esistenti}:{esistenti:RequisitoSpillo[];onAggiungi:(r:RequisitoSpillo)=>void;elenchi:ElenchiCondizioni;extra:ElenchiRegole}) {
  const [tipo,setTipo]=useState('calendario'),[chiave,setChiave]=useState(''),[abilita,setAbilita]=useState(''),[valore,setValore]=useState(1),[confronto,setConfronto]=useState<'almeno'|'uguale'|'massimo'>('almeno');
  const opzioni=tipo==='stato'?extra.stati:tipo==='articolo'?extra.articoli.map(a=>({...a,nome:a.gruppo+' › '+a.nome})):tipo==='libro'||tipo==='film'?extra.letture.filter(l=>l.categoria===tipo):tipo==='persona-arcano'?extra.arcani:extra.persone;
  const scelta=opzioni.some(o=>o.chiave===chiave)?chiave:opzioni[0]?.chiave??'';
  const skill=extra.abilita.some(o=>o.chiave===abilita)?abilita:extra.abilita[0]?.chiave??'';
  const aggiungi=()=>{
    if(!scelta)return;
    if(tipo==='stato')onAggiungi({tipo:'stato',chiave:scelta,confronto,valore});
    else if(tipo==='articolo')onAggiungi({tipo:'articolo',articolo:scelta});
    else if(tipo==='libro'||tipo==='film')onAggiungi({tipo:'lettura',categoria:tipo,chiave:scelta});
    else if(tipo==='persona-arcano')onAggiungi({tipo:'persona-arcano',arcano:scelta});
    else if(tipo==='persona-abilita'&&skill)onAggiungi({tipo:'persona-abilita',persona:scelta,abilita:skill});
  };
  return <details className="regole-aggiunta"><summary className="touch">Aggiungi una condizione</summary>
    <label className="editor-mappa__campo">Famiglia della condizione<select className="form-input" value={tipo} onChange={e=>setTipo(e.target.value)}>
      <option value="calendario">Calendario, meteo, Doti, Confidenti, Palazzi e richieste</option><option value="stato">Evento, attività, oggetto posseduto, grado o contatore</option><option value="articolo">Articolo acquistato / ottenuto</option><option value="libro">Libro letto</option><option value="film">Film visto</option><option value="persona-arcano">Persona di un Arcano in scorta</option><option value="persona-abilita">Persona con una precisa abilità in scorta</option>
    </select></label>
    {tipo==='calendario'?<CondizioniSpilloEditor soloAggiunta condizioni={esistenti} onCambia={r=>{const c=r.at(-1);if(c)onAggiungi(c);}} elenchi={elenchi}/>:<>
      <label className="editor-mappa__campo">Elemento richiesto<select className="form-input" value={scelta} onChange={e=>setChiave(e.target.value)}>{opzioni.map(o=><option key={o.chiave} value={o.chiave}>{o.nome}</option>)}</select></label>
      {!scelta&&<p>Nessun elemento disponibile. Definisci uno stato qui sotto.</p>}
      {tipo==='persona-abilita'&&<label className="editor-mappa__campo">Abilità richiesta<select className="form-input" value={skill} onChange={e=>setAbilita(e.target.value)}>{extra.abilita.map(a=><option key={a.chiave} value={a.chiave}>{a.nome}</option>)}</select></label>}
      {tipo==='stato'&&<><label className="editor-mappa__campo">Confronto<select className="form-input" value={confronto} onChange={e=>setConfronto(e.target.value as typeof confronto)}><option value="almeno">Almeno</option><option value="uguale">Uguale a</option><option value="massimo">Al massimo</option></select></label><label className="editor-mappa__campo">Valore richiesto<input className="form-input" type="number" min={0} max={9999999} value={valore} onChange={e=>setValore(Number(e.target.value))}/></label><p className="text-sm">Per un evento: 1 = avvenuto, 0 = non avvenuto. Per quantità e gradi, indica il numero richiesto.</p></>}
      <button className="btn touch" type="button" disabled={!scelta||!Number.isInteger(valore)||valore<0||valore>9999999} onClick={aggiungi}>Aggiungi requisito</button>
    </>}
  </details>;
}

function GruppoEditor({condizioni,onCambia,elenchi,extra,profondita=0}:{condizioni:RequisitoSpillo[];onCambia:(r:RequisitoSpillo[])=>void;elenchi:ElenchiCondizioni;extra:ElenchiRegole;profondita?:number}) {
  const nomi={...nomiDaElenchi(elenchi),stati:Object.fromEntries(extra.stati.map(s=>[s.chiave,s.nome])),articoli:Object.fromEntries(extra.articoli.map(s=>[s.chiave,s.nome])),letture:Object.fromEntries(extra.letture.map(s=>[s.chiave,s.nome]))};
  return <div className="regole-gruppo">
    {condizioni.map((c,i)=>{
      const aggiorna=(nuova:RequisitoSpillo)=>onCambia(condizioni.map((v,j)=>j===i?nuova:v));
      const gruppo=c.tipo==='gruppo'?c:c.tipo==='non'&&c.condizione.tipo==='gruppo'?c.condizione:null;
      return <div className="regole-riga" key={i}>
        {gruppo?<><label className="editor-mappa__campo">{c.tipo==='non'?'Blocca quando':'Sblocca quando'}<select className="form-input" value={gruppo.modo} onChange={e=>{const g={...gruppo,modo:e.target.value as 'tutte'|'almeno-una'};aggiorna(c.tipo==='non'?{tipo:'non',condizione:g}:g);}}><option value="tutte">Tutte le condizioni del gruppo sono vere</option><option value="almeno-una">Almeno una condizione del gruppo è vera</option></select></label><GruppoEditor condizioni={gruppo.condizioni} onCambia={v=>aggiorna(c.tipo==='non'?{tipo:'non',condizione:{...gruppo,condizioni:v}}:{...gruppo,condizioni:v})} elenchi={elenchi} extra={extra} profondita={profondita+1}/></>:<p className={c.tipo==='da-configurare'?'text-warning':''}>{descriviRequisitoSpillo(c,nomi)}</p>}
        <button className="btn btn-ghost touch" type="button" onClick={()=>onCambia(condizioni.filter((_,j)=>j!==i))} aria-label={gruppo?'Rimuovi gruppo':`Togli la condizione: ${descriviRequisitoSpillo(c,nomi)}`}>Rimuovi {gruppo?'gruppo':'condizione'}</button>
      </div>;
    })}
    {condizioni.length===0&&<p className="text-sm">{profondita?'Gruppo vuoto: aggiungi una condizione o rimuovi il gruppo.':'Nessuna condizione: sempre disponibile.'}</p>}
    {condizioni.length<20&&<AggiungiRequisito esistenti={condizioni} elenchi={elenchi} extra={extra} onAggiungi={c=>{if(!condizioni.some(v=>JSON.stringify(v)===JSON.stringify(c)))onCambia([...condizioni,c]);}}/>}
    {profondita<2&&condizioni.length<20&&<div className="flex flex-wrap gap-2"><button type="button" className="btn touch" onClick={()=>onCambia([...condizioni,{tipo:'gruppo',modo:'tutte',condizioni:[]}])}>Aggiungi gruppo di sblocco</button>{profondita===0&&<button type="button" className="btn touch" onClick={()=>onCambia([...condizioni,{tipo:'non',condizione:{tipo:'gruppo',modo:'almeno-una',condizioni:[]}}])}>Aggiungi gruppo di blocco</button>}</div>}
  </div>;
}

export function CondizioniEditor({condizioni,onCambia,elenchi,disabilitato}:{condizioni:RequisitoSpillo[];onCambia:(r:RequisitoSpillo[])=>void;elenchi?:ElenchiCondizioni;disabilitato?:boolean}) {
  const dati=useCarica(async()=>{const [extra,base]=await Promise.all([getElenchiRegole(),elenchi?Promise.resolve(elenchi):Promise.all([getConfidenti(),getQuartieri(),getRichieste(),getDungeons()]).then(([confidenti,quartieri,richieste,dungeon])=>({confidenti,quartieri,richieste:richieste.richieste,dungeon}))]);return {extra,base};},[]);
  return <fieldset disabled={disabilitato} className="regole-editor"><legend>Disponibilità e condizioni</legend><p className="text-sm">I requisiti esterni ai gruppi devono essere tutti soddisfatti. Un blocco attivo prevale sugli sblocchi. I dati mancanti restano “da verificare”.</p>
    {dati.errore?<p role="alert">{dati.errore} <button type="button" onClick={()=>void dati.ricarica()}>Riprova</button></p>:dati.dati?<><GruppoEditor condizioni={condizioni} onCambia={onCambia} elenchi={dati.dati.base??ELENCHI_VUOTI} extra={dati.dati.extra}/><NuovoStato onCreato={()=>void dati.ricarica()}/></>:<p>Caricamento delle condizioni…</p>}
  </fieldset>;
}
