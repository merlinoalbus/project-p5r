import { getDb, nowIso, type AppDatabase } from '../db/dbService.js';
import { ATTIVITA_PESCA, SFIDA_PESCA } from '../../shared/pesca.js';
import { httpErrors } from '../utils/httpError.js';
import { canonicoPesca, firmaPesca, jsonPesca } from './registroPesca.js';

export const AZIONE_ALLOCAZIONE_TURNO_PESCA='allocazione-turno';
type RawTurno=Record<string,unknown>;
export interface AllocazioneTurnoPesca {
  versione:1;partitaId:number;turnoUid:string;sessioneId:string;attivita:string;ordine:number;
  firmaOriginaria:string;turnoPrimaRAW:RawTurno;turnoDopoRAW:RawTurno;
}
const campi=['versione','partitaId','turnoUid','sessioneId','attivita','ordine','firmaOriginaria','turnoPrimaRAW','turnoDopoRAW'];
const uid=(v:unknown):v is string=>typeof v==='string'&&/^[0-9a-f]{32}$/.test(v);
const oggetto=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const conflitto=():never=>{throw httpErrors.conflict('pesca-allocazione-turno-incoerente','La prova durevole del raccordo del turno non è integra. Nessun UID viene rimosso o riassegnato.');};
const idAllocazione=(p:number,id:string):string=>firmaPesca({namespace:'pesca-allocazione-turno-v1',partitaId:p,turnoUid:id}).slice(0,32);
const senzaUid=(r:RawTurno):RawTurno=>Object.fromEntries(Object.entries(r).filter(([k])=>k!=='uid'));

function validaAllocazione(db:AppDatabase,p:number,raw:unknown):AllocazioneTurnoPesca {
  if(!oggetto(raw)||canonicoPesca(Object.keys(raw).sort())!==canonicoPesca([...campi].sort()))return conflitto();
  const a=raw as unknown as AllocazioneTurnoPesca;
  if(a.versione!==1||!Number.isSafeInteger(a.partitaId)||a.partitaId!==p||!uid(a.turnoUid)||!uid(a.sessioneId)||a.attivita!==ATTIVITA_PESCA&&a.attivita!==SFIDA_PESCA||!Number.isSafeInteger(a.ordine)||a.ordine<1||typeof a.firmaOriginaria!=='string'||!/^[0-9a-f]{64}$/.test(a.firmaOriginaria))return conflitto();
  const colonne=(db.prepare("SELECT name FROM pragma_table_info('turno_partita','utente')").all() as Array<{name:string}>).map(c=>c.name).sort();
  for(const t of [a.turnoPrimaRAW,a.turnoDopoRAW]){
    if(!oggetto(t)||canonicoPesca(Object.keys(t).sort())!==canonicoPesca(colonne)||Object.values(t).some(v=>v!==null&&typeof v!=='string'&&(typeof v!=='number'||!Number.isSafeInteger(v)))||t.partita_id!==p||t.attivita_chiave!==a.attivita||t.ordine!==a.ordine||typeof t.created_at!=='string')return conflitto();
  }
  if(![null,a.turnoUid].includes(a.turnoPrimaRAW.uid as string|null)||a.turnoDopoRAW.uid!==a.turnoUid||firmaPesca(a.turnoPrimaRAW)!==a.firmaOriginaria||canonicoPesca(senzaUid(a.turnoPrimaRAW))!==canonicoPesca(senzaUid(a.turnoDopoRAW)))return conflitto();
  return a;
}

/** Il journal sopravvive al dettaglio: prova solo il raccordo, mai un nuovo turno o un premio. */
export function leggiAllocazioniTurniPesca(p:number,db:AppDatabase=getDb()):AllocazioneTurnoPesca[] {
  const rs=db.prepare('SELECT * FROM utente.pesca_operazione WHERE partita_id=? AND azione=? ORDER BY operazione_id').all(p,AZIONE_ALLOCAZIONE_TURNO_PESCA) as Array<{partita_id:number;operazione_id:string;payload_json:string;ricevuta_json:string;creata_il:string}>;
  const viste=new Set<string>();
  return rs.map(r=>{
    const a=validaAllocazione(db,p,jsonPesca(r.payload_json,'allocazione durevole del turno'));
    if(r.partita_id!==p||r.operazione_id!==idAllocazione(p,a.turnoUid)||r.ricevuta_json!==r.payload_json||typeof r.creata_il!=='string'||viste.has(a.turnoUid))return conflitto();
    viste.add(a.turnoUid);
    const corrente=db.prepare('SELECT * FROM utente.turno_partita WHERE partita_id=? AND uid=?').get(p,a.turnoUid);
    if(corrente&&canonicoPesca(corrente)!==canonicoPesca(a.turnoDopoRAW))return conflitto();
    const s=db.prepare('SELECT turno_uid,turno_ordine,origine_turno,turno_revocato_il FROM utente.pesca_sessione WHERE partita_id=? AND id=?').get(p,a.sessioneId) as {turno_uid:string|null;turno_ordine:number;origine_turno:string;turno_revocato_il:string|null}|undefined;
    // L'annullo originario può eliminare il turno e scollegare la FK. La prova
    // dell'assegnazione rimane valida; non riattiva il turno né un altro UID.
    const uidSessioneCoerente=!s||s.turno_uid===a.turnoUid||s.turno_uid===null&&s.turno_revocato_il!==null&&!corrente;
    if(s&&(!uidSessioneCoerente||s.turno_ordine!==a.ordine||s.origine_turno!=='raccordato'))return conflitto();
    return a;
  });
}

