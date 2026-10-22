import { ATTIVITA_PESCA, EVENTI_PESCA, REGOLA_PESCA, type AnteprimaOperazionePescaDto, type AzioneOperazionePesca, type EventoPesca, type InputOperazionePesca, type NuovaSessionePesca, type OsservazionePesca, type RichiestaRegistraSessionePesca, type RicevutaOperazionePescaDto, type StatoPescaDto } from '../../shared/pesca.js';
import { normalizzaEffettoVoce } from '../../shared/effettiVoce.js';
import { profiliPesca } from './profiliPescaService.js';
import { dotiSociali } from './partiteService.js';
import { getDb, nowIso, prepared } from '../db/dbService.js';
import { bodyAnteprimaAcquistoEsca, bodyAnteprimaFattoPesca, bodyAnteprimaOsservazionePesca, bodyAnteprimaRettificaPuntiPesca, bodyAnteprimaRimozionePesca, bodyAnteprimaSessionePesca } from '../schemas/pesca.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { registraTurno, togliTurno } from './attivitaService.js';
import { beneficiPescaDto, riconciliaBeneficiPesca } from './propostePartitaService.js';
import { fattiPesca, fontiPesca, fotografiaPesca, leggiPescaPartita, momentoSessione, osservazioneCorrente, osservazioneDto, sessioniPesca, confrontaMomentiPesca, puntoOsservazionePesca, valoreFattoPesca, type RigaSessionePesca } from './pescaLetture.js';
import { canonicoPesca, firmaPesca, jsonPesca, uidPesca } from './registroPesca.js';
import { annullaEventiPesca, registraEventoPesca } from './pescaStorico.js';
import { AZIONE_ALLOCAZIONE_TURNO_PESCA, registraAllocazioneTurnoPesca } from './allocazioniTurniPesca.js';

