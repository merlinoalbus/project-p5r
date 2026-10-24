import { ATTIVITA_PESCA, EVENTI_PESCA, nomeEventoPesca, type AcquistoEscaPescaDto, type BeneficioPescaDto, type EventoPesca, type FattoPescaDto, type FonteFattoPescaDto, type IntervalloBeneficioPesca, type MomentoPesca, type OsservazionePescaDto, type SessionePescaDto, type StatoPescaDto, type ValoreFattoPesca } from '../../shared/pesca.js';
import { ordineGioco } from '../../shared/condizioniSpillo.js';
import { moltiplicaFortuna } from '../../shared/fortuna.js';
import { profiliPesca } from './profiliPescaService.js';
import { prepared } from '../db/dbService.js';
import { schemaDefinizioneRegolaPesca, schemaMomentoPesca, schemaOsservazionePesca } from '../schemas/pesca.js';
import { httpErrors } from '../utils/httpError.js';
import { verificaPartita } from './verificaPartita.js';
import { leggiRegolaPesca, rigaRegolaPesca } from './regolePescaService.js';
import { canonicoPesca, firmaPesca, jsonPesca } from './registroPesca.js';
import { leggiAllocazioniTurniPesca } from './allocazioniTurniPesca.js';

export interface RigaSessionePesca {id:string;partita_id:number;attivita_chiave:string;giorno:string;fascia:'giorno'|'sera';ordine_visita:number;turno_uid:string|null;turno_ordine:number;origine_turno:'creato'|'raccordato'|'quota-storica';turno_revocato_il:string|null;identita_json:string;creata_il:string}
export interface RigaOsservazionePesca {id:string;sessione_id:string;versione:number;corrente:number;dati_json:string;precedente_id:string|null;creata_il:string}
export interface RigaFontePesca {id:string;partita_id:number;sessione_id:string;tipo:'manuale'|'diario';voce_uid:string|null;effetto_uid:string|null;generazione:string|null;operazione_id:string;fonte_json:string;creata_il:string}
export interface RigaFattoPesca {id:string;partita_id:number;evento_chiave:EventoPesca;valore:ValoreFattoPesca;momento_json:string|null;sessione_id:string|null;cattura_id:string|null;provenienza_id:string|null;fonte_json:string;nota:string;operazione_id:string;creata_il:string}
export const sessioniPesca=(p:number):RigaSessionePesca[]=>prepared('SELECT * FROM utente.pesca_sessione WHERE partita_id=? ORDER BY id').all(p) as RigaSessionePesca[];
export const fontiPesca=(p:number):RigaFontePesca[]=>prepared('SELECT * FROM utente.pesca_provenienza WHERE partita_id=? ORDER BY id').all(p) as RigaFontePesca[];
export const fattiPesca=(p:number):RigaFattoPesca[]=>prepared('SELECT * FROM utente.pesca_fatto_fonte WHERE partita_id=? ORDER BY id').all(p) as RigaFattoPesca[];
export const momentoSessione=(s:RigaSessionePesca):MomentoPesca=>({giorno:s.giorno,fascia:s.fascia,ordineVisita:s.ordine_visita});
export function confrontaMomentiPesca(a:MomentoPesca,b:MomentoPesca):number {return ordineGioco(a.giorno)-ordineGioco(b.giorno)||(a.fascia==='sera'?1:0)-(b.fascia==='sera'?1:0)||a.ordineVisita-b.ordineVisita;}
function momentoFatto(f:RigaFattoPesca):MomentoPesca|null {
  if(f.momento_json===null)return null;
  const parsed=schemaMomentoPesca.safeParse(jsonPesca(f.momento_json,'momento del fatto'));
  if(!parsed.success)throw httpErrors.conflict('pesca-fatto-illeggibile','Il momento di una fonte della pesca non è riconoscibile.');
  return parsed.data;
}
/** Una fonte positiva datata attesta il fatto da quel momento; una negativa attesta il limite osservato.
 * Le fonti non datate sono note ora, ma non ricostruiscono una sessione o un'anteprima storica. */