export function registraAllocazioneTurnoPesca(p:number,sessioneId:string,prima:RawTurno,dopo:RawTurno,firmaOriginaria:string):void {
  const db=getDb();if(!db.inTransaction)throw new Error('Il raccordo del turno richiede la stessa transazione della sessione.');
  const a=validaAllocazione(db,p,{versione:1,partitaId:p,turnoUid:dopo.uid,sessioneId,attivita:dopo.attivita_chiave,ordine:dopo.ordine,firmaOriginaria,turnoPrimaRAW:prima,turnoDopoRAW:dopo});
  const id=idAllocazione(p,a.turnoUid),payload=canonicoPesca(a);
  const old=db.prepare('SELECT azione,payload_json,ricevuta_json FROM utente.pesca_operazione WHERE partita_id=? AND operazione_id=?').get(p,id) as {azione:string;payload_json:string;ricevuta_json:string}|undefined;
  if(old){if(old.azione!==AZIONE_ALLOCAZIONE_TURNO_PESCA||old.payload_json!==payload||old.ricevuta_json!==payload)return conflitto();return;}
  const occupata=leggiAllocazioniTurniPesca(p,db).find(x=>x.turnoUid===a.turnoUid);
  if(occupata)return conflitto();
  const corrente=db.prepare('SELECT * FROM utente.turno_partita WHERE partita_id=? AND uid=?').get(p,a.turnoUid);
  if(canonicoPesca(corrente??null)!==canonicoPesca(dopo))return conflitto();
  db.prepare('INSERT INTO utente.pesca_operazione(partita_id,operazione_id,azione,payload_json,ricevuta_json,creata_il) VALUES(?,?,?,?,?,?)').run(p,id,AZIONE_ALLOCAZIONE_TURNO_PESCA,payload,payload,nowIso());
}

/** Compatibilità limitata all'aggiunta UID provata per la stessa riga RAW della vecchia ricevuta. */
export function provaUidTurnoPesca(p:number,attivita:unknown,ordine:unknown,prima:RawTurno,ora:RawTurno):boolean {
  if(!uid(ora.uid)||prima.uid!==undefined&&prima.uid!==null)return false;
  const a=leggiAllocazioniTurniPesca(p).find(x=>x.turnoUid===ora.uid);
  return !!a&&a.attivita===attivita&&a.ordine===ordine&&prima.partita_id===p&&ora.partita_id===p&&prima.attivita_chiave===attivita&&ora.attivita_chiave===attivita&&prima.ordine===ordine&&ora.ordine===ordine&&canonicoPesca(a.turnoDopoRAW)===canonicoPesca(ora)&&canonicoPesca(senzaUid(a.turnoPrimaRAW))===canonicoPesca(senzaUid(prima));
}

/** Vecchi file senza la famiglia pesca restano importabili; un journal presente non viene ignorato. */
export function verificaAllocazioniTurniPescaImportate(db:AppDatabase):void {
  const database=db.pragma('database_list') as Array<{name:string}>;
  if(!database.some(d=>d.name==='utente')||!db.prepare("SELECT 1 FROM utente.sqlite_master WHERE type='table' AND name='pesca_operazione'").get())return;
  const partite=db.prepare('SELECT DISTINCT partita_id FROM utente.pesca_operazione WHERE azione=? ORDER BY partita_id').all(AZIONE_ALLOCAZIONE_TURNO_PESCA) as Array<{partita_id:number}>;
  for(const p of partite)leggiAllocazioniTurniPesca(p.partita_id,db);
}