export const statoPesca=(p:number):StatoPescaDto=>leggiPescaPartita(p,id=>beneficiPescaDto(p,id));
type ConfermaPesca=InputOperazionePesca&{revisionePescaAttesa:string};
export interface ContestoDiarioPesca { generazione:string; nuovaSpunta:boolean; voceUid:string; effettoUid:string }
function sessione(p:number,id:string):RigaSessionePesca {
  const s=sessioniPesca(p).find(x=>x.id===id);if(!s)throw httpErrors.notFound('pesca-sessione-assente','La sessione non esiste con questa identità.');return s;
}
function richiestaValida(azione:AzioneOperazionePesca,r:InputOperazionePesca):void {
  const schema=azione==='registra-sessione'?bodyAnteprimaSessionePesca:azione==='salva-osservazione'?bodyAnteprimaOsservazionePesca:azione==='registra-fatto'?bodyAnteprimaFattoPesca:azione==='acquista-esca'?bodyAnteprimaAcquistoEsca:azione==='rettifica-punti'?bodyAnteprimaRettificaPuntiPesca:bodyAnteprimaRimozionePesca;
  if(!schema.safeParse(r).success)throw httpErrors.badRequest('pesca-richiesta-non-valida','Il gesto deve contenere tutti e soltanto i campi previsti.');
}
function controllaOsservazione(r:NuovaSessionePesca):void {
  if(r.osservazione.fortuna.giorno!==r.momento.giorno)throw httpErrors.conflict('pesca-fortuna-altro-giorno','Fortuna deve riferirsi al giorno della visita, anche quando è ignota.');
  if(r.osservazione.finale.tipo==='uscita-dopo-riscossione'&&!r.osservazione.finale.riscossioneUid)throw httpErrors.conflict('pesca-riscossione-senza-identita','La riscossione finale osservata richiede un’identità esplicita.');
}
function verificaRangoFotografato(p:number,m:NuovaSessionePesca['momento'],o:OsservazionePesca,precedente?:OsservazionePesca):void {
  if(o.provenienzaRango!=='fotografia-corrente-confermata')return;
  // La stessa coppia già registrata nella sessione immutabile resta una prova storica:
  // correggere l'esca non deve confrontare di nuovo quel rango con la partita odierna.
  if(precedente?.provenienzaRango==='fotografia-corrente-confermata'&&precedente.rangoPeriziaOsservato===o.rangoPeriziaOsservato)return;
  const partita=prepared('SELECT data_gioco,fascia_gioco FROM utente.partita WHERE id=?').get(p) as {data_gioco:string|null;fascia_gioco:string};
  if(partita.data_gioco!==m.giorno||partita.fascia_gioco!==m.fascia||dotiSociali(p).find(d=>d.chiave==='perizia')?.rango!==o.rangoPeriziaOsservato)throw httpErrors.conflict('pesca-rango-fotografia-diversa','Rango o momento non coincidono con la fotografia corrente confermata. Per uno storico usa un rango dichiarato o ignoto.');
}
function verificaFonte(p:number,r:NuovaSessionePesca):void {
  if(r.fonte.tipo==='manuale')return;
  const fonte=r.fonte;
  const e=prepared('SELECT e.*,v.data,v.fascia FROM main.voce_effetto e JOIN main.voce_giornata v ON v.uid=e.voce_uid WHERE e.voce_uid=? AND e.uid=?').get(r.fonte.voceUid,r.fonte.effettoUid) as Record<string,unknown>|undefined;
  const effetto=e?normalizzaEffettoVoce(jsonPesca(String(e.dati_json),'effetto della pesca')):null;
  if(!e||effetto?.tipo!=='pesca'||effetto.attivita!==ATTIVITA_PESCA||effetto.regola!==REGOLA_PESCA||e.data!==r.momento.giorno||e.fascia!==r.momento.fascia)throw httpErrors.conflict('pesca-fonte-diversa','Il gesto non corrisponde alla voce, al momento e all’effetto canonico della pesca.');
  const gia=fontiPesca(p).find(f=>f.voce_uid===fonte.voceUid&&f.effetto_uid===fonte.effettoUid);
  if(gia&&(r.scelta.tipo!=='collega'||r.scelta.sessioneId!==gia.sessione_id))throw httpErrors.conflict('pesca-fonte-gia-collegata','Questa fonte sostiene già un’altra sessione.');
}
function verificaTurno(r:NuovaSessionePesca,st:StatoPescaDto):void {
  if(r.scelta.tipo==='collega'){
    const scelta=r.scelta,s=st.sessioni.find(s=>s.id===scelta.sessioneId);
    if(!s||!s.turno.firma)throw httpErrors.conflict('pesca-turno-revocato','Il turno della sessione è assente o revocato; non viene ricreato.');
    if(canonicoPesca(s.momento)!==canonicoPesca(r.momento)||canonicoPesca(s.osservazione.dati)!==canonicoPesca(r.osservazione))throw httpErrors.conflict('pesca-sessione-diversa','Momento e osservazione devono coincidere con la sessione; una correzione usa il gesto dedicato.');
    if(s.turno.origine==='quota-storica'){
      if(r.turno.tipo!=='contatore-storico'||r.turno.firmaContatore!==s.turno.firma)throw httpErrors.conflict('pesca-quota-diversa','La firma deve identificare la quota già allocata a questa sessione.');
    }else if(r.turno.tipo!=='esistente'||r.turno.ordine!==s.turno.ordine||r.turno.firmaTurno!==s.turno.firma)throw httpErrors.conflict('pesca-turno-diverso','La fonte aggiuntiva deve riferirsi al turno già collegato.');
    return;
  }
  if(r.turno.tipo==='esistente'){
    const t=st.contatore.turni.find(t=>r.turno.tipo==='esistente'&&t.ordine===r.turno.ordine&&t.firma===r.turno.firmaTurno);
    if(!t||t.firma!==r.turno.firmaTurno||t.raccordatoASessione)throw httpErrors.conflict('pesca-turno-cambiato','Il turno non è più libero con la fotografia approvata.');
  }else if(r.turno.tipo==='contatore-storico'&&(r.turno.firmaContatore!==st.contatore.firma||st.contatore.quoteNonRappresentate<1))throw httpErrors.conflict('pesca-contatore-cambiato','Il contatore storico non contiene più una quota non rappresentata nella fotografia approvata.');
}
function verificaFatto(p:number,evento:EventoPesca,r:Extract<InputOperazionePesca,{valore:unknown}>,escludiSessione?:string):void {
  for(const f of fattiPesca(p).filter(f=>f.sessione_id!==escludiSessione&&f.evento_chiave===evento&&f.valore!=='ignoto'&&r.valore!=='ignoto'&&f.valore!==r.valore)){
    const precedente=f.momento_json===null?null:jsonPesca(f.momento_json,'momento del fatto') as typeof r.momento;
    if(precedente&&r.momento&&(f.valore==='avvenuto'?confrontaMomentiPesca(precedente,r.momento)<=0:confrontaMomentiPesca(r.momento,precedente)<=0))throw httpErrors.conflict('pesca-fatti-incompatibili','Una fonte negativa raggiungerebbe un limite in cui il fatto è già attestato. Revoca o correggi prima la fonte pertinente.');
    if(precedente===null&&r.momento===null)throw httpErrors.conflict('pesca-fatti-incompatibili','Due affermazioni correnti non datate sono incompatibili. Le fonti datate restano distinte.');
  }
}
function prepara(p:number,azione:AzioneOperazionePesca,r:InputOperazionePesca,bersaglio:string|null):AnteprimaOperazionePescaDto {
  verificaPartita(p);richiestaValida(azione,r);const st=statoPesca(p),conseguenze:string[]=[];
  if(azione==='registra-sessione'){
    const input=r as NuovaSessionePesca;
    if(st.regola.stato!=='collegata'||!st.regola.dati)throw httpErrors.conflict('pesca-regola-assente','La regola corrente non è riconoscibile. Nessuna visita viene ricostruita.');
    const a=prepared('SELECT pesca_regola_chiave,pesca_ruolo FROM main.attivita WHERE chiave=?').get(ATTIVITA_PESCA) as {pesca_regola_chiave:string|null;pesca_ruolo:string|null}|undefined;
    if(a?.pesca_regola_chiave!==REGOLA_PESCA||a.pesca_ruolo!=='visita')throw httpErrors.conflict('pesca-attivita-non-collegata','L’attività non rimanda alla regola canonica della visita.');
    controllaOsservazione(input);verificaFonte(p,input);verificaTurno(input,st);
    if(input.scelta.tipo==='nuova')verificaRangoFotografato(p,input.momento,input.osservazione);
    verificaIdentitaCatture(input.osservazione,input.scelta.tipo==='collega'?input.scelta.sessioneId:null);
    verificaFattiOsservazione(p,input.momento,input.osservazione,input.scelta.tipo==='collega'?input.scelta.sessioneId:undefined);
    conseguenze.push(input.scelta.tipo==='collega'?'Aggiunge soltanto una fonte alla visita già registrata.':input.turno.tipo==='nuovo'?'Registra esattamente un nuovo turno A02.':'Raccorda una visita già conteggiata senza aumentare il contatore.','Catture e Perizia restano osservazioni separate. I benefici e le spese diventano proposte, senza modifiche automatiche alle Doti o al denaro.');
  }else if(azione==='salva-osservazione'){
    const s=sessione(p,bersaglio!);controllaOsservazione({momento:momentoSessione(s),osservazione:(r as {osservazione:OsservazionePesca}).osservazione} as NuovaSessionePesca);verificaFattiOsservazione(p,momentoSessione(s),(r as {osservazione:OsservazionePesca}).osservazione,s.id);
    verificaRangoFotografato(p,momentoSessione(s),(r as {osservazione:OsservazionePesca}).osservazione,osservazioneDto(osservazioneCorrente(s.id)).dati);
    verificaIdentitaCatture((r as {osservazione:OsservazionePesca}).osservazione,s.id);
    conseguenze.push('Conserva la revisione precedente; aggiorna soltanto i fatti derivati dalle fonti della sessione e le proposte pertinenti. Un valore divenuto ignoto non annulla un beneficio già provato.');
  }else if(azione==='registra-fatto'){
    if(!EVENTI_PESCA.includes(bersaglio as EventoPesca))throw httpErrors.badRequest('pesca-evento-invalido','Fatto della pesca non riconosciuto.');
    verificaFatto(p,bersaglio as EventoPesca,r as Extract<InputOperazionePesca,{valore:unknown}>);
    conseguenze.push('Registra una fonte manuale del fatto; non crea una visita, una cattura o un turno.');
  }else if(azione==='rimuovi-fonte'){
    if(!fontiPesca(p).some(f=>f.id===bersaglio))throw httpErrors.notFound('pesca-fonte-assente','La fonte non è presente.');
    conseguenze.push('Rimuove solo questa fonte e i fatti che essa sostiene. L’ultima fonte può annullare solo il turno nuovo posseduto; un turno storico raccordato rimane conteggiato.');
  }else if(azione==='rimuovi-sessione'){sessione(p,bersaglio!);conseguenze.push('Rimuove tutte le fonti della sessione. Il contatore pregresso e le attribuzioni durevoli restano protetti.');}
  else if(azione==='rimuovi-fatto'){
    const f=fattiPesca(p).find(f=>f.id===bersaglio);if(!f||f.sessione_id)throw httpErrors.conflict('pesca-fatto-non-manuale','La fonte non esiste o appartiene a una sessione: correggi l’osservazione di origine.');
    conseguenze.push('Revoca soltanto questa fonte manuale, conservando le altre fonti temporali.');
  }else if(azione==='rimuovi-acquisto-esca'){
    if(!st.acquistiEsca.some(a=>a.id===bersaglio&&a.attivo))throw httpErrors.notFound('pesca-esca-assente','L’acquisto dell’esca non è attivo.');
    conseguenze.push('Ritira il fatto di acquisto e propone l’eventuale inversa solo della quantità già attribuita.');
  }else if(azione==='acquista-esca'){if(st.regola.stato!=='collegata'||!st.regola.dati)throw httpErrors.conflict('pesca-regola-assente','Il costo dell’esca non ha una fonte leggibile.');conseguenze.push('Registra un acquisto effettivamente osservato, distinto dal possesso. Il costo in punti pesca richiede una decisione esplicita.');}
  else conseguenze.push('Registra il saldo punti pesca osservato. La rettifica non dichiara già conteggiato alcun acquisto specifico.');
  const o='osservazione'in r?r.osservazione:null,m='momento'in r?r.momento:azione==='salva-osservazione'?momentoSessione(sessione(p,bersaglio!)):null;
  const precedente=m?valoreFattoPesca(p,'guardiano-ichigaya-catturato',m,true):'ignoto';
  const guardianoPrecedente=precedente==='ignoto'?null:precedente==='avvenuto';
  const punto=o?puntoOsservazionePesca(o):{tipo:'pianificazione' as const};
  const e=azione==='acquista-esca'?r as Extract<InputOperazionePesca,{quantita:unknown}>:null;
  const acquistoEscaPrevisto=e?{quantita:e.quantita,costoUnitario:st.regola.dati!.costoEscaPunti,costoTotale:e.quantita*st.regola.dati!.costoEscaPunti,unita:'punti-pesca' as const}:undefined;
  const benefici=acquistoEscaPrevisto?[{causa:`richiesta:${r.operazioneId}`,tipo:'punti-pesca' as const,chiave:'',unita:'punti-pesca' as const,intervallo:{minimo:-acquistoEscaPrevisto.costoTotale,massimo:-acquistoEscaPrevisto.costoTotale},attribuito:0,deltaCerto:-acquistoEscaPrevisto.costoTotale,residuoIgnoto:false,motivo:'Costo del nuovo acquisto osservato: nessuna attribuzione pregressa viene presunta.'}]:bersaglio?beneficiPescaDto(p,bersaglio):[];
  return {azione,richiesta:r,bersaglio,stato:st,punto,profiliPianificazione:o&&m?profiliPesca(p,st.regola.dati,m,o,guardianoPrecedente):[],profili:o&&m?profiliPesca(p,st.regola.dati,m,o,guardianoPrecedente,punto):[],benefici,...(acquistoEscaPrevisto?{acquistoEscaPrevisto}:{}),esitoPrevisto:conseguenze[0]!,conseguenze,revisionePescaAttesa:firmaPesca({azione,r,bersaglio,foto:fotografiaPesca(p)})};
}
function verificaFattiOsservazione(p:number,momento:NuovaSessionePesca['momento'],o:OsservazionePesca,escludi?:string):void {
  for(const c of o.catture??[])if(c.specie!=='altro')verificaFatto(p,c.specie==='guardiano'?'guardiano-ichigaya-catturato':'boss-ichigaya-catturato',{operazioneId:'',valore:'avvenuto',momento,nota:''},escludi);
  if(o.faseTerzoSemestre!==null)verificaFatto(p,'terzo-semestre-avviato',{operazioneId:'',valore:o.faseTerzoSemestre?'avvenuto':'non-avvenuto',momento,nota:''},escludi);
}
function verificaIdentitaCatture(o:OsservazionePesca,sessioneId:string|null):void {
  for(const c of o.catture??[]){const r=prepared('SELECT sessione_id FROM utente.pesca_cattura WHERE id=?').get(c.id) as {sessione_id:string}|undefined;if(r&&r.sessione_id!==sessioneId)throw httpErrors.conflict('pesca-cattura-gia-riferita','L’identità della cattura appartiene a un’altra visita. Non viene spostata o duplicata.');}
}
export function anteprimaPesca(p:number,azione:AzioneOperazionePesca,r:InputOperazionePesca,bersaglio:string|null=null):AnteprimaOperazionePescaDto {return getDb().transaction(()=>prepara(p,azione,r,bersaglio))();}
export function leggiOperazionePesca(p:number,id:string):RicevutaOperazionePescaDto {
  verificaPartita(p);const row=prepared('SELECT * FROM utente.pesca_operazione WHERE partita_id=? AND operazione_id=?').get(p,id) as {azione:string;payload_json:string;ricevuta_json:string}|undefined;
  if(!row||row.azione===AZIONE_ALLOCAZIONE_TURNO_PESCA)throw httpErrors.notFound('pesca-operazione-assente','Non è presente una ricevuta pubblica con questo ID. L’assenza non prova che un altro gesto sia fallito.');
  const d=jsonPesca(row.ricevuta_json,'ricevuta della pesca') as RicevutaOperazionePescaDto;
  if(!d||d.operazioneId!==id||d.partitaId!==p||d.azione!==row.azione||typeof d.creataIl!=='string'||canonicoPesca({azione:d.azione,richiesta:d.richiesta,bersaglio:d.bersaglio})!==row.payload_json)throw httpErrors.conflict('pesca-ricevuta-incoerente','La ricevuta non dimostra la propria identità e il payload registrato.');
  richiestaValida(d.azione,d.richiesta);return d;
}
function nuovaOsservazione(s:RigaSessionePesca,o:OsservazionePesca):string {
  const old=prepared('SELECT * FROM utente.pesca_osservazione WHERE sessione_id=? AND corrente=1').get(s.id) as {id:string;versione:number}|undefined,id=uidPesca();
  prepared('UPDATE utente.pesca_osservazione SET corrente=0 WHERE sessione_id=? AND corrente=1').run(s.id);
  prepared('INSERT INTO utente.pesca_osservazione(id,sessione_id,versione,corrente,dati_json,precedente_id,creata_il) VALUES(?,?,?,1,?,?,?)').run(id,s.id,(old?.versione??0)+1,canonicoPesca(o),old?.id??null,nowIso());
  // Le revisioni complete sono immutabili; l’indice delle catture descrive la sola osservazione corrente.
  prepared('DELETE FROM utente.pesca_cattura WHERE sessione_id=?').run(s.id);
  for(const c of o.catture??[])prepared('INSERT INTO utente.pesca_cattura(id,sessione_id,osservazione_id,specie,tentativo,posizione) VALUES(?,?,?,?,?,?)').run(c.id,s.id,id,c.specie,c.tentativo,c.posizione);
  ricostruisciFattiSessione(s,o);return id;
}
function ricostruisciFattiSessione(s:RigaSessionePesca,o:OsservazionePesca):void {
  prepared('DELETE FROM utente.pesca_fatto_fonte WHERE sessione_id=?').run(s.id);
  for(const f of fontiPesca(s.partita_id).filter(f=>f.sessione_id===s.id)){
    for(const c of o.catture??[])if(c.specie!=='altro'){
      const evento:EventoPesca=c.specie==='guardiano'?'guardiano-ichigaya-catturato':'boss-ichigaya-catturato';
      prepared('INSERT INTO utente.pesca_fatto_fonte(id,partita_id,evento_chiave,valore,momento_json,sessione_id,cattura_id,provenienza_id,fonte_json,nota,operazione_id,creata_il) VALUES(?,?,?,\'avvenuto\',?,?,?,?,?,?,?,?)').run(firmaPesca({fonte:f.id,cattura:c.id}).slice(0,32),s.partita_id,evento,canonicoPesca(momentoSessione(s)),s.id,c.id,f.id,f.fonte_json,'Cattura osservata nella sessione.',f.operazione_id,nowIso());
    }
    if(o.faseTerzoSemestre!==null)prepared('INSERT INTO utente.pesca_fatto_fonte(id,partita_id,evento_chiave,valore,momento_json,sessione_id,cattura_id,provenienza_id,fonte_json,nota,operazione_id,creata_il) VALUES(?,?,?,?,?,?,NULL,?,?,?,?,?)').run(firmaPesca({fonte:f.id,evento:'terzo-semestre'}).slice(0,32),s.partita_id,'terzo-semestre-avviato',o.faseTerzoSemestre?'avvenuto':'non-avvenuto',canonicoPesca(momentoSessione(s)),s.id,f.id,f.fonte_json,'Fase osservata durante la visita.',f.operazione_id,nowIso());
  }
}
function registraSessione(p:number,r:NuovaSessionePesca,contesto?:ContestoDiarioPesca):{sessioneId:string;provenienzaId:string;osservazioneId:string;esito:RicevutaOperazionePescaDto['esito']} {
  let s:RigaSessionePesca,osservazioneId:string;
  if(r.scelta.tipo==='collega'){s=sessione(p,r.scelta.sessioneId);osservazioneId=osservazioneCorrente(s.id).id;}
  else{
    const id=uidPesca(),turnoUid=uidPesca(),st=statoPesca(p),origine=r.turno.tipo==='nuovo'?'creato':r.turno.tipo==='esistente'?'raccordato':'quota-storica';let ordine:number;
    if(r.turno.tipo==='nuovo')ordine=registraTurno(p,ATTIVITA_PESCA,[],undefined,{pescaAutorizzata:true}).ordine;
    else if(r.turno.tipo==='esistente')ordine=r.turno.ordine;
    else{
      const ultimo=(prepared('SELECT MAX(ordine) AS n FROM utente.turno_partita WHERE partita_id=? AND attivita_chiave=?').get(p,ATTIVITA_PESCA) as {n:number|null}).n??0;ordine=Math.max(st.contatore.volte,ultimo)+1;
      prepared('INSERT INTO utente.turno_partita(partita_id,attivita_chiave,ordine,created_at) VALUES(?,?,?,?)').run(p,ATTIVITA_PESCA,ordine,nowIso());
      const quota=(prepared('SELECT COUNT(*) AS n FROM utente.pesca_quota_storica WHERE partita_id=? AND firma_contatore=?').get(p,r.turno.firmaContatore) as {n:number}).n+1;
      prepared('INSERT INTO utente.pesca_quota_storica(partita_id,firma_contatore,quota,sessione_id,turno_uid,creata_il) VALUES(?,?,?,?,?,?)').run(p,r.turno.firmaContatore,quota,id,turnoUid,nowIso());
    }
    const attivitaTurno=r.turno.tipo==='esistente'?st.contatore.turni.find(t=>r.turno.tipo==='esistente'&&t.ordine===r.turno.ordine&&t.firma===r.turno.firmaTurno)!.attivita:ATTIVITA_PESCA;
    const esistente=prepared('SELECT * FROM utente.turno_partita WHERE partita_id=? AND attivita_chiave=? AND ordine=?').get(p,attivitaTurno,ordine) as Record<string,unknown>&{uid:string|null};const uid=esistente.uid??turnoUid;
    if(esistente.uid===null)prepared('UPDATE utente.turno_partita SET uid=? WHERE partita_id=? AND attivita_chiave=? AND ordine=? AND uid IS NULL').run(uid,p,attivitaTurno,ordine);
    prepared('INSERT INTO utente.pesca_sessione(id,partita_id,attivita_chiave,giorno,fascia,ordine_visita,turno_uid,turno_ordine,origine_turno,identita_json,creata_il) VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(id,p,ATTIVITA_PESCA,r.momento.giorno,r.momento.fascia,r.momento.ordineVisita,uid,ordine,origine,canonicoPesca({attivita:ATTIVITA_PESCA,turnoAttivita:attivitaTurno,nome:'Pesca a Ichigaya',regola:st.regola.dati}),nowIso());
    if(r.turno.tipo==='esistente')registraAllocazioneTurnoPesca(p,id,esistente,prepared('SELECT * FROM utente.turno_partita WHERE partita_id=? AND uid=?').get(p,uid) as Record<string,unknown>,r.turno.firmaTurno);
    s=sessione(p,id);osservazioneId=nuovaOsservazione(s,r.osservazione);
  }
  const fonte=r.fonte;
  const gia=fonte.tipo==='diario'?fontiPesca(p).find(f=>f.voce_uid===fonte.voceUid&&f.effetto_uid===fonte.effettoUid):null;
  if(gia)return {sessioneId:s.id,provenienzaId:gia.id,osservazioneId,esito:'gia-collegata'};
  const id=uidPesca();prepared('INSERT INTO utente.pesca_provenienza(id,partita_id,sessione_id,tipo,voce_uid,effetto_uid,generazione,operazione_id,fonte_json,creata_il) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,p,s.id,r.fonte.tipo,r.fonte.tipo==='diario'?r.fonte.voceUid:null,r.fonte.tipo==='diario'?r.fonte.effettoUid:null,r.fonte.tipo==='diario'?contesto!.generazione:null,r.operazioneId,canonicoPesca(r.fonte),nowIso());
  ricostruisciFattiSessione(s,r.osservazione);riconciliaBeneficiPesca(p,s.id);
  return {sessioneId:s.id,provenienzaId:id,osservazioneId,esito:r.scelta.tipo==='nuova'?'sessione-creata':'fonte-collegata'};
}
export function rimuoviFontePescaNellaTransazione(p:number,id:string):string {
  if(!getDb().inTransaction)throw new Error('La rimozione della fonte pesca richiede la transazione del gesto.');
  const f=fontiPesca(p).find(x=>x.id===id);if(!f)throw httpErrors.notFound('pesca-fonte-assente','La fonte non è più presente.');
  const s=sessione(p,f.sessione_id);
  const ultima=fontiPesca(p).filter(x=>x.sessione_id===s.id).length===1;
  annullaEventiPesca(p,{fonte:id,...(ultima?{sessione:s.id}:{})});
  prepared('DELETE FROM utente.pesca_provenienza WHERE partita_id=? AND id=?').run(p,id);
  if(!fontiPesca(p).some(x=>x.sessione_id===s.id)&&s.turno_uid&&!s.turno_revocato_il){
    if(s.origine_turno==='creato')togliTurno(p,ATTIVITA_PESCA,s.turno_ordine,{pescaAutorizzata:true});
    else if(s.origine_turno==='quota-storica')prepared('DELETE FROM utente.turno_partita WHERE partita_id=? AND uid=?').run(p,s.turno_uid);
    if(s.origine_turno!=='raccordato')prepared('UPDATE utente.pesca_sessione SET turno_revocato_il=? WHERE partita_id=? AND id=?').run(nowIso(),p,s.id);
  }
  riconciliaBeneficiPesca(p,s.id);return s.id;
}
export function confermaPesca(p:number,azione:AzioneOperazionePesca,input:ConfermaPesca,bersaglio:string|null=null,contesto?:ContestoDiarioPesca):RicevutaOperazionePescaDto {
  return getDb().transaction(()=>{
    verificaPartita(p);const {revisionePescaAttesa,...r}=input;richiestaValida(azione,r);
    if(azione==='registra-sessione'&&(r as NuovaSessionePesca).fonte.tipo==='diario'&&!contesto)throw httpErrors.conflict('pesca-fonte-riservata','La provenienza Diario può essere scritta soltanto dal motore della spunta.');
    if(azione==='registra-sessione'&&(r as NuovaSessionePesca).fonte.tipo==='diario'){
      const f=(r as NuovaSessionePesca).fonte;
      if(!contesto||f.tipo!=='diario'||contesto.voceUid!==f.voceUid||contesto.effettoUid!==f.effettoUid||!/^[0-9a-f]{32}$/.test(contesto.generazione))throw httpErrors.conflict('pesca-generazione-diversa','Il contesto interno non coincide con la fonte della sessione.');
      const spunta=prepared('SELECT 1 FROM utente.spunta_voce_partita WHERE partita_id=? AND voce_uid=?').get(p,f.voceUid);
      if(contesto.nuovaSpunta?!!spunta:!spunta)throw httpErrors.conflict('pesca-generazione-diversa','Lo stato della spunta non corrisponde al gesto interno autorizzato.');
    }
    const payload=canonicoPesca({azione,richiesta:r,bersaglio});
    const precedente=prepared('SELECT payload_json FROM utente.pesca_operazione WHERE partita_id=? AND operazione_id=?').get(p,r.operazioneId) as {payload_json:string}|undefined;
    if(precedente){if(precedente.payload_json!==payload)throw httpErrors.conflict('pesca-operazione-diversa','Questo ID appartiene a un gesto diverso.');return leggiOperazionePesca(p,r.operazioneId);}
    const a=prepara(p,azione,r,bersaglio);if(a.revisionePescaAttesa!==revisionePescaAttesa)throw httpErrors.conflict('pesca-cambiata','La fotografia è cambiata: rileggi l’anteprima senza cambiare l’identità del gesto incerto.');
    const result:Omit<RicevutaOperazionePescaDto,'operazioneId'|'partitaId'|'azione'|'richiesta'|'bersaglio'|'creataIl'>={sessioneId:null,provenienzaId:null,osservazioneId:null,acquistoEscaId:null,fattoFonteId:null,esito:'fonte-rimossa'};
    if(azione==='registra-sessione')Object.assign(result,registraSessione(p,r as NuovaSessionePesca,contesto));
    else if(azione==='salva-osservazione'){const s=sessione(p,bersaglio!);result.sessioneId=s.id;result.osservazioneId=nuovaOsservazione(s,(r as {osservazione:OsservazionePesca}).osservazione);result.esito='osservazione-salvata';riconciliaBeneficiPesca(p,s.id);}
    else if(azione==='rimuovi-fonte'){result.provenienzaId=bersaglio;result.sessioneId=rimuoviFontePescaNellaTransazione(p,bersaglio!);}
    else if(azione==='rimuovi-sessione'){const s=sessione(p,bersaglio!);for(const f of fontiPesca(p).filter(f=>f.sessione_id===s.id))rimuoviFontePescaNellaTransazione(p,f.id);prepared('DELETE FROM utente.pesca_sessione WHERE partita_id=? AND id=?').run(p,s.id);riconciliaBeneficiPesca(p,s.id);result.sessioneId=s.id;result.esito='sessione-rimossa';}
    else if(azione==='registra-fatto'){
      const f=r as Extract<InputOperazionePesca,{valore:unknown}>,id=uidPesca();prepared('INSERT INTO utente.pesca_fatto_fonte(id,partita_id,evento_chiave,valore,momento_json,fonte_json,nota,operazione_id,creata_il) VALUES(?,?,?,?,?,?,?,?,?)').run(id,p,bersaglio!,f.valore,f.momento?canonicoPesca(f.momento):null,canonicoPesca({tipo:'manuale'}),f.nota,f.operazioneId,nowIso());result.fattoFonteId=id;result.esito='fatto-registrato';
    }else if(azione==='rimuovi-fatto'){annullaEventiPesca(p,{fatto:bersaglio!});prepared('DELETE FROM utente.pesca_fatto_fonte WHERE partita_id=? AND id=? AND sessione_id IS NULL').run(p,bersaglio!);result.fattoFonteId=bersaglio;result.esito='fatto-rimosso';}
    else if(azione==='acquista-esca'){
      const e=r as Extract<InputOperazionePesca,{quantita:unknown}>,id=uidPesca(),costo=e.quantita*a.stato.regola.dati!.costoEscaPunti;if(!Number.isSafeInteger(costo))throw httpErrors.conflict('pesca-costo-fuori-limiti','Il costo non è rappresentabile esattamente.');
      prepared('INSERT INTO utente.pesca_acquisto_esca(id,partita_id,momento_json,quantita,costo_punti,attivo,identita_json,creato_il) VALUES(?,?,?,?,?,1,?,?)').run(id,p,canonicoPesca(e.momento),e.quantita,costo,canonicoPesca({regola:a.stato.regola.dati,unita:'punti-pesca'}),nowIso());riconciliaBeneficiPesca(p,id);result.acquistoEscaId=id;result.esito='esca-acquistata';
    }else if(azione==='rimuovi-acquisto-esca'){annullaEventiPesca(p,{esca:bersaglio!});prepared('DELETE FROM utente.pesca_acquisto_esca WHERE partita_id=? AND id=?').run(p,bersaglio!);riconciliaBeneficiPesca(p,bersaglio!);result.acquistoEscaId=bersaglio;result.esito='acquisto-esca-rimosso';}
    else {
      const saldo=(r as Extract<InputOperazionePesca,{saldoOsservato:unknown}>).saldoOsservato,prima=a.stato.saldoPunti;
      prepared('INSERT INTO utente.punti_pesca_partita(partita_id,saldo,updated_at) VALUES(?,?,?) ON CONFLICT(partita_id) DO UPDATE SET saldo=excluded.saldo,updated_at=excluded.updated_at').run(p,saldo,nowIso());
      prepared("INSERT INTO utente.movimento_punti_pesca(id,partita_id,operazione_id,tipo,prima,delta,dopo,creato_il) VALUES(?,?,?,'rettifica',?,?,?,?)").run(uidPesca(),p,r.operazioneId,prima,prima===null?null:saldo-prima,saldo,nowIso());result.esito='punti-rettificati';
    }
    const receipt:RicevutaOperazionePescaDto={operazioneId:r.operazioneId,partitaId:p,azione,richiesta:r,bersaglio,...result,creataIl:nowIso()};
    prepared('INSERT INTO utente.pesca_operazione(partita_id,operazione_id,azione,payload_json,ricevuta_json,creata_il) VALUES(?,?,?,?,?,?)').run(p,r.operazioneId,azione,payload,canonicoPesca(receipt),receipt.creataIl);
    registraEventoPesca(receipt);
    prepared('UPDATE utente.partita SET updated_at=? WHERE id=?').run(receipt.creataIl,p);return receipt;
  }).immediate();
}
export const registraSessionePesca=(p:number,r:RichiestaRegistraSessionePesca):RicevutaOperazionePescaDto=>confermaPesca(p,'registra-sessione',r);
export function applicaDeltaPuntiPesca(p:number,delta:number):void {
  if(!getDb().inTransaction)throw new Error('Il delta punti pesca richiede la decisione transazionale.');
  const r=prepared('SELECT saldo FROM utente.punti_pesca_partita WHERE partita_id=?').get(p) as {saldo:number|null}|undefined;
  if(r?.saldo==null||!Number.isSafeInteger(delta)||r.saldo+delta<0||r.saldo+delta>999_999_999)throw httpErrors.conflict('pesca-saldo-non-applicabile','Saldo ignoto o delta fuori limiti: nessuna saturazione.');
  prepared('UPDATE utente.punti_pesca_partita SET saldo=?,updated_at=? WHERE partita_id=?').run(r.saldo+delta,nowIso(),p);
}
