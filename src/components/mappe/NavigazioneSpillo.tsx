import type { SpilloDto } from '../../types';
import type { NavigaMappa } from '../../utils/navigazioneMappa';
import { PulsanteVisivo } from '../shared/PulsanteVisivo';
import { IconaSpillo } from './IconaSpillo';

export function NavigazioneSpillo({spillo:s,partitaId,onNaviga}:{spillo:SpilloDto;partitaId:number|null;onNaviga:NavigaMappa}) {
  if (s.soloPosizione) return <p className="text-[12px] text-text-muted">Posizione del luogo. La disponibilità delle attività va verificata separatamente.</p>;
  if (s.destinazioneNonDisponibile) return <p role="status" className="text-[12px] text-text-muted">La mappa di arrivo non è più disponibile. Aggiorna il collegamento nell’editor.</p>;
  const arrivo=s.destinazione;
  const precedente=s.dettaglio?.tipo==='mappa'?s.dettaglio.mappa:null;
  if(!arrivo&&!precedente)return null;
  const bloccato=partitaId!==null&&s.disponibilita?.stato==='bloccato';
  return <PulsanteVisivo tono="primario" compatto icona={<IconaSpillo tipo={s.tipo} dimensione={20}/>}
    titolo={arrivo?'Raggiungi il punto di arrivo':`Apri: ${precedente!.nome}`}
    dettaglio={bloccato?'Non disponibile nella partita corrente':undefined} disabled={bloccato}
    onClick={()=>{if(bloccato)return;if(arrivo)onNaviga(arrivo.mappa,{x:arrivo.x,y:arrivo.y,zoom:arrivo.zoom});else onNaviga(precedente!.chiave);}}/>;
}
