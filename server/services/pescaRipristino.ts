import { getDb, prepared } from '../db/dbService.js';
import { httpErrors } from '../utils/httpError.js';
import { riconciliaBeneficiPesca } from './propostePartitaService.js';
import { fontiPesca, sessioniPesca } from './pescaLetture.js';
import { jsonPesca } from './registroPesca.js';
import { leggiAllocazioniTurniPesca } from './allocazioniTurniPesca.js';

export const TIPI_CESTINO_PESCA=['fonte-pesca','sessione-pesca','osservazione-pesca'] as const;
export function radiceCestinoPesca(tipo:string,chiave:string):{tabella:string;id:string}|null {
  const uid=/^[0-9a-f]{32}$/;
  if(tipo==='fonte-pesca'||tipo==='sessione-pesca'){
    if(!uid.test(chiave))throw httpErrors.conflict('pesca-cestino-identita','Identità della radice pesca non riconoscibile.');
    return {tabella:tipo==='fonte-pesca'?'pesca_provenienza':'pesca_sessione',id:chiave};
  }
  if(tipo==='osservazione-pesca'){
    const [famiglia,id,...extra]=chiave.split(':');
    if(extra.length||!id||!uid.test(id)||!['fatto','esca'].includes(famiglia!))throw httpErrors.conflict('pesca-cestino-identita','La fonte osservata non ha un’identità discriminata riconoscibile.');
    return {tabella:famiglia==='fatto'?'pesca_fatto_fonte':'pesca_acquisto_esca',id};
  }
  return null;
}
export function riconciliaPescaDopoRipristino(p:number,interaPartita=false):void {
  if(!getDb().inTransaction)throw new Error('Il ripristino pesca richiede la transazione del cestino.');
  leggiAllocazioniTurniPesca(p);
  for(const f of fontiPesca(p))if(f.tipo==='diario'){
    const rs=prepared("SELECT annullato_il,ricevuta_json FROM utente.effetto_applicato WHERE partita_id=? AND voce_uid=? AND effetto_uid=? AND tipo='pesca' ORDER BY applicato_il,id").all(p,f.voce_uid,f.effetto_uid) as Array<{annullato_il:string|null;ricevuta_json:string}>;
    const proprie=rs.filter(r=>{const d=jsonPesca(r.ricevuta_json,'ricevuta della fonte ripristinata') as {provenienzaId?:unknown;generazione?:unknown;operazione?:{operazioneId?:unknown}};return d.provenienzaId===f.id&&d.generazione===f.generazione&&d.operazione?.operazioneId===f.operazione_id;});
    if(!proprie.some(r=>r.annullato_il===null))throw httpErrors.conflict('pesca-ripristino-generazione-annullata','La fonte appartiene a una generazione annullata o non provata: una nuova spunta della stessa voce non la riattiva.');
  }
  const saldo=prepared('SELECT saldo FROM utente.punti_pesca_partita WHERE partita_id=?').get(p) as {saldo:number|null}|undefined;
  const ultimo=prepared('SELECT dopo FROM utente.movimento_punti_pesca WHERE partita_id=? ORDER BY rowid DESC LIMIT 1').get(p) as {dopo:number}|undefined;
  if(interaPartita&&ultimo&&saldo?.saldo!==ultimo.dopo)throw httpErrors.conflict('pesca-saldo-ripristino-incoerente','Il saldo punti della partita non coincide con il proprio ultimo movimento. Nessun delta viene ripetuto.');
  const cause=new Set([...sessioniPesca(p).map(s=>s.id),...(prepared('SELECT id FROM utente.pesca_acquisto_esca WHERE partita_id=?').all(p) as Array<{id:string}>).map(a=>a.id),...(prepared("SELECT DISTINCT causa_chiave FROM utente.da_applicare WHERE partita_id=? AND causa_tipo='pesca'").all(p) as Array<{causa_chiave:string}>).map(c=>c.causa_chiave)]);
  for(const id of cause)riconciliaBeneficiPesca(p,id);
}