export function valoreFattoPesca(p:number,evento:EventoPesca,al?:MomentoPesca,strettamentePrima=false,notoOra=false):ValoreFattoPesca {
  const fs=fattiPesca(p).filter(f=>f.evento_chiave===evento);
  const positivi=fs.filter(f=>{
    if(f.valore!=='avvenuto')return false;
    if(!al)return true;
    const momento=momentoFatto(f);
    if(momento===null)return notoOra;
    return strettamentePrima?confrontaMomentiPesca(momento,al)<0:confrontaMomentiPesca(momento,al)<=0;
  });
  if(positivi.length)return 'avvenuto';
  const negativi=fs.filter(f=>{
    if(f.valore!=='non-avvenuto')return false;
    if(!al)return true;
    const momento=momentoFatto(f);
    return momento===null?notoOra:confrontaMomentiPesca(momento,al)>=0;
  });
  return negativi.length?'non-avvenuto':'ignoto';
}
export function leggiFattiPesca(p:number,al?:MomentoPesca,notoOra=false):FattoPescaDto[] {
  verificaPartita(p);
  return EVENTI_PESCA.map(evento=>({evento,nome:nomeEventoPesca(evento),valore:valoreFattoPesca(p,evento,al,false,notoOra),fonti:fattiPesca(p).filter(f=>f.evento_chiave===evento).map((f):FonteFattoPescaDto=>({id:f.id,evento,valore:f.valore,momento:momentoFatto(f),sessioneId:f.sessione_id,catturaId:f.cattura_id,provenienzaId:f.provenienza_id,nota:f.nota,creataIl:f.creata_il})),avvisi:[]}));
}
export function osservazioneDto(r:RigaOsservazionePesca):OsservazionePescaDto {
  const d=schemaOsservazionePesca.safeParse(jsonPesca(r.dati_json,'osservazione della pesca'));
  if(!d.success)throw httpErrors.conflict('pesca-osservazione-illeggibile','L’osservazione non è riconoscibile; nessun campo viene eliminato o completato.');
  return {id:r.id,versione:r.versione,precedenteId:r.precedente_id,dati:d.data,creataIl:r.creata_il};
}
export function osservazioneCorrente(s:string):RigaOsservazionePesca {
  const rs=prepared('SELECT * FROM utente.pesca_osservazione WHERE sessione_id=? AND corrente=1').all(s) as RigaOsservazionePesca[];
  if(rs.length!==1)throw httpErrors.conflict('pesca-osservazione-incoerente','La sessione non ha una sola osservazione corrente.');
  return rs[0]!;
}
function identitaSessione(s:RigaSessionePesca):{nome:string;regola:import('../../shared/pesca.js').DefinizioneRegolaPesca} {
  const raw=jsonPesca(s.identita_json,'identità della sessione');
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw httpErrors.conflict('pesca-identita-illeggibile','La fotografia dell’identità della sessione è conservata ma non riconoscibile.');
  const d=raw as Record<string,unknown>,regola=schemaDefinizioneRegolaPesca.safeParse(d.regola);
  if(typeof d.nome!=='string'||d.attivita!==s.attivita_chiave||!regola.success)throw httpErrors.conflict('pesca-identita-illeggibile','Identità o regola fotografata della sessione incomplete; nessun dato corrente le sostituisce.');
  if(!schemaMomentoPesca.safeParse(momentoSessione(s)).success)throw httpErrors.conflict('pesca-momento-illeggibile','Momento della sessione non riconoscibile.');
  return {nome:d.nome,regola:regola.data};
}
export interface TargetBeneficioPesca {tipo:'dote'|'yen'|'punti-pesca';chiave:string;delta:number;intervallo:IntervalloBeneficioPesca;attiva:boolean;storica:boolean;motivo:string}
interface RigaAcquistoEsca {id:string;momento_json:string;quantita:number;costo_punti:number;attivo:number;identita_json:string;creato_il:string}
/** La medesima prova vale nel registro e nel calcolo diretto delle proposte. */
function momentoAcquistoEscaValido(a:RigaAcquistoEsca):MomentoPesca {
  const momento=schemaMomentoPesca.safeParse(jsonPesca(a.momento_json,'acquisto esca'));
  const raw=jsonPesca(a.identita_json,'identità dell’esca');
  const identita=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:null;
  const regola=identita&&schemaDefinizioneRegolaPesca.safeParse(identita.regola);
  if(!momento.success||!regola?.success||identita?.unita!=='punti-pesca'||Object.keys(identita).length!==2
    ||!Number.isSafeInteger(a.quantita)||a.quantita<1||!Number.isSafeInteger(a.costo_punti)||a.costo_punti<0
    ||a.costo_punti!==a.quantita*regola.data.costoEscaPunti)throw httpErrors.conflict('pesca-esca-incoerente','Momento, quantità, costo o fonte fotografata dell’acquisto non sono coerenti.');
  return momento.data;
}
/** Legge soltanto: la materializzazione delle proposte appartiene ai writer. */
export function targetBeneficiPesca(p:number,causa:string):TargetBeneficioPesca[] {
  const s=sessioniPesca(p).find(x=>x.id===causa);
  if(s){
    const o=osservazioneDto(osservazioneCorrente(s.id)).dati;
    // Il prezzo/base applicabile è fotografato nel gesto, mai sostituito da una modifica futura della guida.
    const dati=identitaSessione(s).regola;
    const attiva=fontiPesca(p).some(f=>f.sessione_id===s.id);
    // il ×1,5 della Fortuna è il lettore unico (`moltiplicaFortuna`): `bonusFortuna` della regola resta nel dato ma non si legge più
    const base=dati.beneficioPerizia.puntiBase,max=moltiplicaFortuna(base);
    const perizia:IntervalloBeneficioPesca=o.perizia.esito==='non-ricevuta'?{minimo:0,massimo:0}:o.perizia.esito==='ignota'?{minimo:0,massimo:max}:{minimo:o.fortuna.attiva===true?max:base,massimo:o.fortuna.attiva===false?base:max};
    // BON-12: la quota della visita non è più una proposta di yen: gli yen si cambiano a mano, qui resta solo il promemoria nel motivo
    const quota=dati.quote[s.fascia];
    return [{tipo:'dote',chiave:'perizia',delta:perizia.minimo,intervallo:perizia,attiva,storica:true,motivo:`Perizia finale osservata, distinta dalla cattura. L’intervallo conserva il bonus Fortuna ignoto. Promemoria: la quota della visita (${quota.toLocaleString('it-IT')} yen) non si applica da qui, cambia tu gli yen.`}];
  }
  const a=prepared('SELECT * FROM utente.pesca_acquisto_esca WHERE partita_id=? AND id=?').get(p,causa) as RigaAcquistoEsca|undefined;
  if(a)momentoAcquistoEscaValido(a);
  return a?[{tipo:'punti-pesca',chiave:'',delta:-a.costo_punti,intervallo:{minimo:-a.costo_punti,massimo:-a.costo_punti},attiva:a.attivo===1,storica:true,motivo:'Acquisto osservato dell’esca speciale, in punti pesca; il possesso non prova il pagamento.'}]:[];
}
export function fotografiaPesca(p:number):Record<string,unknown> {
  const tabelle=['pesca_sessione','pesca_provenienza','pesca_fatto_fonte','pesca_acquisto_esca','pesca_operazione','pesca_quota_storica','punti_pesca_partita','movimento_punti_pesca','da_applicare','beneficio_ciclo','proposta_operazione','effetto_applicato','movimento_yen','turno_partita','attivita_svolta_partita','effetto_lettura_partita','spunta_voce_partita','dote_sociale_partita'];
  const effetti=prepared("SELECT * FROM main.voce_effetto WHERE tipo='pesca' ORDER BY voce_uid,ordine,uid").all() as Array<{voce_uid:string}>;
  const voci=[...new Set([...effetti.map(e=>e.voce_uid),...fontiPesca(p).flatMap(f=>f.voce_uid?[f.voce_uid]:[])])].sort().map(uid=>({uid,riga:prepared('SELECT * FROM main.voce_giornata WHERE uid=?').get(uid)??null}));
  const dotiGuida=prepared('SELECT * FROM main.dote_sociale ORDER BY chiave').all();
  return {partita:prepared('SELECT * FROM utente.partita WHERE id=?').get(p),regola:rigaRegolaPesca(),dotiGuida,attivita:prepared('SELECT * FROM main.attivita WHERE chiave IN (?,?) ORDER BY chiave').all(ATTIVITA_PESCA,'sfida-pesca-guardiano-ichigaya'),tabelle:Object.fromEntries(tabelle.map(t=>[t,prepared(`SELECT * FROM utente.${t} WHERE partita_id=? ORDER BY rowid`).all(p)])),osservazioni:prepared('SELECT o.* FROM utente.pesca_osservazione o JOIN utente.pesca_sessione s ON s.id=o.sessione_id WHERE s.partita_id=? ORDER BY o.id').all(p),catture:prepared('SELECT c.* FROM utente.pesca_cattura c JOIN utente.pesca_sessione s ON s.id=c.sessione_id WHERE s.partita_id=? ORDER BY c.id').all(p),effetti,voci,cestino:prepared("SELECT * FROM utente.cestino_partite WHERE partita_id=? ORDER BY uid").all(p)};
}
export function leggiPescaPartita(p:number,benefici:(causa:string)=>BeneficioPescaDto[]=()=>[]):StatoPescaDto {
  verificaPartita(p);
  const raccordiDurevoli=leggiAllocazioniTurniPesca(p);
  const regola=leggiRegolaPesca(),fonti=fontiPesca(p);
  const sessioni=sessioniPesca(p).map((s):SessionePescaDto=>{
    const revisioni=(prepared('SELECT * FROM utente.pesca_osservazione WHERE sessione_id=? ORDER BY versione').all(s.id) as RigaOsservazionePesca[]).map(osservazioneDto),osservazione=osservazioneDto(osservazioneCorrente(s.id));
    const fs=fonti.filter(f=>f.sessione_id===s.id).map(f=>{
      const d=jsonPesca(f.fonte_json,'fonte della pesca');
      const attesa=f.tipo==='manuale'?{tipo:'manuale'}:{tipo:'diario',voceUid:f.voce_uid,effettoUid:f.effetto_uid};
      if(canonicoPesca(d)!==canonicoPesca(attesa))throw httpErrors.conflict('pesca-fonte-incoerente','La fonte della sessione diverge dalla propria identità.');
      return {id:f.id,fonte:attesa as SessionePescaDto['fonti'][number]['fonte'],generazione:f.generazione,creataIl:f.creata_il,orfana:f.tipo==='diario'&&!prepared('SELECT 1 FROM main.voce_effetto WHERE voce_uid=? AND uid=?').get(f.voce_uid,f.effetto_uid)};
    });
    const quota=s.origine_turno==='quota-storica'?prepared('SELECT * FROM utente.pesca_quota_storica WHERE partita_id=? AND sessione_id=?').get(p,s.id):null;
    const turno=prepared('SELECT * FROM utente.turno_partita WHERE partita_id=? AND uid=?').get(p,s.turno_uid);
    const firma=s.turno_revocato_il||!turno?null:s.origine_turno==='quota-storica'?quota?firmaPesca(quota):null:firmaPesca(turno);
    const guardian=valoreFattoPesca(p,'guardiano-ichigaya-catturato',momentoSessione(s),true);
    const identita=identitaSessione(s);
    if(revisioni.some((r,i)=>r.versione!==i+1||r.precedenteId!==(i?revisioni[i-1]!.id:null))||revisioni.at(-1)?.id!==osservazione.id)throw httpErrors.conflict('pesca-revisioni-incoerenti','La sequenza delle osservazioni non è integra; nessuna revisione viene riscritta.');
    const punto= puntoOsservazionePesca(osservazione.dati);
    const prima=guardian==='ignoto'?null:guardian==='avvenuto';
    return {id:s.id,partitaId:p,momento:momentoSessione(s),attivita:s.attivita_chiave,nome:typeof identita.nome==='string'?identita.nome:'Visita di pesca registrata',turno:{uid:s.turno_uid,ordine:s.turno_ordine,origine:s.origine_turno,revocato:!!s.turno_revocato_il||!turno,firma},attiva:fs.length>0,orfana:!prepared('SELECT 1 FROM main.attivita WHERE chiave=?').get(s.attivita_chiave),fonti:fs,osservazione,revisioni,punto,profiliPianificazione:profiliPesca(p,regola.dati,momentoSessione(s),osservazione.dati,prima),profili:profiliPesca(p,regola.dati,momentoSessione(s),osservazione.dati,prima,punto),benefici:benefici(s.id),avvisi:firma?[]:['Il turno della visita non è più presente o è stato revocato; non viene ricreato.']};
  }).sort((a,b)=>confrontaMomentiPesca(a.momento,b.momento)||a.id.localeCompare(b.id));
  const volte=(prepared('SELECT volte FROM utente.attivita_svolta_partita WHERE partita_id=? AND attivita_chiave=?').get(p,ATTIVITA_PESCA) as {volte:number}|undefined)?.volte??0;
  const turni=prepared('SELECT * FROM utente.turno_partita WHERE partita_id=? AND attivita_chiave IN (?,?) ORDER BY attivita_chiave,ordine').all(p,ATTIVITA_PESCA,'sfida-pesca-guardiano-ichigaya') as Array<{uid:string|null;attivita_chiave:string;ordine:number;created_at:string}>;
  const allocazioni=prepared('SELECT * FROM utente.pesca_quota_storica WHERE partita_id=? ORDER BY firma_contatore,quota').all(p) as Array<{turno_uid:string}>;
  const quoteRitirate=allocazioni.filter(a=>!turni.some(t=>t.uid===a.turno_uid)).length;
  const contatore={attivita:ATTIVITA_PESCA,volte,turni:turni.map(t=>({uid:t.uid,attivita:t.attivita_chiave,ordine:t.ordine,creatoIl:t.created_at,firma:firmaPesca(t),raccordatoASessione:sessioni.find(s=>s.turno.uid&&s.turno.uid===t.uid)?.id??raccordiDurevoli.find(a=>a.turnoUid===t.uid)?.sessioneId??null})),quoteNonRappresentate:Math.max(0,volte-turni.filter(t=>t.attivita_chiave===ATTIVITA_PESCA).length-quoteRitirate),firma:firmaPesca({volte,turni,allocazioni,raccordiDurevoli})};
  const acquistiEsca=(prepared('SELECT * FROM utente.pesca_acquisto_esca WHERE partita_id=? ORDER BY id').all(p) as RigaAcquistoEsca[]).map((a):AcquistoEscaPescaDto=>{
    return {id:a.id,momento:momentoAcquistoEscaValido(a),quantita:a.quantita,costo:a.costo_punti,unita:'punti-pesca',attivo:a.attivo===1,benefici:benefici(a.id),creatoIl:a.creato_il};
  });
  return {partitaId:p,regola,sessioni,fatti:leggiFattiPesca(p),acquistiEsca,saldoPunti:(prepared('SELECT saldo FROM utente.punti_pesca_partita WHERE partita_id=?').get(p) as {saldo:number|null}|undefined)?.saldo??null,contatore,avvisi:regola.motivi,revisionePesca:firmaPesca(fotografiaPesca(p))};
}
export function puntoOsservazionePesca(o:import('../../shared/pesca.js').OsservazionePesca):import('../../shared/pesca.js').PuntoValutazionePesca {
  return o.tentativiConsumati===null?{tipo:'pianificazione'}:{tipo:'prossimo-tentativo',consumati:o.tentativiConsumati,posizione:null};
}
