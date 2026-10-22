import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import type { RicevutaOperazionePescaDto } from '../../shared/pesca.js';
import { canonicoPesca, jsonPesca } from './registroPesca.js';
import { registraEvento } from './storicoService.js';

export function eventoPescaMarcato(raw:unknown):boolean {
  if(typeof raw!=='string')return false;
  let x:unknown;try{x=JSON.parse(raw) as unknown;}catch{return false;}
  if(!x||typeof x!=='object'||Array.isArray(x)||!('pescaV1'in x))return false;
  const r=x as Record<string,unknown>,m=r.pescaV1 as Record<string,unknown>|null;
  if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).length!==1||m.formato!==1||typeof r.operazioneId!=='string'||!/^[0-9a-f]{32}$/.test(r.operazioneId))throw httpErrors.conflict('pesca-evento-incoerente','Il marker dell’evento pesca non è riconoscibile.');
  return true;
}
export function registraEventoPesca(r:RicevutaOperazionePescaDto):void {
  registraEvento(r.partitaId,'pesca',r.azione==='registra-sessione'?'Visita di pesca registrata':r.azione==='salva-osservazione'?'Osservazione della pesca corretta':r.azione==='acquista-esca'?'Acquisto dell’esca osservato':r.azione==='rettifica-punti'?'Saldo punti pesca osservato':'Fonte della pesca aggiornata','Gesto confermato; catture, beneficio finale e movimenti restano distinti.',{pescaV1:{formato:1},operazioneId:r.operazioneId,azione:r.azione,sessioneId:r.sessioneId,provenienzaId:r.provenienzaId,osservazioneId:r.osservazioneId,fattoFonteId:r.fattoFonteId,acquistoEscaId:r.acquistoEscaId});
}
/** Selezione per identità posseduta e prova del journal; mai per titolo o nome. */
export function annullaEventiPesca(p:number,bersaglio:{fonte?:string;sessione?:string;fatto?:string;esca?:string}):void {
  if(!getDb().inTransaction)throw new Error('L’annullo dello storico pesca richiede la transazione della fonte.');
  const eventi=prepared("SELECT id,dati_json FROM utente.evento_partita WHERE partita_id=? AND tipo='pesca'").all(p) as Array<{id:number;dati_json:string}>;
  for(const e of eventi){
    if(!eventoPescaMarcato(e.dati_json))continue;
    const d=jsonPesca(e.dati_json,'evento pesca') as Record<string,unknown>;
    if(!['registra-sessione','salva-osservazione','registra-fatto','acquista-esca'].includes(String(d.azione)))continue;
    if(!(bersaglio.fonte&&d.provenienzaId===bersaglio.fonte||bersaglio.sessione&&d.sessioneId===bersaglio.sessione||bersaglio.fatto&&d.fattoFonteId===bersaglio.fatto||bersaglio.esca&&d.acquistoEscaId===bersaglio.esca))continue;
    const op=prepared('SELECT ricevuta_json FROM utente.pesca_operazione WHERE partita_id=? AND operazione_id=?').get(p,d.operazioneId) as {ricevuta_json:string}|undefined;
    if(!op)throw httpErrors.conflict('pesca-evento-senza-prova','Manca il journal dell’evento posseduto.');
    const r=jsonPesca(op.ricevuta_json,'operazione dello storico pesca') as RicevutaOperazionePescaDto;
    const previsto={pescaV1:{formato:1},operazioneId:r.operazioneId,azione:r.azione,sessioneId:r.sessioneId,provenienzaId:r.provenienzaId,osservazioneId:r.osservazioneId,fattoFonteId:r.fattoFonteId,acquistoEscaId:r.acquistoEscaId};
    if(r.partitaId!==p||canonicoPesca(previsto)!==canonicoPesca(d))throw httpErrors.conflict('pesca-evento-divergente','Evento e journal non coincidono: annullo interamente ritirato.');
    if(prepared('DELETE FROM utente.evento_partita WHERE partita_id=? AND id=? AND dati_json IS ?').run(p,e.id,e.dati_json).changes!==1)throw httpErrors.conflict('pesca-evento-cambiato','L’evento è cambiato durante l’annullo.');
  }
}
